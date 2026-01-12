/**
 * Whistler Sync Worker
 * Anonymous 16-digit login + cloud sync using Cloudflare Workers + D1
 * With rate limiting and Turnstile captcha protection
 */

// CORS headers for all responses
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
};

// ============================================
// Rate Limiting Configuration (STRICT)
// ============================================
const RATE_LIMITS = {
    login: { windowSeconds: 60, maxRequests: 3 },      // 3 logins per minute
    data_read: { windowSeconds: 60, maxRequests: 30 }, // 30 reads per minute
    data_write: { windowSeconds: 60, maxRequests: 10 }, // 10 writes per minute
    global: { windowSeconds: 60, maxRequests: 60 }      // 60 total requests per minute
};

/**
 * Check and update rate limit
 * Returns true if request should be allowed, false if rate limited
 */
async function checkRateLimit(db, ip, endpoint) {
    const config = RATE_LIMITS[endpoint] || RATE_LIMITS.global;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % config.windowSeconds);
    
    try {
        // Get current count for this window
        const existing = await db.prepare(
            'SELECT request_count FROM rate_limits WHERE ip = ? AND endpoint = ? AND window_start = ?'
        ).bind(ip, endpoint, windowStart).first();
        
        if (existing) {
            if (existing.request_count >= config.maxRequests) {
                return { allowed: false, remaining: 0, resetIn: config.windowSeconds - (now % config.windowSeconds) };
            }
            
            // Increment count
            await db.prepare(
                'UPDATE rate_limits SET request_count = request_count + 1 WHERE ip = ? AND endpoint = ? AND window_start = ?'
            ).bind(ip, endpoint, windowStart).run();
            
            return { allowed: true, remaining: config.maxRequests - existing.request_count - 1 };
        } else {
            // Create new entry
            await db.prepare(
                'INSERT INTO rate_limits (ip, endpoint, window_start, request_count) VALUES (?, ?, ?, 1)'
            ).bind(ip, endpoint, windowStart).run();
            
            return { allowed: true, remaining: config.maxRequests - 1 };
        }
    } catch (e) {
        console.error('Rate limit check error:', e);
        // On error, allow the request but log it
        return { allowed: true, remaining: 0 };
    }
}

/**
 * Clean up old rate limit entries (run periodically)
 */
async function cleanupRateLimits(db) {
    const cutoff = Math.floor(Date.now() / 1000) - 3600; // Remove entries older than 1 hour
    try {
        await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(cutoff).run();
    } catch (e) {
        console.error('Rate limit cleanup error:', e);
    }
}

// ============================================
// Turnstile Captcha Verification
// ============================================

/**
 * Verify Turnstile captcha token
 */
async function verifyTurnstile(token, secret, ip) {
    if (!token) {
        return { success: false, error: 'Captcha token required' };
    }
    
    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                secret: secret,
                response: token,
                remoteip: ip
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            console.error('Turnstile verification failed:', result['error-codes']);
            return { success: false, error: 'Captcha verification failed' };
        }
        
        return { success: true };
    } catch (e) {
        console.error('Turnstile verification error:', e);
        return { success: false, error: 'Captcha verification error' };
    }
}

// ============================================
// JWT Token Functions
// ============================================

/**
 * Generate a simple JWT-like token
 * Format: base64(payload).base64(signature)
 */
async function generateToken(accountId, secret, expirySeconds) {
    const payload = {
        sub: accountId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + parseInt(expirySeconds)
    };
    
    const payloadB64 = btoa(JSON.stringify(payload));
    
    // Create signature using HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(payloadB64)
    );
    
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    return `${payloadB64}.${signatureB64}`;
}

/**
 * Verify token and extract account_id
 */
