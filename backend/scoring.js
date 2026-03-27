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

// ======================================================================
// INTELLIGENT FLAG REQUIREMENTS DETECTION
// ======================================================================
// Determines which security flags are actually NEEDED for each cookie
// based on its purpose, sensitivity, and value type

function determineFlagRequirements(cookie, category, valuePattern) {
    const name = (cookie.name || '').toLowerCase();
    const value = (cookie.value || '').toString().toLowerCase();
    
    // Detect if cookie contains sensitive data
    const sensitiveKeywords = ['password', 'token', 'auth', 'secret', 'api', 'user', 'jwt', 'bearer'];
    const isSensitive = sensitiveKeywords.some(k => value.includes(k) || name.includes(k));
    
    // Detect value sensitivity
    const isHighEntropy = (cookie.value || '').length > 40;
    const isToken = valuePattern.includes('token') || valuePattern.includes('JWT');

    // Detect if this is a cross-site tracking cookie (Google/YouTube pattern)
    const isGoogleTracking = name.includes('visitor') || name.includes('gps') || 
                             name.includes('_ga') || name.includes('_gid');
    const isGoogleAuth = name.includes('ynid') || name.includes('rollout') || 
                         name.includes('ysc') || name.includes('__secure');

    const requirements = {
        requireHttpOnly: false,
        requireSecure: false,
        requireSameSite: false,
        isJustified: false, // True if omission is justified; False if intentional trade-off
        reasoning: {
            httpOnly: '',
            secure: '',
            sameSite: ''
        }
    };

    // ===== SESSION & AUTH COOKIES (Critical - All flags recommended) =====
    if (category.includes('Session') || category.includes('Auth') || category.includes('Security / Auth')) {
        requirements.requireHttpOnly = true;
        requirements.reasoning.httpOnly = 'Session/Auth cookies contain sensitive session data; HttpOnly prevents XSS theft.';
        
        requirements.requireSecure = true;
        requirements.reasoning.secure = 'Session/Auth cookies must be HTTPS-only to prevent man-in-the-middle interception.';
        
        requirements.requireSameSite = true;
        requirements.reasoning.sameSite = 'Session/Auth cookies should have SameSite to prevent CSRF attacks.';
        
        requirements.isJustified = false; // Auth cookies should ALWAYS have these flags
    }

    // ===== GOOGLE AUTH COOKIES (Session/Auth) - Check if intentionally omitted for cross-domain auth =====
    else if (isGoogleAuth) {
        requirements.requireHttpOnly = true;
        requirements.reasoning.httpOnly = 'Auth token: HttpOnly prevents XSS-based theft.';
        
        requirements.requireSecure = true;
        requirements.reasoning.secure = 'Auth token: HTTPS-only prevents interception.';
        
        requirements.requireSameSite = true;
        requirements.reasoning.sameSite = 'Auth token: SameSite prevents CSRF attacks. OFTEN OMITTED by Google for cross-domain auth flow.';
        
        // Mark as intentional trade-off (Google omits SameSite to work across youtube.com, google.com, etc)
        requirements.isJustified = false;
    }

    // ===== CLOUDFLARE SECURITY COOKIES =====
    else if (category.includes('Cloudflare')) {
        requirements.requireHttpOnly = false;
        requirements.reasoning.httpOnly = 'Cloudflare cookies are CDN-managed; HttpOnly is optional for these.';
        
        requirements.requireSecure = true;
        requirements.reasoning.secure = 'Cloudflare security cookies should use HTTPS to prevent tampering.';
        
        requirements.requireSameSite = false;
        requirements.reasoning.sameSite = 'Cloudflare cookies may intentionally omit SameSite for cross-site compatibility.';
        
        requirements.isJustified = true; // CDN cookies are justified to omit SameSite
    }

    // ===== GOOGLE TRACKING COOKIES (Cross-site tracking) =====
    else if (isGoogleTracking) {
        requirements.requireHttpOnly = false;
        requirements.reasoning.httpOnly = 'Tracking cookie with non-sensitive UUID; HttpOnly not required.';
        
        requirements.requireSecure = false;
        requirements.reasoning.secure = 'Tracking cookie; Secure not strictly required but recommended.';
        
        requirements.requireSameSite = false;
        requirements.reasoning.sameSite = 'INTENTIONALLY OMITTED: SameSite=None needed for Google tracking across sites. Trade-off: Tracking vs CSRF protection.';
        
        // Mark as intentional (Google deliberately omits SameSite for cross-site tracking to work)
        requirements.isJustified = false; // Not justified, but intentional for business reasons
    }

    // ===== ANALYTICS & TRACKING COOKIES =====
    else if (category.includes('Analytics') || category.includes('Tracking')) {
        requirements.requireHttpOnly = false;
        requirements.reasoning.httpOnly = 'Analytics cookies contain non-sensitive IDs; HttpOnly not required.';
        
        requirements.requireSecure = isSensitive;
        requirements.reasoning.secure = isSensitive 
            ? 'This analytics cookie appears sensitive; Secure flag recommended.'
            : 'Analytics cookies are not sensitive; Secure flag is optional.';
        
        // For generic analytics: SameSite prevents tracking abuse
        // But big tech often omits it intentionally
        requirements.requireSameSite = true;
        requirements.reasoning.sameSite = 'Analytics should have SameSite to limit cross-site tracking, but often omitted intentionally.';
        
        requirements.isJustified = false; // Intentional omission for tracking purposes
    }

    // ===== MISCELLANEOUS / UNKNOWN COOKIES =====
    else {
        // For unknown cookies, check the actual data
        if (isToken || isHighEntropy || isSensitive) {
            // Looks like it contains sensitive data
            requirements.requireHttpOnly = true;
            requirements.reasoning.httpOnly = 'Cookie appears to contain a token/sensitive data; HttpOnly recommended.';
            
            requirements.requireSecure = true;
            requirements.reasoning.secure = 'Cookie appears sensitive; Secure flag recommended.';
            
            requirements.requireSameSite = true;
            requirements.reasoning.sameSite = 'Cookie appears sensitive; SameSite recommended.';
            
            requirements.isJustified = false;
        } else {
            // Low-sensitivity cookie (e.g., simple UUID or preference)
            requirements.requireHttpOnly = false;
            requirements.reasoning.httpOnly = 'Cookie appears non-sensitive; HttpOnly is optional.';
            
            requirements.requireSecure = false;
            requirements.reasoning.secure = 'Cookie appears non-sensitive; Secure is optional.';
            
            requirements.requireSameSite = false;
            requirements.reasoning.sameSite = 'Cookie appears non-sensitive; SameSite is optional.';
            
            requirements.isJustified = true; // Truly not needed
        }
    }

    return requirements;
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

    // Get intelligent flag requirements based on cookie type
    const flagRequirements = determineFlagRequirements(cookie, category, cookie.value_pattern);
    cookie.flagRequirements = flagRequirements;

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
        // No spec available - use intelligent flag requirement detection
        // Only penalize if flag is actually REQUIRED for this cookie type
        
        if (flagRequirements.requireHttpOnly && !cookie.HttpOnly) {
            score -= 2;
            cookie.httpOnly_penalty = flagRequirements.reasoning.httpOnly;
        } else if (!flagRequirements.requireHttpOnly && !cookie.HttpOnly) {
            cookie.httpOnly_penalty = null; // No penalty - flag not required
        }

        if (flagRequirements.requireSecure && !cookie.Secure) {
            score -= 2;
            cookie.secure_penalty = flagRequirements.reasoning.secure;
        } else if (!flagRequirements.requireSecure && !cookie.Secure) {
            cookie.secure_penalty = null; // No penalty - flag not required
        }

        if (flagRequirements.requireSameSite && !cookie.SameSite) {
            score -= 2;
            cookie.sameSite_penalty = flagRequirements.reasoning.sameSite;
        } else if (!flagRequirements.requireSameSite && !cookie.SameSite) {
            cookie.sameSite_penalty = null; // No penalty - flag not required
        }
        
        cookie.hasSpec = false;
        cookie.specReason = "Using intelligent flag requirement analysis";
        console.log(`✓ ${cookie.name}: Using intelligent analysis - score ${score}`);
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
    determineFlagRequirements,
    scoreCookieWithSpec
};
