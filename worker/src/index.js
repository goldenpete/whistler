/**
 * Whistler Sync Worker
 * Anonymous 16-digit login + cloud sync using Cloudflare Workers + D1
 */

// CORS headers for all responses
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
};

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
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
        }
    });
}

/**
 * Error response helper
 */
function errorResponse(message, status = 400) {
    return jsonResponse({ error: message }, status);
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
 * POST /login - Authenticate or create account
 */
async function handleLogin(request, env) {
    try {
        const body = await request.json();
        const { account_id } = body;
        
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
        
        const now = new Date().toISOString();
        
        // Upsert using INSERT OR REPLACE
        await env.DB.prepare(
            'INSERT OR REPLACE INTO user_data (account_id, key, value, updated_at) VALUES (?, ?, ?, ?)'
        ).bind(accountId, key, JSON.stringify(value), now).run();
        
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