async function verifyToken(token, secret) {
    try {
        const [payloadB64, signatureB64] = token.split('.');
        if (!payloadB64 || !signatureB64) return null;
        
        // Verify signature
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );
        
        const signature = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
        const valid = await crypto.subtle.verify(
            'HMAC',
            key,
            signature,
            encoder.encode(payloadB64)
        );
        
        if (!valid) return null;
        
        // Parse and check expiry
        const payload = JSON.parse(atob(payloadB64));
        if (payload.exp < Math.floor(Date.now() / 1000)) {
            return null; // Token expired
        }
        
        return payload.sub; // Return account_id
    } catch (e) {
        return null;
    }
}

/**
 * Validate 16-digit account ID format
 */
function isValidAccountId(id) {
    return typeof id === 'string' && /^\d{16}$/.test(id);
}

/**
 * JSON response helper
 */
function jsonResponse(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
            ...extraHeaders
        }
    });
}

/**
 * Error response helper
 */
function errorResponse(message, status = 400, extraHeaders = {}) {
    return jsonResponse({ error: message }, status, extraHeaders);
}

/**
 * Rate limit error response
 */
function rateLimitResponse(resetIn) {
    return errorResponse(
        `Too many requests. Try again in ${resetIn} seconds.`,
        429,
        { 'Retry-After': String(resetIn) }
    );
}

/**
 * Handle OPTIONS preflight requests
 */
function handleOptions() {
    return new Response(null, {
        status: 204,
        headers: corsHeaders
    });
}

/**
 * Get client IP from request
 */
function getClientIP(request) {
    return request.headers.get('CF-Connecting-IP') || 
           request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 
           'unknown';
}

/**
 * POST /login - Authenticate or create account (requires captcha)
 */
async function handleLogin(request, env) {
    const ip = getClientIP(request);
    
    // Check rate limit
    const rateCheck = await checkRateLimit(env.DB, ip, 'login');
    if (!rateCheck.allowed) {
        return rateLimitResponse(rateCheck.resetIn);
    }
    
    try {
        const body = await request.json();
        const { account_id, captcha_token } = body;
        
        // Verify captcha first
        const captchaResult = await verifyTurnstile(captcha_token, env.TURNSTILE_SECRET, ip);
        if (!captchaResult.success) {
            return errorResponse(captchaResult.error || 'Captcha verification failed', 400);
        }
        
        if (!isValidAccountId(account_id)) {
            return errorResponse('Invalid account ID format. Must be 16 digits.', 400);
        }
        
        // Check if account exists
        const existing = await env.DB.prepare(
            'SELECT id FROM accounts WHERE id = ?'
        ).bind(account_id).first();
        
        if (!existing) {
            // Create new account
            const now = new Date().toISOString();
            await env.DB.prepare(
                'INSERT INTO accounts (id, created_at) VALUES (?, ?)'
            ).bind(account_id, now).run();
        }
        
        // Generate session token
        const token = await generateToken(
            account_id,
            env.JWT_SECRET,
            env.TOKEN_EXPIRY
        );
        
        return jsonResponse({
            success: true,
            token,
            account_id,
            is_new: !existing
        });
        
    } catch (e) {
        console.error('Login error:', e);
        return errorResponse('Login failed', 500);
    }
}

/**
 * Extract and verify token from Authorization header
 */
async function getAuthenticatedAccountId(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    
    const token = authHeader.slice(7);
    return await verifyToken(token, env.JWT_SECRET);
}

/**
 * GET /data - Get all data for authenticated account
 */
async function handleGetData(request, env) {
    const ip = getClientIP(request);
    
    // Check rate limit
    const rateCheck = await checkRateLimit(env.DB, ip, 'data_read');
    if (!rateCheck.allowed) {
        return rateLimitResponse(rateCheck.resetIn);
    }
    
    const accountId = await getAuthenticatedAccountId(request, env);
    if (!accountId) {
        return errorResponse('Unauthorized', 401);
    }
    
    try {
        const results = await env.DB.prepare(
            'SELECT key, value, updated_at FROM user_data WHERE account_id = ?'
        ).bind(accountId).all();
        
        return jsonResponse({
            success: true,
            data: results.results || []
        });
        
    } catch (e) {
        console.error('Get data error:', e);
        return errorResponse('Failed to retrieve data', 500);
    }
}

