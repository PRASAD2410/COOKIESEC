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
  "httpOnly_importance": "Why HttpOnly is important and when it should be enabled , Describe it in short",
  "secure_importance": "Why Secure flag is important and when it should be enabled , Describe it in short",
  "sameSite_importance": "Why SameSite is important and different values (Strict/Lax/None) , Describe it in short",
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

    const safeList = cookies.map(c => {
        // Build missing flags info with requirement status
        const missingFlags = [];
        const justifications = [];
        
        if (!c.HttpOnly) {
            if (c.flagRequirements?.requireHttpOnly) {
                missingFlags.push('HttpOnly (REQUIRED)');
                justifications.push('HttpOnly needed: ' + c.flagRequirements.reasoning.httpOnly);
            } else {
                missingFlags.push('HttpOnly (not needed)');
                justifications.push('HttpOnly not needed: ' + c.flagRequirements.reasoning.httpOnly);
            }
        }
        
        if (!c.Secure) {
            if (c.flagRequirements?.requireSecure) {
                missingFlags.push('Secure (REQUIRED)');
                justifications.push('Secure needed: ' + c.flagRequirements.reasoning.secure);
            } else {
                missingFlags.push('Secure (not needed)');
                justifications.push('Secure not needed: ' + c.flagRequirements.reasoning.secure);
            }
        }
        
        if (!c.SameSite) {
            if (c.flagRequirements?.requireSameSite) {
                missingFlags.push('SameSite (REQUIRED)');
                justifications.push('SameSite needed: ' + c.flagRequirements.reasoning.sameSite);
            } else {
                missingFlags.push('SameSite (not needed)');
                justifications.push('SameSite not needed: ' + c.flagRequirements.reasoning.sameSite);
            }
        }

        return {
            name: c.name,
            category: c.category,
            score: c.security_score,
            HttpOnly: c.HttpOnly,
            Secure: c.Secure,
            SameSite: c.SameSite,
            missingFlags: missingFlags.length > 0 ? missingFlags : ['None'],
            justifications: justifications,
            isJustified: c.flagRequirements?.isJustified || false
        };
    });

    const prompt = `
OUTPUT FORMAT (CLEAN & CLEAR):
- NO title, NO header, NO domain names
- Use dashes (=========) to separate cookies
- Simple pipe format: cookie_name | category | flags | explanation
- NO blank lines, NO spacing tricks, just DASHES between cookies

FLAG RULES:
- REQUIRED + missing = "(SECURITY RISK) - explanation"
- NOT NEEDED = "(NOT NEEDED) - explanation"  
- INTENTIONAL = "(INTENTIONAL TRADE-OFF) - explanation"

EXACT FORMAT:
_ga | Analytics Cookie | Missing HttpOnly (NOT NEEDED), Secure (NOT NEEDED), SameSite (INTENTIONAL TRADE-OFF) | HttpOnly not required for persistent UUID. Secure not needed. SameSite omitted for cross-site tracking.
=========================================================

_gid | Analytics Cookie | Missing HttpOnly (NOT NEEDED), Secure (NOT NEEDED), SameSite (INTENTIONAL TRADE-OFF) | HttpOnly not required for daily UUID. Secure not needed. SameSite omitted for cross-site tracking.
=========================================================

__Secure-ROLLOUT_TOKEN | Security / Auth Cookie | Missing SameSite (SECURITY RISK) | Auth tokens require SameSite to prevent CSRF attacks. Immediate fix needed.
=========================================================

_ga_SGN3R8Y922 | Analytics Cookie | Missing HttpOnly (NOT NEEDED), Secure (NOT NEEDED), SameSite (INTENTIONAL TRADE-OFF) | HttpOnly not required for GA4 session. Secure not needed. SameSite omitted for tracking.
=========================================================

---
Average Score: ${averageScore}/10
Summary: [One-line professional analysis]

CRITICAL:
1. Start with first cookie (no header)
2. After EVERY cookie, add a line of equals signs (=========================================================)
3. Format stays: cookie_name | category | flags | explanation
4. NO blank lines between cookies, just the dashes
5. Ends with Average Score line
6. This makes PDF and UI clean and readable

Cookies to analyze:
${JSON.stringify(safeList, null, 2)}
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
        
        let summary = response.data.choices[0].message.content;
        
        // Clean up &nbsp; entities and excessive whitespace
        summary = summary.replace(/&nbsp;/g, ' ');
        summary = summary.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove triple+ line breaks
        summary = summary.trim();
        
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
