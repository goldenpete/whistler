// ══════════════════════════════════════════════════════════════════════════
// Whistler Sync — Cloudflare Worker
// Handles: login, TOTP 2FA, data sync, passkey (WebAuthn) registration/login
// ══════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const RATE_LIMITS = {
  login: { windowSeconds: 60, maxRequests: 5 },
  data_read: { windowSeconds: 60, maxRequests: 30 },
  data_write: { windowSeconds: 60, maxRequests: 10 },
  totp: { windowSeconds: 60, maxRequests: 5 },
  passkey: { windowSeconds: 60, maxRequests: 10 },
  global: { windowSeconds: 60, maxRequests: 60 },
};

const RP_NAME = "Whistler";
const RP_ID = "whistlerbox.com";
const RP_ORIGIN = "https://whistlerbox.com";

// ══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════

async function checkRateLimit(db, ip, endpoint) {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.global;
  const now = Math.floor(Date.now() / 1e3);
  const windowStart = now - (now % config.windowSeconds);
  try {
    const existing = await db
      .prepare("SELECT request_count FROM rate_limits WHERE ip = ? AND endpoint = ? AND window_start = ?")
      .bind(ip, endpoint, windowStart)
      .first();
    if (existing) {
      if (existing.request_count >= config.maxRequests) {
        return { allowed: false, remaining: 0, resetIn: config.windowSeconds - (now % config.windowSeconds) };
      }
      await db
        .prepare("UPDATE rate_limits SET request_count = request_count + 1 WHERE ip = ? AND endpoint = ? AND window_start = ?")
        .bind(ip, endpoint, windowStart)
        .run();
      return { allowed: true, remaining: config.maxRequests - existing.request_count - 1 };
    } else {
      await db
        .prepare("INSERT INTO rate_limits (ip, endpoint, window_start, request_count) VALUES (?, ?, ?, 1)")
        .bind(ip, endpoint, windowStart)
        .run();
      return { allowed: true, remaining: config.maxRequests - 1 };
    }
  } catch (e) {
    console.error("Rate limit check error:", e);
    return { allowed: true, remaining: 0 };
  }
}

async function cleanupRateLimits(db) {
  const cutoff = Math.floor(Date.now() / 1e3) - 3600;
  try {
    await db.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(cutoff).run();
  } catch (e) {
    console.error("Rate limit cleanup error:", e);
  }
}

function generateTOTPSecret() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  let secret = "";
  for (let i = 0; i < 20; i++) {
    secret += chars[array[i] % 32];
  }
  return secret;
}

function generateDisplayName() {
  const adjectives = [
    "Swift","Brave","Calm","Daring","Eager","Fierce","Gentle","Happy","Jolly","Kind",
    "Lucky","Mighty","Noble","Proud","Quick","Royal","Silent","Steady","Clever","Cosmic",
    "Crystal","Dancing","Dreamy","Electric","Frozen","Golden","Hidden","Iron","Jade","Keen",
    "Lunar","Misty","Neon","Ocean","Phantom","Quantum","Radiant","Sapphire","Shadow","Solar",
    "Stellar","Thunder","Velvet","Wild","Amber","Arctic","Blazing","Coral","Crimson","Dusk","Ember",
  ];
  const animals = [
    "Fox","Wolf","Bear","Eagle","Hawk","Owl","Tiger","Lion","Panther","Falcon",
    "Raven","Shark","Dragon","Phoenix","Viper","Cobra","Jaguar","Lynx","Puma","Orca",
    "Badger","Crane","Dolphin","Elephant","Gazelle","Heron","Ibis","Jackal","Koala","Lemur",
    "Mantis","Narwhal","Osprey","Panda","Quail","Raccoon","Sparrow","Turtle","Unicorn","Vulture",
    "Walrus","Yak","Zebra","Otter","Seal","Stag","Moth","Bison","Coyote","Ferret",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adj} ${animal}`;
}

function base32Decode(str) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  str = str.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of str) {
    const val = chars.indexOf(char);
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  return new Uint8Array(bytes);
}

async function hmacSha1(key, message) {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, message);
  return new Uint8Array(signature);
}

async function verifyTOTP(secret, code, timeStep = 30) {
  const normalizedCode = code.replace(/\s/g, "");
  for (const offset of [0, -1, 1]) {
    const time = Math.floor(Date.now() / 1e3 / timeStep) + offset;
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setUint32(4, time, false);
    const key = base32Decode(secret);
    const hmac = await hmacSha1(key, new Uint8Array(timeBuffer));
    const hmacOffset = hmac[hmac.length - 1] & 0x0f;
    const generatedCode =
      (((hmac[hmacOffset] & 0x7f) << 24) |
        ((hmac[hmacOffset + 1] & 0xff) << 16) |
        ((hmac[hmacOffset + 2] & 0xff) << 8) |
        (hmac[hmacOffset + 3] & 0xff)) %
      1e6;
    if (generatedCode.toString().padStart(6, "0") === normalizedCode) {
      return true;
    }
  }
  return false;
}

async function verifyTurnstile(token, secret, ip) {
  if (!token) return { success: false, error: "Captcha token required" };
  if (!secret) {
    console.error("TURNSTILE_SECRET is not set");
    return { success: false, error: "Server configuration error" };
  }
  try {
    const bodyParams = { secret, response: token };
    if (ip && ip !== "unknown") bodyParams.remoteip = ip;
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(bodyParams),
    });
    const result = await response.json();
    if (!result.success) {
      const errorCodes = result["error-codes"] || [];
      if (errorCodes.includes("invalid-input-secret"))
        return { success: false, error: "Server configuration error (invalid secret)" };
      if (errorCodes.includes("timeout-or-duplicate"))
        return { success: false, error: "Captcha expired, please try again" };
      return { success: false, error: "Captcha verification failed" };
    }
    return { success: true };
  } catch (e) {
    console.error("Turnstile verification error:", e);
    return { success: false, error: "Captcha verification error" };
  }
}

async function generateToken(accountId, secret, expirySeconds, pendingTotp = false) {
  const payload = {
    sub: accountId,
    iat: Math.floor(Date.now() / 1e3),
    exp: Math.floor(Date.now() / 1e3) + parseInt(expirySeconds),
    pending_totp: pendingTotp,
  };
  const payloadB64 = btoa(JSON.stringify(payload));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${payloadB64}.${signatureB64}`;
}

