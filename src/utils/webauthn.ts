/**
 * Utility functions for WebAuthn (Passkeys)
 */

type BinaryLike = string | BufferSource | null | undefined;

interface PublicKeyOptionsEnvelope<T> {
  publicKey?: T;
  options?: T | { publicKey?: T };
}

// Helper to convert base64/base64url to Uint8Array
function base64urlToUint8Array(base64url: string): Uint8Array {
  const normalized = base64url.trim();
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const base64 = normalized.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const str = atob(base64);
  const buffer = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    buffer[i] = str.charCodeAt(i);
  }
  return buffer;
}

function toBufferSource(value: BinaryLike): ArrayBuffer {
  if (value == null) return new ArrayBuffer(0);
  if (typeof value === "string") {
    const decoded = base64urlToUint8Array(value);
    return decoded.buffer.slice(
      decoded.byteOffset,
      decoded.byteOffset + decoded.byteLength,
    ) as ArrayBuffer;
  }
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) {
    return value.buffer.slice(
      value.byteOffset,
      value.byteOffset + value.byteLength,
    ) as ArrayBuffer;
  }
  throw new Error("Unsupported binary value in WebAuthn options");
}

function normalizePublicKeyOptions<
  T extends
    | PublicKeyCredentialCreationOptions
    | PublicKeyCredentialRequestOptions,
>(input: T | PublicKeyOptionsEnvelope<T>): T {
  const envelope = input as PublicKeyOptionsEnvelope<T>;

  if (envelope.publicKey) return envelope.publicKey;

  if (envelope.options) {
    const nestedOptions = envelope.options as T | { publicKey?: T };
    if ("publicKey" in nestedOptions && nestedOptions.publicKey) {
      return nestedOptions.publicKey;
    }
    return nestedOptions as T;
  }

  return input as T;
}

function ensureWebAuthnAvailable() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    throw new Error("WebAuthn is not available in this environment");
  }
  if (!window.isSecureContext) {
    throw new Error("Passkeys require a secure context (HTTPS or localhost)");
  }
  if (
    !("credentials" in navigator) ||
    typeof navigator.credentials?.create !== "function" ||
    typeof navigator.credentials?.get !== "function"
  ) {
    throw new Error("This browser does not support passkeys");
  }
}

// Helper to convert Uint8Array to base64url
function uint8ArrayToBase64url(buffer: Uint8Array): string {
  // Chunk to avoid call stack/argument limits on large buffers.
  let str = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < buffer.length; i += chunkSize) {
    str += String.fromCharCode(...buffer.subarray(i, i + chunkSize));
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Start the WebAuthn registration process
 */
export async function startRegistration(
  options:
    | PublicKeyCredentialCreationOptions
    | PublicKeyOptionsEnvelope<PublicKeyCredentialCreationOptions>,
) {
  ensureWebAuthnAvailable();
  const rawOptions = normalizePublicKeyOptions(options);

  // Convert options from the server to the format expected by the browser
  const createOptions: PublicKeyCredentialCreationOptions = {
    ...rawOptions,
    challenge: toBufferSource(rawOptions.challenge),
    user: {
      ...rawOptions.user,
      id: toBufferSource(rawOptions.user.id),
    },
    excludeCredentials: rawOptions.excludeCredentials?.map((cred) => ({
      ...cred,
      id: toBufferSource(cred.id),
    })),
  };

  const credential = (await navigator.credentials.create({
    publicKey: createOptions,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error("Failed to create credential");
  }

  const response = credential.response as AuthenticatorAttestationResponse;

  // Convert the response to a format that can be sent to the server
  return {
    id: credential.id,
    rawId: uint8ArrayToBase64url(new Uint8Array(credential.rawId)),
    type: credential.type,
    response: {
      attestationObject: uint8ArrayToBase64url(
        new Uint8Array(response.attestationObject),
      ),
      clientDataJSON: uint8ArrayToBase64url(
        new Uint8Array(response.clientDataJSON),
      ),
      transports: response.getTransports ? response.getTransports() : [],
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

/**
 * Start the WebAuthn authentication process
 */
export async function startAuthentication(
  options:
    | PublicKeyCredentialRequestOptions
    | PublicKeyOptionsEnvelope<PublicKeyCredentialRequestOptions>,
) {
  ensureWebAuthnAvailable();
  const rawOptions = normalizePublicKeyOptions(options);

  // Convert options from the server to the format expected by the browser
  const getOptions: PublicKeyCredentialRequestOptions = {
    ...rawOptions,
    challenge: toBufferSource(rawOptions.challenge),
    allowCredentials: rawOptions.allowCredentials?.length
      ? rawOptions.allowCredentials.map((cred) => ({
          ...cred,
          id: toBufferSource(cred.id),
        }))
      : undefined,
  };

  const credential = (await navigator.credentials.get({
    publicKey: getOptions,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error("Failed to get credential");
  }

  const response = credential.response as AuthenticatorAssertionResponse;

  // Convert the response to a format that can be sent to the server
  return {
    id: credential.id,
    rawId: uint8ArrayToBase64url(new Uint8Array(credential.rawId)),
    type: credential.type,
    response: {
      authenticatorData: uint8ArrayToBase64url(
        new Uint8Array(response.authenticatorData),
      ),
      clientDataJSON: uint8ArrayToBase64url(
        new Uint8Array(response.clientDataJSON),
      ),
      signature: uint8ArrayToBase64url(new Uint8Array(response.signature)),
      userHandle: response.userHandle
        ? uint8ArrayToBase64url(new Uint8Array(response.userHandle))
        : null,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}
