// ======================================================================
// API ROUTES
// ======================================================================

const express = require('express');
const PDFDocument = require('pdfkit');
const { fetchCookiesWithPuppeteer } = require('./puppeteer');
const { scoreCookieWithSpec } = require('./scoring');
const { getGeneralCookieSecurityInfo, aiExplainReport } = require('./openrouter');
const { 
    redisFlushAll, 
    getCachedDomainCookies, 
    cacheDomainCookies,
    inMemorySpecCache,
    REDIS_CACHE_TTL_SPEC,
    REDIS_CACHE_TTL_SUMMARY
} = require('./redis');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';

const router = express.Router();
const path = require('path');

//dasboard route
router.get("/dashboard", (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/templates/dashboard.html'));
});


// POST /api/scan - Main cookie scanning endpoint
router.post('/api/scan', async (req, res) => {
    const { url } = req.body;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return res.status(400).json({
            error: 'URL must start with http:// or https://'
        });
    }

    console.log(`\n🔍 Scanning: ${url}`);
    const domain = new URL(url).hostname;
    console.log(`📌 Domain: ${domain}`);
    
    // Check if we have cached cookies for this domain
    let cookies = await getCachedDomainCookies(domain);
    let fromCache = false;
    
    if (cookies) {
        console.log(`\n📦 DATA SOURCE: Redis Cache`);
        console.log(`⚡ Skip Puppeteer: Using cached attributes from Redis`);
        fromCache = true;
    } else {
        console.log(`\n📦 DATA SOURCE: Puppeteer (Fresh Scan)`);
        console.log(`🌐 Running Puppeteer for ${domain}...`);
        cookies = await fetchCookiesWithPuppeteer(url);

        if (cookies.error) {
            return res.status(500).json(cookies);
        }
        
        // Cache the cookies for future scans of this domain
        console.log(`💾 Caching ${cookies.length} cookies to Redis for ${domain}...`);
        await cacheDomainCookies(domain, cookies);
        console.log(`✅ Cookies cached successfully (30 days TTL)`);
    }

    console.log(`📊 Found ${cookies.length} cookies`);

    // Score cookies using local logic
    const scoredCookies = cookies.map(cookie => {
        return scoreCookieWithSpec(cookie, null);
    });

    const averageScore =
        scoredCookies.length === 0
            ? 0
            : Math.round(
                (scoredCookies.reduce((sum, c) => sum + c.security_score, 0) /
                    scoredCookies.length) *
                10
            ) / 10;

    console.log(`📈 Average security score: ${averageScore}/10`);

    // Always generate fresh summary (not cached)
    console.log(`\n📝 Generating fresh AI summary from OpenRouter...`);
    const aiSummary = await aiExplainReport(scoredCookies, averageScore);
    console.log(`✅ AI summary generated`);

    return res.json({
        success: true,
        average_score: averageScore,
        cookies: scoredCookies,
        ai_summary: aiSummary,
        cache_status: {
            cookies: fromCache ? '✅ From Redis Cache' : '🆕 Fresh Puppeteer Scan',
            summary: '📝 Fresh from API (not cached)'
        }
    });
});

// POST /api/download - Generate PDF report
router.post('/api/download', (req, res) => {
    const { url, score, aiSummary, cookies } = req.body;

    const doc = new PDFDocument();
    const filename = `cookie_security_report_${Date.now()}.pdf`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text('Cookie Security Report', {
        underline: true
    });
    doc.moveDown();

    // URL and Score
    doc.fontSize(12)
        .font('Helvetica-Bold')
        .text(`URL: ${url}`, { underline: false });
    doc.font('Helvetica-Bold').text(`Score: ${score}/10`);
    doc.moveDown();

    // AI Summary
    doc.fontSize(14).font('Helvetica-Bold').text('AI Security Summary');
    doc.fontSize(10)
        .font('Helvetica')
        .text(aiSummary);
    doc.moveDown();

    // Cookies
    doc.fontSize(14).font('Helvetica-Bold').text('Cookies');
    doc.moveDown();

    cookies.forEach(c => {
        doc.fontSize(11).font('Helvetica-Bold').text(c.name);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Domain: ${c.domain}`);
        doc.text(`Category: ${c.category}`);
        doc.text(`HttpOnly: ${c.HttpOnly}`);
        doc.text(`Secure: ${c.Secure}`);
        doc.text(`SameSite: ${c.SameSite}`);
        doc.text(`Description: ${c.description}`);
        doc.moveDown();
    });

    doc.end();
});

// GET /api/test-openrouter - Test OpenRouter API
router.get('/api/test-openrouter', async (req, res) => {
    console.log('\n🧪 Testing OpenRouter API...');
    
    if (!OPENROUTER_API_KEY) {
        return res.status(400).json({ error: 'OPENROUTER_API_KEY not set in .env' });
    }

    console.log(`✓ API Key found: ${OPENROUTER_API_KEY.substring(0, 20)}...`);

    try {
        const axios = require('axios');
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "anthropic/claude-sonnet-4.6",
            messages: [
                {
                    role: "user",
                    content: "Say 'OpenRouter API is working!' in one sentence."
                }
            ],
            reasoning: {
                enabled: true
            }
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ OpenRouter API is working!');
        return res.json({ 
            status: 'success',
            message: 'OpenRouter API is working correctly',
            response: response.data.choices[0].message.content
        });
    } catch (error) {
        console.log('❌ OpenRouter API failed:', error.message);
        return res.json({ 
            status: 'failed',
            message: 'OpenRouter API call failed - check logs above',
            error: error.message
        });
    }
});

// GET /api/cache-stats - Cache statistics
router.get('/api/cache-stats', async (req, res) => {
    const inMemorySize = inMemorySpecCache.size;
    const cacheStatus = UPSTASH_REDIS_REST_URL ? '✅ Redis (Upstash)' : '⚠️ In-Memory only';
    
    return res.json({
        message: 'Cache Statistics',
        cache_system: cacheStatus,
        in_memory_cache: {
            entries: inMemorySize,
            memory_size: `~${(inMemorySize * 2).toFixed(0)}KB (estimate)`,
            description: 'Fallback cache when Redis is unavailable'
        },
        redis_cache: {
            url: UPSTASH_REDIS_REST_URL ? '✅ Configured' : '❌ Not configured',
            ttl_spec: `${REDIS_CACHE_TTL_SPEC / (24 * 60 * 60)} days`,
            ttl_summary: `${REDIS_CACHE_TTL_SUMMARY / (24 * 60 * 60)} days`,
            provider: 'Upstash'
        },
        recommendations: {
            if_no_redis: 'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env',
            if_vercel: 'Redis is recommended for Vercel/serverless deployments',
            if_vps: 'In-memory fallback works, but Redis improves multi-server scaling'
        }
    });
});

// POST /api/cache-clear - Clear all caches
router.post('/api/cache-clear', async (req, res) => {
    await redisFlushAll();
    console.log('🗑️ All caches cleared (Redis + in-memory)!');
    return res.json({ 
        message: 'Cache cleared successfully', 
        redis: '✓ Cleared',
        in_memory: '✓ Cleared'
    });
});

module.exports = router;