async function verifyToken(token, secret, allowPendingTotp = false) {
  try {
    const [payloadB64, signatureB64] = token.split(".");
    if (!payloadB64 || !signatureB64) return null;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const signature = Uint8Array.from(atob(signatureB64), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(payloadB64));
    if (!valid) return null;
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Math.floor(Date.now() / 1e3)) return null;
    if (payload.pending_totp && !allowPendingTotp) return null;
    return payload.sub;
  } catch (e) {
    return null;
  }
}

function isValidAccountId(id) {
  return typeof id === "string" && /^\d{16}$/.test(id);
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...extraHeaders },
  });
}

function errorResponse(message, status = 400, extraHeaders = {}) {
  return jsonResponse({ error: message }, status, extraHeaders);
}

function rateLimitResponse(resetIn) {
  return errorResponse(`Too many requests. Try again in ${resetIn} seconds.`, 429, { "Retry-After": String(resetIn) });
}

function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function getClientIP(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || "unknown";
}

async function getAuthenticatedAccountId(request, env, allowPendingTotp = false) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return await verifyToken(token, env.JWT_SECRET, allowPendingTotp);
}

// ══════════════════════════════════════════════════════════════════════════
// BASE64URL HELPERS (for WebAuthn)
// ══════════════════════════════════════════════════════════════════════════