/**
 * PUT /data - Upsert a key-value pair
 */
async function handlePutData(request, env) {
    const ip = getClientIP(request);
    
    // Check rate limit
    const rateCheck = await checkRateLimit(env.DB, ip, 'data_write');
    if (!rateCheck.allowed) {
        return rateLimitResponse(rateCheck.resetIn);
    }
    
    const accountId = await getAuthenticatedAccountId(request, env);
    if (!accountId) {
        return errorResponse('Unauthorized', 401);
    }
    
    try {
        const body = await request.json();
        const { key, value } = body;
        
        if (!key || typeof key !== 'string') {
            return errorResponse('Invalid key', 400);
        }
        
        if (value === undefined) {
            return errorResponse('Value is required', 400);
        }
        
        // Limit value size (500KB max)
        const valueStr = JSON.stringify(value);
        if (valueStr.length > 500000) {
            return errorResponse('Data too large. Maximum 500KB allowed.', 400);
        }
        
        const now = new Date().toISOString();
        
        // Upsert using INSERT OR REPLACE
        await env.DB.prepare(
            'INSERT OR REPLACE INTO user_data (account_id, key, value, updated_at) VALUES (?, ?, ?, ?)'
        ).bind(accountId, key, valueStr, now).run();
        
        return jsonResponse({
            success: true,
            key,
            updated_at: now
        });
        
    } catch (e) {
        console.error('Put data error:', e);
        return errorResponse('Failed to save data', 500);
    }
}

/**
 * DELETE /data - Delete a key-value pair
 */
async function handleDeleteData(request, env) {
    const ip = getClientIP(request);
    
    // Check rate limit
    const rateCheck = await checkRateLimit(env.DB, ip, 'data_write');
    if (!rateCheck.allowed) {
        return rateLimitResponse(rateCheck.resetIn);
    }
    
    const accountId = await getAuthenticatedAccountId(request, env);
    if (!accountId) {
        return errorResponse('Unauthorized', 401);
    }
    
    try {
        const body = await request.json();
        const { key } = body;
        
        if (!key || typeof key !== 'string') {
            return errorResponse('Invalid key', 400);
        }
        
        await env.DB.prepare(
            'DELETE FROM user_data WHERE account_id = ? AND key = ?'
        ).bind(accountId, key).run();
        
        return jsonResponse({
            success: true,
            key
        });
        
    } catch (e) {
        console.error('Delete data error:', e);
        return errorResponse('Failed to delete data', 500);
    }
}

/**
 * GET /health - Health check endpoint
 */
function handleHealth() {
    return jsonResponse({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
}

/**
 * Main request handler
 */
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;
        
        // Handle CORS preflight
        if (method === 'OPTIONS') {
            return handleOptions();
        }
        
        // Periodically cleanup old rate limit entries (1% chance per request)
        if (Math.random() < 0.01) {
            cleanupRateLimits(env.DB);
        }
        
        // Global rate limit check
        const ip = getClientIP(request);
        const globalCheck = await checkRateLimit(env.DB, ip, 'global');
        if (!globalCheck.allowed) {
            return rateLimitResponse(globalCheck.resetIn);
        }
        
        // Route requests
        if (path === '/login' && method === 'POST') {
            return handleLogin(request, env);
        }
        
        if (path === '/data') {
            if (method === 'GET') {
                return handleGetData(request, env);
            }
            if (method === 'PUT') {
                return handlePutData(request, env);
            }
            if (method === 'DELETE') {
                return handleDeleteData(request, env);
            }
        }
        
        if (path === '/health' && method === 'GET') {
            return handleHealth();
        }
        
        // 404 for unknown routes
        return errorResponse('Not found', 404);
    }
};

