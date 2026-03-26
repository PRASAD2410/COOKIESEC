// ======================================================================
// OPENROUTER API CALLS
// ======================================================================

const axios = require('axios');
const { redisGet, redisSet, REDIS_CACHE_TTL_SUMMARY } = require('./redis');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

async function getGeneralCookieSecurityInfo(domain) {
    if (!OPENROUTER_API_KEY) {
        console.warn('No OPENROUTER_API_KEY set');
        return null;
    }

    const url = `https://openrouter.ai/api/v1/chat/completions`;

    const prompt = `You are a web security expert. I'm analyzing cookies for domain: ${domain}

Provide general information about cookie security attributes in JSON format:
{
  "httpOnly_importance": "Why HttpOnly is important and when it should be enabled",
  "secure_importance": "Why Secure flag is important and when it should be enabled",
  "sameSite_importance": "Why SameSite is important and different values (Strict/Lax/None)",
  "common_legitimate_cookies": ["List of common cookie names that are typically legitimate"],
  "red_flags": ["Cookie patterns or combinations that indicate security issues"],
  "general_recommendation": "General security best practices for cookies"
}

Return ONLY valid JSON, no other text.`;

    const payload = {
        model: "anthropic/claude-sonnet-4.6",
        messages: [
            {
                role: "user",
                content: prompt
            }
        ],
        reasoning: {
            enabled: true
        }
    };

    try {
        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const text = response.data.choices[0].message.content;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const info = JSON.parse(jsonMatch[0]);
            console.log(`\n✅ Retrieved general cookie security info from OpenRouter`);
            return info;
        }
        return null;
    } catch (error) {
        console.error(`⚠️ Error getting cookie security info:`, error.message);
        return null;
    }
}

function getAISummaryKey(cookies, averageScore) {
    // Create a cache key based on cookie names + score
    const cookieNames = cookies.map(c => `${c.name}:${c.security_score}`).sort().join('|');
    return `summary:${cookieNames}:${averageScore}`;
}

async function aiExplainReport(cookies, averageScore) {
    if (!OPENROUTER_API_KEY) {
        return 'AI explanation unavailable (no API key configured).';
    }

    // Check cache first
    const cacheKey = getAISummaryKey(cookies, averageScore);
    
    try {
        const cached = await redisGet(cacheKey);
        if (cached) {
            console.log(`⚡ AI summary: Using cached response from Redis`);
            return cached;
        }
    } catch (error) {
        console.warn('Cache lookup error, proceeding with API call');
    }

    const url = `https://openrouter.ai/api/v1/chat/completions`;

    const safeList = cookies.map(c => ({
        name: c.name,
        category: c.category,
        score: c.security_score,
        HttpOnly: c.HttpOnly,
        Secure: c.Secure,
        SameSite: c.SameSite
    }));

    const prompt = `
STRICT OUTPUT RULES:
- Each bullet MUST be on its own line.
- Format: • cookie_name → short explanation.
- Max 20 words per bullet.
- No paragraphs. No merging lines.

TASK:
Explain each cookie: purpose, risks, missing flags.

Average score: ${averageScore}
Cookies: ${JSON.stringify(safeList)}
`;

    const payload = {
        model: "anthropic/claude-sonnet-4.6",
        messages: [
            {
                role: "user",
                content: prompt
            }
        ],
        reasoning: {
            enabled: true
        }
    };

    try {
        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const summary = response.data.choices[0].message.content;
        
        // Cache the response in Redis
        await redisSet(cacheKey, summary, REDIS_CACHE_TTL_SUMMARY);
        console.log(`✓ AI summary cached in Redis (TTL: 7 days)`);
        
        return summary;
    } catch (error) {
        console.error('AI ERROR:', error.message);
        if (error.response?.status === 429) {
            return 'AI summary temporarily unavailable due to rate limiting. But your cookie scores are accurate!';
        }
        return 'AI explanation unavailable.';
    }
}

module.exports = {
    getGeneralCookieSecurityInfo,
    aiExplainReport,
    getAISummaryKey
};