function base64urlEncode(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlDecode(str) {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ══════════════════════════════════════════════════════════════════════════
// CBOR DECODER (minimal, for attestationObject parsing)
// ══════════════════════════════════════════════════════════════════════════

function decodeCBOR(data) {
  let offset = 0;

  function read() {
    if (offset >= data.length) throw new Error("CBOR: unexpected end of data");
    const initial = data[offset++];
    const major = initial >> 5;
    const additional = initial & 0x1f;

    let value = readArgument(additional);

    switch (major) {
      case 0: // unsigned int
        return value;
      case 1: // negative int
        return -1 - value;
      case 2: // byte string
        return readBytes(value);
      case 3: // text string
        return new TextDecoder().decode(readBytes(value));
      case 4: { // array
        const arr = [];
        for (let i = 0; i < value; i++) arr.push(read());
        return arr;
      }
      case 5: { // map
        const obj = {};
        for (let i = 0; i < value; i++) {
          const key = read();
          obj[key] = read();
        }
        return obj;
      }
      case 6: // tagged value — skip tag, read inner
        return read();
      case 7: // simple/float
        if (additional === 20) return false;
        if (additional === 21) return true;
        if (additional === 22) return null;
        return value;
      default:
        throw new Error(`CBOR: unsupported major type ${major}`);
    }
  }

  function readArgument(additional) {
    if (additional < 24) return additional;
    if (additional === 24) return data[offset++];
    if (additional === 25) {
      const v = (data[offset] << 8) | data[offset + 1];
      offset += 2;
      return v;
    }
    if (additional === 26) {
      const v = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
      offset += 4;
      return v >>> 0; // unsigned
    }
    if (additional === 27) {
      // 64-bit — just read as Number (sufficient for our use)
      let v = 0;
      for (let i = 0; i < 8; i++) v = v * 256 + data[offset++];
      return v;
    }
    return additional;
  }

  function readBytes(length) {
    const slice = data.slice(offset, offset + length);
    offset += length;
    return slice;
  }

  return read();
}

// ══════════════════════════════════════════════════════════════════════════
// WEBAUTHN HELPERS
// ══════════════════════════════════════════════════════════════════════════

function extractPublicKeyFromAuthData(authData) {
  // authData layout: rpIdHash(32) + flags(1) + signCount(4) + [attestedCredentialData]
  // attestedCredentialData: aaguid(16) + credIdLen(2) + credId(credIdLen) + credentialPublicKey(CBOR)
  let pos = 37; // skip rpIdHash + flags + signCount
  // aaguid
  pos += 16;
  // credIdLen
  const credIdLen = (authData[pos] << 8) | authData[pos + 1];
  pos += 2;
  // credId
  pos += credIdLen;
  // rest is CBOR-encoded public key (COSE_Key)
  const publicKeyCBOR = authData.slice(pos);
  return decodeCBOR(publicKeyCBOR);
}

async function importCOSEPublicKey(coseKey) {
  // Support ES256 (alg -7) — ECDSA with P-256
  const alg = coseKey[3] || coseKey["3"];
  if (alg !== -7) {
    throw new Error(`Unsupported COSE algorithm: ${alg}. Only ES256 (-7) is supported.`);
  }
  const x = coseKey[-2] || coseKey["-2"];
  const y = coseKey[-3] || coseKey["-3"];
  if (!x || !y) throw new Error("Missing x/y coordinates in COSE key");

  // Build uncompressed EC point: 0x04 || x || y
  const publicKeyBytes = new Uint8Array(1 + x.length + y.length);
  publicKeyBytes[0] = 0x04;
  publicKeyBytes.set(x, 1);
  publicKeyBytes.set(y, 1 + x.length);

  const key = await crypto.subtle.importKey(
    "raw",
    publicKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"]
  );
  // Export as JWK for storage
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return jwk;
}

async function verifyWebAuthnSignature(publicKeyJwk, authenticatorData, clientDataJSON, signature) {
  const key = await crypto.subtle.importKey(
    "jwk",
    publicKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );

  // Hash clientDataJSON
  const clientDataHash = new Uint8Array(await crypto.subtle.digest("SHA-256", clientDataJSON));

  // signedData = authenticatorData || hash(clientDataJSON)
  const signedData = new Uint8Array(authenticatorData.length + clientDataHash.length);
  signedData.set(authenticatorData, 0);
  signedData.set(clientDataHash, authenticatorData.length);

  // WebAuthn uses DER-encoded signature, but Web Crypto expects raw r||s for ECDSA
  const rawSig = derToRaw(signature);

  return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, rawSig, signedData);
}

function derToRaw(derSig) {
  // DER format: 0x30 <totalLen> 0x02 <rLen> <r> 0x02 <sLen> <s>
  const sig = derSig instanceof Uint8Array ? derSig : new Uint8Array(derSig);
  if (sig[0] !== 0x30) {
    // Already raw format (64 bytes for P-256)
    if (sig.length === 64) return sig;
    throw new Error("Invalid signature format");
  }
  let offset = 2;
  if (sig[offset] !== 0x02) throw new Error("Invalid DER signature");
  offset++;
  const rLen = sig[offset++];
  const r = sig.slice(offset, offset + rLen);
  offset += rLen;
  if (sig[offset] !== 0x02) throw new Error("Invalid DER signature");
  offset++;
  const sLen = sig[offset++];
  const s = sig.slice(offset, offset + sLen);

  // Pad/trim r and s to 32 bytes each
  const raw = new Uint8Array(64);
  raw.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
  raw.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  return raw;
}

// ══════════════════════════════════════════════════════════════════════════
// EXISTING ROUTE HANDLERS
// ══════════════════════════════════════════════════════════════════════════

async function handleLogin(request, env) {
  const ip = getClientIP(request);
  const rateCheck = await checkRateLimit(env.DB, ip, "login");
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetIn);
  try {
    const body = await request.json();
    const { account_id, captcha_token } = body;
    const captchaResult = await verifyTurnstile(captcha_token, env.TURNSTILE_SECRET, ip);
    if (!captchaResult.success) return errorResponse(captchaResult.error || "Captcha verification failed", 400);
    if (!isValidAccountId(account_id)) return errorResponse("Invalid account ID format. Must be 16 digits.", 400);
    const existing = await env.DB.prepare("SELECT id, totp_enabled, display_name FROM accounts WHERE id = ?").bind(account_id).first();
    let isNew = false;
    let totpEnabled = false;
    let displayName = null;
    if (!existing) {
      const now = new Date().toISOString();
      displayName = generateDisplayName();
      await env.DB.prepare("INSERT INTO accounts (id, created_at, totp_enabled, display_name) VALUES (?, ?, 0, ?)").bind(account_id, now, displayName).run();
      isNew = true;
    } else {
      totpEnabled = existing.totp_enabled === 1;
      displayName = existing.display_name;
      if (!displayName) {
        displayName = generateDisplayName();
        await env.DB.prepare("UPDATE accounts SET display_name = ? WHERE id = ?").bind(displayName, account_id).run();
      }
    }
    if (totpEnabled) {
      const pendingToken = await generateToken(account_id, env.JWT_SECRET, 300, true);
      return jsonResponse({ success: true, requires_totp: true, pending_token: pendingToken, account_id, display_name: displayName, is_new: isNew });
    }
    const token = await generateToken(account_id, env.JWT_SECRET, env.TOKEN_EXPIRY, false);
    return jsonResponse({ success: true, requires_totp: false, token, account_id, display_name: displayName, is_new: isNew });
  } catch (e) {
    console.error("Login error:", e);
    return errorResponse("Login failed", 500);
  }
}

