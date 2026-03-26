// ======================================================================
// COOKIE SCORING & CLASSIFICATION
// ======================================================================

function classifyCookie(cookie) {
    const name = (cookie.name || '').toLowerCase();

    if (['session', 'sess', 'sid'].some(x => name.includes(x))) {
        return ['Session Cookie', 'Used to maintain login sessions.'];
    }

    if (
        ['auth', 'csrf', 'token', '__secure', '__host'].some(x =>
            name.includes(x)
        )
    ) {
        return ['Security / Auth Cookie', 'Used for authentication & CSRF protection.'];
    }

    if (name.startsWith('cf_') || name.includes('__cf') || name.includes('cfuid')) {
        return ['Security Cookie (Cloudflare)', 'Cloudflare security cookie.'];
    }

    if (['_ga', '_gid', '_hj', 'utm_'].some(x => name.includes(x))) {
        return ['Analytics Cookie', 'Used for analytics and tracking.'];
    }

    if (['uuid', 'device', 'track'].some(x => name.includes(x))) {
        return ['Tracking / Identifier', 'Used to track devices or users.'];
    }

    return ['Miscellaneous / Unknown', 'Purpose unknown or website-specific.'];
}

function detectValuePattern(value) {
    if (!value) {
        return 'No recognizable pattern detected.';
    }

    const v = value.trim();

    // UUID pattern
    const uuidPattern =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (uuidPattern.test(v)) {
        return 'Value appears to be a UUID.';
    }

    // JWT pattern
    if (v.split('.').length === 3) {
        const [header, payload, signature] = v.split('.');
        if (header && payload && signature) {
            return 'Value appears to be a JWT token.';
        }
    }

    // Base64 pattern
    try {
        if (v.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(v)) {
            Buffer.from(v, 'base64').toString('utf-8');
            return 'Value appears Base64 encoded.';
        }
    } catch (e) {
        // Not base64
    }

    // Session token pattern
    if (/^[0-9a-fA-F]{16,}$/.test(v)) {
        return 'Value looks like a session token.';
    }

    // Numeric ID
    if (/^\d+$/.test(v)) {
        return 'Value is numeric ID.';
    }

    // URL-encoded
    if (v.includes('%')) {
        return 'Value contains URL-encoded parameters.';
    }

    // High-entropy token
    if (v.length > 40) {
        return 'High-entropy token.';
    }

    return 'No recognizable pattern detected.';
}

function scoreCookieWithSpec(cookie, spec) {
    const [category, description] = classifyCookie(cookie);
    cookie.category = category;
    cookie.description = description;
    cookie.value_pattern = detectValuePattern(cookie.value || '');

    let score = 10;

    const rawHttpOnly = cookie.httpOnly;
    const rawSecure = cookie.secure;
    const rawSameSite = (cookie.sameSite || '').toLowerCase();

    cookie.HttpOnly = !!rawHttpOnly;
    cookie.Secure = !!rawSecure;
    cookie.SameSite = !['', 'none'].includes(rawSameSite);

    if (spec) {
        // Compare with spec (if available)
        cookie.expectedHttpOnly = spec.expectedHttpOnly;
        cookie.expectedSecure = spec.expectedSecure;
        cookie.expectedSameSite = spec.expectedSameSite;
        cookie.specReason = spec.reason;
        cookie.isLegitimate = spec.isLegitimate;
        cookie.hasSpec = true;

        // Only penalize if ACTUAL differs from EXPECTED
        if (spec.expectedHttpOnly && !cookie.HttpOnly) score -= 2;
        if (spec.expectedSecure && !cookie.Secure) score -= 2;
        if (spec.expectedSameSite && !cookie.SameSite) score -= 2;
        
        console.log(`✓ ${cookie.name}: Using spec - score ${score}`);
    } else {
        // No spec available - use standard security practices
        if (!cookie.HttpOnly) score -= 2;
        if (!cookie.Secure) score -= 2;
        if (!cookie.SameSite) score -= 2;
        
        cookie.hasSpec = false;
        cookie.specReason = "Using standard security scoring";
        console.log(`✓ ${cookie.name}: Score ${score}`);
    }

    const sensitiveKeywords = ['password', 'token', 'auth', 'secret', 'api', 'user'];
    const lowValue = String(cookie.value || '').toLowerCase();
    cookie.Sensitive_Leak = sensitiveKeywords.some(k => lowValue.includes(k));

    if (cookie.Sensitive_Leak) {
        score -= 5;
    }

    cookie.security_score = Math.max(1, score);
    return cookie;
}

module.exports = {
    classifyCookie,
    detectValuePattern,
    scoreCookieWithSpec
};
