
/**
 * Utility functions for WebAuthn (Passkeys)
 */

// Helper to convert base64url to Uint8Array
function base64urlToUint8Array(base64url: string): Uint8Array {
    const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
    const base64 = base64url
        .replace(/-/g, '+')
        .replace(/_/g, '/') + padding;
    const str = atob(base64);
    const buffer = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        buffer[i] = str.charCodeAt(i);
    }
    return buffer;
}

// Helper to convert Uint8Array to base64url
function uint8ArrayToBase64url(buffer: Uint8Array): string {
    const str = String.fromCharCode(...buffer);
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Start the WebAuthn registration process
 */
export async function startRegistration(options: any) {
    // Convert options from the server to the format expected by the browser
    const createOptions: PublicKeyCredentialCreationOptions = {
        ...options,
        challenge: base64urlToUint8Array(options.challenge),
        user: {
            ...options.user,
            id: base64urlToUint8Array(options.user.id),
        },
        excludeCredentials: options.excludeCredentials?.map((cred: any) => ({
            ...cred,
            id: base64urlToUint8Array(cred.id),
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
            attestationObject: uint8ArrayToBase64url(new Uint8Array(response.attestationObject)),
            clientDataJSON: uint8ArrayToBase64url(new Uint8Array(response.clientDataJSON)),
        },
        clientExtensionResults: credential.getClientExtensionResults(),
    };
}

/**
 * Start the WebAuthn authentication process
 */
export async function startAuthentication(options: any) {
    // Convert options from the server to the format expected by the browser
    const getOptions: PublicKeyCredentialRequestOptions = {
        ...options,
        challenge: base64urlToUint8Array(options.challenge),
        allowCredentials: options.allowCredentials?.map((cred: any) => ({
            ...cred,
            id: base64urlToUint8Array(cred.id),
        })),
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
            authenticatorData: uint8ArrayToBase64url(new Uint8Array(response.authenticatorData)),
            clientDataJSON: uint8ArrayToBase64url(new Uint8Array(response.clientDataJSON)),
            signature: uint8ArrayToBase64url(new Uint8Array(response.signature)),
            userHandle: response.userHandle ? uint8ArrayToBase64url(new Uint8Array(response.userHandle)) : null,
        },
        clientExtensionResults: credential.getClientExtensionResults(),
    };
}