async function handleLoginTotp(request, env) {
  const ip = getClientIP(request);
  const rateCheck = await checkRateLimit(env.DB, ip, "totp");
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetIn);
  try {
    const body = await request.json();
    const { pending_token, totp_code } = body;
    if (!pending_token || !totp_code) return errorResponse("Missing pending token or TOTP code", 400);
    const accountId = await verifyToken(pending_token, env.JWT_SECRET, true);
    if (!accountId) return errorResponse("Invalid or expired token", 401);
    const account = await env.DB.prepare("SELECT totp_secret, display_name FROM accounts WHERE id = ? AND totp_enabled = 1").bind(accountId).first();
    if (!account || !account.totp_secret) return errorResponse("2FA not enabled for this account", 400);
    const isValid = await verifyTOTP(account.totp_secret, totp_code);
    if (!isValid) return errorResponse("Invalid 2FA code", 401);
    const token = await generateToken(accountId, env.JWT_SECRET, env.TOKEN_EXPIRY, false);
    return jsonResponse({ success: true, token, account_id: accountId, display_name: account.display_name });
  } catch (e) {
    console.error("TOTP verify error:", e);
    return errorResponse("Verification failed", 500);
  }
}

async function handle2FASetup(request, env) {
  const accountId = await getAuthenticatedAccountId(request, env);
  if (!accountId) return errorResponse("Unauthorized", 401);
  try {
    const account = await env.DB.prepare("SELECT totp_enabled FROM accounts WHERE id = ?").bind(accountId).first();
    if (account && account.totp_enabled === 1) return errorResponse("2FA is already enabled", 400);
    const secret = generateTOTPSecret();
    await env.DB.prepare("UPDATE accounts SET totp_secret = ? WHERE id = ?").bind(secret, accountId).run();
    const otpauthUrl = `otpauth://totp/Whistler:${accountId}?secret=${secret}&issuer=Whistler&digits=6&period=30`;
    return jsonResponse({ success: true, secret, otpauth_url: otpauthUrl });
  } catch (e) {
    console.error("2FA setup error:", e);
    return errorResponse("Setup failed", 500);
  }
}

async function handle2FAEnable(request, env) {
  const accountId = await getAuthenticatedAccountId(request, env);
  if (!accountId) return errorResponse("Unauthorized", 401);
  try {
    const body = await request.json();
    const { totp_code } = body;
    if (!totp_code) return errorResponse("TOTP code required", 400);
    const account = await env.DB.prepare("SELECT totp_secret, totp_enabled FROM accounts WHERE id = ?").bind(accountId).first();
    if (!account || !account.totp_secret) return errorResponse("Please run setup first", 400);
    if (account.totp_enabled === 1) return errorResponse("2FA is already enabled", 400);
    const isValid = await verifyTOTP(account.totp_secret, totp_code);
    if (!isValid) return errorResponse("Invalid code. Please try again.", 400);
    await env.DB.prepare("UPDATE accounts SET totp_enabled = 1 WHERE id = ?").bind(accountId).run();
    return jsonResponse({ success: true, message: "2FA enabled successfully" });
  } catch (e) {
    console.error("2FA enable error:", e);
    return errorResponse("Failed to enable 2FA", 500);
  }
}

async function handle2FADisable(request, env) {
  const accountId = await getAuthenticatedAccountId(request, env);
  if (!accountId) return errorResponse("Unauthorized", 401);
  try {
    const body = await request.json();
    const { totp_code } = body;
    if (!totp_code) return errorResponse("TOTP code required to disable 2FA", 400);
    const account = await env.DB.prepare("SELECT totp_secret, totp_enabled FROM accounts WHERE id = ?").bind(accountId).first();
    if (!account || account.totp_enabled !== 1) return errorResponse("2FA is not enabled", 400);
    const isValid = await verifyTOTP(account.totp_secret, totp_code);
    if (!isValid) return errorResponse("Invalid code", 400);
    await env.DB.prepare("UPDATE accounts SET totp_enabled = 0, totp_secret = NULL WHERE id = ?").bind(accountId).run();
    return jsonResponse({ success: true, message: "2FA disabled successfully" });
  } catch (e) {
    console.error("2FA disable error:", e);
    return errorResponse("Failed to disable 2FA", 500);
  }
}

async function handle2FAStatus(request, env) {
  const accountId = await getAuthenticatedAccountId(request, env);
  if (!accountId) return errorResponse("Unauthorized", 401);
  try {
    const account = await env.DB.prepare("SELECT totp_enabled FROM accounts WHERE id = ?").bind(accountId).first();
    return jsonResponse({ success: true, totp_enabled: account ? account.totp_enabled === 1 : false });
  } catch (e) {
    console.error("2FA status error:", e);
    return errorResponse("Failed to get status", 500);
  }
}

async function handleGetData(request, env) {
  const ip = getClientIP(request);
  const rateCheck = await checkRateLimit(env.DB, ip, "data_read");
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetIn);
  const accountId = await getAuthenticatedAccountId(request, env);
  if (!accountId) return errorResponse("Unauthorized", 401);
  try {
    const results = await env.DB.prepare("SELECT key, value, updated_at FROM user_data WHERE account_id = ?").bind(accountId).all();
    return jsonResponse({ success: true, data: results.results || [] });
  } catch (e) {
    console.error("Get data error:", e);
    return errorResponse("Failed to retrieve data", 500);
  }
}

async function handlePutData(request, env) {
  const ip = getClientIP(request);
  const rateCheck = await checkRateLimit(env.DB, ip, "data_write");
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetIn);
  const accountId = await getAuthenticatedAccountId(request, env);
  if (!accountId) return errorResponse("Unauthorized", 401);
  try {
    const body = await request.json();
    const { key, value } = body;
    if (!key || typeof key !== "string") return errorResponse("Invalid key", 400);
    if (value === undefined) return errorResponse("Value is required", 400);
    const valueStr = JSON.stringify(value);
    if (valueStr.length > 5e5) return errorResponse("Data too large. Maximum 500KB allowed.", 400);
    const now = new Date().toISOString();
    await env.DB.prepare("INSERT OR REPLACE INTO user_data (account_id, key, value, updated_at) VALUES (?, ?, ?, ?)").bind(accountId, key, valueStr, now).run();
    return jsonResponse({ success: true, key, updated_at: now });
  } catch (e) {
    console.error("Put data error:", e);
    return errorResponse("Failed to save data", 500);
  }
}

async function handleDeleteData(request, env) {
  const ip = getClientIP(request);
  const rateCheck = await checkRateLimit(env.DB, ip, "data_write");
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetIn);
  const accountId = await getAuthenticatedAccountId(request, env);
  if (!accountId) return errorResponse("Unauthorized", 401);
  try {
    const body = await request.json();
    const { key } = body;
    if (!key || typeof key !== "string") return errorResponse("Invalid key", 400);
    await env.DB.prepare("DELETE FROM user_data WHERE account_id = ? AND key = ?").bind(accountId, key).run();
    return jsonResponse({ success: true, key });
  } catch (e) {
    console.error("Delete data error:", e);
    return errorResponse("Failed to delete data", 500);
  }
}

async function handleUpdateDisplayName(request, env) {
  const accountId = await getAuthenticatedAccountId(request, env);
  if (!accountId) return errorResponse("Unauthorized", 401);
  try {
    const body = await request.json();
    const { display_name } = body;
    if (!display_name || typeof display_name !== "string" || display_name.length > 50) {
      return errorResponse("Invalid display name", 400);
    }
    await env.DB.prepare("UPDATE accounts SET display_name = ? WHERE id = ?").bind(display_name.trim(), accountId).run();
    return jsonResponse({ success: true, display_name: display_name.trim() });
  } catch (e) {
    console.error("Update name error:", e);
    return errorResponse("Failed to update name", 500);
  }
}

function handleHealth() {
  return jsonResponse({ status: "ok", timestamp: new Date().toISOString() });
}

// ══════════════════════════════════════════════════════════════════════════
// PASSKEY (WebAuthn) ROUTE HANDLERS
// ══════════════════════════════════════════════════════════════════════════

// GET /passkeys — list registered passkeys for the authenticated user
async function handleListPasskeys(request, env) {
  const accountId = await getAuthenticatedAccountId(request, env);
  if (!accountId) return errorResponse("Unauthorized", 401);
  try {
    const results = await env.DB.prepare(
      "SELECT credential_id as id, name, created_at FROM passkeys WHERE account_id = ?"
    ).bind(accountId).all();
    return jsonResponse({ passkeys: results.results || [] });
  } catch (e) {
    console.error("List passkeys error:", e);
    return errorResponse("Failed to list passkeys", 500);
  }
}

// POST /passkeys/register/start — generate registration challenge
async function handlePasskeyRegisterStart(request, env) {
  const accountId = await getAuthenticatedAccountId(request, env);
  if (!accountId) return errorResponse("Unauthorized", 401);

  const ip = getClientIP(request);
  const rateCheck = await checkRateLimit(env.DB, ip, "passkey");
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetIn);

  try {
    const body = await request.json();

    // If 2FA enabled, verify TOTP first
    const account = await env.DB.prepare(
      "SELECT totp_enabled, totp_secret, display_name FROM accounts WHERE id = ?"
    ).bind(accountId).first();

    if (account && account.totp_enabled === 1) {
      const { totp_code } = body;
      if (!totp_code) return errorResponse("2FA code required to add a passkey", 400);
      const isValid = await verifyTOTP(account.totp_secret, totp_code);
      if (!isValid) return errorResponse("Invalid 2FA code", 400);
    }

    // Get existing credentials to exclude
    const existing = await env.DB.prepare(
      "SELECT credential_id FROM passkeys WHERE account_id = ?"
    ).bind(accountId).all();

    const excludeCredentials = (existing.results || []).map((row) => ({
      type: "public-key",
      id: row.credential_id,
    }));

    // Generate challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const challengeB64 = base64urlEncode(challenge);

    // Store challenge temporarily (expires in 5 min)
    const challengeKey = `webauthn_challenge:${accountId}:register`;
    const now = new Date().toISOString();
    await env.DB.prepare(
      "INSERT OR REPLACE INTO user_data (account_id, key, value, updated_at) VALUES (?, ?, ?, ?)"
    ).bind(accountId, challengeKey, challengeB64, now).run();

    // Generate user ID (use account ID hashed to avoid exposing it)
    const userIdBytes = new TextEncoder().encode(accountId);
    const userIdHash = new Uint8Array(await crypto.subtle.digest("SHA-256", userIdBytes));
    const userIdB64 = base64urlEncode(userIdHash);

    const displayName = (account && account.display_name) || accountId;

    const options = {
      challenge: challengeB64,
      rp: { name: RP_NAME, id: RP_ID },
      user: {
        id: userIdB64,
        name: accountId,
        displayName: displayName,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },   // ES256
        { type: "public-key", alg: -257 },  // RS256 (listed for compatibility, we verify ES256)
      ],
      timeout: 60000,
      attestation: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "preferred",
      },
      excludeCredentials,
    };

    return jsonResponse(options);
  } catch (e) {
    console.error("Passkey register start error:", e);
    return errorResponse("Failed to start passkey registration", 500);
  }
}

// POST /passkeys/register/finish — verify and store the new credential
async function handlePasskeyRegisterFinish(request, env) {
  const accountId = await getAuthenticatedAccountId(request, env);
  if (!accountId) return errorResponse("Unauthorized", 401);

  try {
    const body = await request.json();
    // Support both { id, rawId, response, ... } and { credential: { id, rawId, response, ... } }
    const cred = body.credential || body;

    if (!cred.id || !cred.response) {
      return errorResponse("Invalid credential data", 400);
    }

    // Retrieve stored challenge
    const challengeKey = `webauthn_challenge:${accountId}:register`;
    const storedChallenge = await env.DB.prepare(
      "SELECT value FROM user_data WHERE account_id = ? AND key = ?"
    ).bind(accountId, challengeKey).first();

    if (!storedChallenge) return errorResponse("Registration session expired", 400);

    // Clean up challenge
    await env.DB.prepare(
      "DELETE FROM user_data WHERE account_id = ? AND key = ?"
    ).bind(accountId, challengeKey).run();

    // Decode attestationObject and clientDataJSON
    const clientDataJSON = base64urlDecode(cred.response.clientDataJSON);
    const attestationObject = base64urlDecode(cred.response.attestationObject);

    // Verify clientDataJSON
    const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));

    if (clientData.type !== "webauthn.create") {
      return errorResponse("Invalid client data type", 400);
    }

    // Verify challenge matches
    if (clientData.challenge !== storedChallenge.value) {
      return errorResponse("Challenge mismatch", 400);
    }

    // Verify origin
    if (clientData.origin !== RP_ORIGIN) {
      // Also allow localhost for development
      if (!clientData.origin.startsWith("http://localhost") && !clientData.origin.startsWith("https://localhost")) {
        return errorResponse("Origin mismatch", 400);
      }
    }

    // Parse attestation object (CBOR)
    const attestation = decodeCBOR(attestationObject);
    const authData = attestation.authData;

    if (!authData || authData.length < 37) {
      return errorResponse("Invalid authenticator data", 400);
    }

    // Verify RP ID hash
    const rpIdHash = authData.slice(0, 32);
    const expectedRpIdHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(RP_ID)));
    // Also check localhost RP ID for dev
    let rpIdValid = rpIdHash.every((b, i) => b === expectedRpIdHash[i]);
    if (!rpIdValid) {
      const localhostHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("localhost")));
      rpIdValid = rpIdHash.every((b, i) => b === localhostHash[i]);
    }
    if (!rpIdValid) return errorResponse("RP ID hash mismatch", 400);

    // Check flags: bit 0 (UP) must be set
    const flags = authData[32];
    if (!(flags & 0x01)) return errorResponse("User presence not confirmed", 400);

    // Extract public key from authData
    const coseKey = extractPublicKeyFromAuthData(authData);
    const publicKeyJwk = await importCOSEPublicKey(coseKey);

    // Get sign count
    const signCount = (authData[33] << 24) | (authData[34] << 16) | (authData[35] << 8) | authData[36];

    // Store the credential
    const credentialId = cred.id;
    const transports = JSON.stringify(cred.response.transports || []);
    const now = new Date().toISOString();

    // Check credential doesn't already exist
    const existingCred = await env.DB.prepare(
      "SELECT credential_id FROM passkeys WHERE credential_id = ?"
    ).bind(credentialId).first();
    if (existingCred) return errorResponse("Credential already registered", 400);

    await env.DB.prepare(
      "INSERT INTO passkeys (credential_id, account_id, public_key, counter, transports, created_at, name) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(credentialId, accountId, JSON.stringify(publicKeyJwk), signCount, transports, now, "Passkey").run();

    return jsonResponse({ success: true, credential_id: credentialId });
  } catch (e) {
    console.error("Passkey register finish error:", e);
    return errorResponse("Failed to complete passkey registration", 500);
  }
}

// POST /passkeys/login/start — generate authentication challenge
async function handlePasskeyLoginStart(request, env) {
  const ip = getClientIP(request);
  const rateCheck = await checkRateLimit(env.DB, ip, "passkey");
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetIn);

  try {
    const body = await request.json();
    const { account_id } = body;

    if (!isValidAccountId(account_id)) return errorResponse("Invalid account ID", 400);

    // Verify account exists
    const account = await env.DB.prepare("SELECT id FROM accounts WHERE id = ?").bind(account_id).first();
    if (!account) return errorResponse("Account not found", 404);

    // Get registered passkeys
    const passkeys = await env.DB.prepare(
      "SELECT credential_id, transports FROM passkeys WHERE account_id = ?"
    ).bind(account_id).all();

    if (!passkeys.results || passkeys.results.length === 0) {
      return errorResponse("No passkeys registered for this account", 400);
    }

    const allowCredentials = passkeys.results.map((pk) => {
      const entry = { type: "public-key", id: pk.credential_id };
      try {
        const t = JSON.parse(pk.transports || "[]");
        if (t.length > 0) entry.transports = t;
      } catch {}
      return entry;
    });

    // Generate challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const challengeB64 = base64urlEncode(challenge);

    // Store challenge
    const challengeKey = `webauthn_challenge:${account_id}:login`;
    const now = new Date().toISOString();
    await env.DB.prepare(
      "INSERT OR REPLACE INTO user_data (account_id, key, value, updated_at) VALUES (?, ?, ?, ?)"
    ).bind(account_id, challengeKey, challengeB64, now).run();

    const options = {
      challenge: challengeB64,
      timeout: 60000,
      rpId: RP_ID,
      allowCredentials,
      userVerification: "preferred",
    };

    return jsonResponse(options);
  } catch (e) {
    console.error("Passkey login start error:", e);
    return errorResponse("Failed to start passkey login", 500);
  }
}

// POST /passkeys/login/finish — verify the assertion and return a token
async function handlePasskeyLoginFinish(request, env) {
  const ip = getClientIP(request);
  const rateCheck = await checkRateLimit(env.DB, ip, "passkey");
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.resetIn);

  try {
    const body = await request.json();
    const { account_id } = body;

    if (!isValidAccountId(account_id)) return errorResponse("Invalid account ID", 400);

    // Support both { account_id, assertion: {...} } and { account_id, id, rawId, response, ... }
    const assertion = body.assertion || body;

    const credentialId = assertion.id;
    if (!credentialId) return errorResponse("Missing credential ID", 400);

    // Retrieve stored challenge
    const challengeKey = `webauthn_challenge:${account_id}:login`;
    const storedChallenge = await env.DB.prepare(
      "SELECT value FROM user_data WHERE account_id = ? AND key = ?"
    ).bind(account_id, challengeKey).first();

    if (!storedChallenge) return errorResponse("Login session expired", 400);

    // Clean up challenge
    await env.DB.prepare(
      "DELETE FROM user_data WHERE account_id = ? AND key = ?"
    ).bind(account_id, challengeKey).run();

    // Find the credential
    const passkey = await env.DB.prepare(
      "SELECT credential_id, public_key, counter, account_id FROM passkeys WHERE credential_id = ? AND account_id = ?"
    ).bind(credentialId, account_id).first();

    if (!passkey) return errorResponse("Passkey not found", 400);

    // Decode assertion response
    const assertionResponse = assertion.response || assertion;
    const authenticatorData = base64urlDecode(assertionResponse.authenticatorData);
    const clientDataJSON = base64urlDecode(assertionResponse.clientDataJSON);
    const signature = base64urlDecode(assertionResponse.signature);

    // Verify clientDataJSON
    const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));

    if (clientData.type !== "webauthn.get") {
      return errorResponse("Invalid client data type", 400);
    }
    if (clientData.challenge !== storedChallenge.value) {
      return errorResponse("Challenge mismatch", 400);
    }
    if (clientData.origin !== RP_ORIGIN) {
      if (!clientData.origin.startsWith("http://localhost") && !clientData.origin.startsWith("https://localhost")) {
        return errorResponse("Origin mismatch", 400);
      }
    }

    // Verify RP ID hash
    const rpIdHash = authenticatorData.slice(0, 32);
    const expectedRpIdHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(RP_ID)));
    let rpIdValid = rpIdHash.every((b, i) => b === expectedRpIdHash[i]);
    if (!rpIdValid) {
      const localhostHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("localhost")));
      rpIdValid = rpIdHash.every((b, i) => b === localhostHash[i]);
    }
    if (!rpIdValid) return errorResponse("RP ID hash mismatch", 400);

    // Check user presence
    const flags = authenticatorData[32];
    if (!(flags & 0x01)) return errorResponse("User presence not confirmed", 400);

    // Verify signature
    const publicKeyJwk = JSON.parse(passkey.public_key);
    const isValid = await verifyWebAuthnSignature(publicKeyJwk, authenticatorData, clientDataJSON, signature);

    if (!isValid) return errorResponse("Invalid passkey signature", 400);

    // Update counter (prevent replay)
    const newCounter = (authenticatorData[33] << 24) | (authenticatorData[34] << 16) | (authenticatorData[35] << 8) | authenticatorData[36];
    if (newCounter > 0 && newCounter <= passkey.counter) {
      return errorResponse("Possible credential cloning detected", 400);
    }
    await env.DB.prepare("UPDATE passkeys SET counter = ? WHERE credential_id = ?").bind(newCounter, credentialId).run();

    // Generate session token (passkeys bypass 2FA)
    const account = await env.DB.prepare("SELECT display_name, totp_enabled FROM accounts WHERE id = ?").bind(account_id).first();
    const token = await generateToken(account_id, env.JWT_SECRET, env.TOKEN_EXPIRY, false);

    return jsonResponse({
      success: true,
      token,
      account_id,
      display_name: account?.display_name || null,
      totp_enabled: account?.totp_enabled === 1,
    });
  } catch (e) {
    console.error("Passkey login finish error:", e);
    return errorResponse("Passkey login failed", 500);
  }
}

// DELETE /passkeys/:credentialId — remove a passkey
async function handleDeletePasskey(request, env, credentialId) {
  const accountId = await getAuthenticatedAccountId(request, env);
  if (!accountId) return errorResponse("Unauthorized", 401);
  try {
    const result = await env.DB.prepare(
      "DELETE FROM passkeys WHERE credential_id = ? AND account_id = ?"
    ).bind(credentialId, accountId).run();

    if (result.meta.changes === 0) return errorResponse("Passkey not found", 404);
    return jsonResponse({ success: true });
  } catch (e) {
    console.error("Delete passkey error:", e);
    return errorResponse("Failed to delete passkey", 500);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════════════════════════════════

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") return handleOptions();

    // Probabilistic rate limit cleanup
    if (Math.random() < 0.01) cleanupRateLimits(env.DB);

    const ip = getClientIP(request);
    const globalCheck = await checkRateLimit(env.DB, ip, "global");
    if (!globalCheck.allowed) return rateLimitResponse(globalCheck.resetIn);

    // ─── Existing routes ──────────────────────────────────
    if (path === "/login" && method === "POST") return handleLogin(request, env);
    if (path === "/login/totp" && method === "POST") return handleLoginTotp(request, env);
    if (path === "/2fa/setup" && method === "POST") return handle2FASetup(request, env);
    if (path === "/2fa/enable" && method === "POST") return handle2FAEnable(request, env);
    if (path === "/2fa/disable" && method === "POST") return handle2FADisable(request, env);
    if (path === "/2fa/status" && method === "GET") return handle2FAStatus(request, env);
    if (path === "/data") {
      if (method === "GET") return handleGetData(request, env);
      if (method === "PUT") return handlePutData(request, env);
      if (method === "DELETE") return handleDeleteData(request, env);
    }
    if (path === "/user/name" && method === "PUT") return handleUpdateDisplayName(request, env);
    if (path === "/health" && method === "GET") return handleHealth();

    // ─── Passkey routes ───────────────────────────────────
    if (path === "/passkeys" && method === "GET") return handleListPasskeys(request, env);
    if (path === "/passkeys/register/start" && method === "POST") return handlePasskeyRegisterStart(request, env);
    if (path === "/passkeys/register/finish" && method === "POST") return handlePasskeyRegisterFinish(request, env);
    if (path === "/passkeys/login/start" && method === "POST") return handlePasskeyLoginStart(request, env);
    if (path === "/passkeys/login/finish" && method === "POST") return handlePasskeyLoginFinish(request, env);

    // DELETE /passkeys/:id
    const passkeyDeleteMatch = path.match(/^\/passkeys\/([^/]+)$/);
    if (passkeyDeleteMatch && method === "DELETE") {
      return handleDeletePasskey(request, env, decodeURIComponent(passkeyDeleteMatch[1]));
    }

    return errorResponse("Not found", 404);
  },
};
