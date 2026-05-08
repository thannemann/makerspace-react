/**
 * firebase.ts
 *
 * Firebase Authentication using the REST API only — no SDK required.
 * Avoids Node/TypeScript version incompatibilities with the Firebase npm package.
 *
 * Flow:
 *  1. Call createAuthUri to get the provider OAuth URL
 *  2. Redirect browser to that URL
 *  3. Provider redirects back to /auth/callback
 *  4. Call signInWithIdp to exchange for a Firebase ID token
 *  5. POST the ID token to Rails /api/auth/firebase_login
 *
 * Required env vars (webpack build time):
 *   FIREBASE_API_KEY       — Firebase console > Project settings > Web app
 *   FIREBASE_APPLE_ENABLED — "true" to show Apple button
 */

const API_KEY = process.env.FIREBASE_API_KEY || '';
const BASE    = 'https://identitytoolkit.googleapis.com/v1';

const PROVIDERS: Record<string, string> = {
  google:    'google.com',
  apple:     'apple.com',
  github:    'github.com',
  microsoft: 'microsoft.com',
};

export type ProviderKey = 'google' | 'apple' | 'github' | 'microsoft';

/**
 * Redirect the browser to the provider OAuth page.
 * Stores sessionId so completeProviderSignIn can finish the flow.
 */
export const initiateProviderSignIn = async (provider: ProviderKey): Promise<void> => {
  if (!API_KEY) {
    throw new Error('Firebase is not configured. Set FIREBASE_API_KEY in your environment.');
  }

  const continueUri = `${window.location.origin}/auth/callback`;
  const providerId  = PROVIDERS[provider];

  const response = await fetch(
    `${BASE}/accounts:createAuthUri?key=${API_KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId,
        continueUri,
        ...(provider === 'microsoft' ? { oauthScope: 'email profile' } : {}),
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err && err.error && err.error.message) || 'Failed to initiate sign in');
  }

  const data = await response.json();
  sessionStorage.setItem('firebase_session_id', data.sessionId);
  sessionStorage.setItem('firebase_provider',   provider);
  window.location.href = data.authUri;
};

/**
 * Complete the OAuth flow after provider redirect.
 * Call from the /auth/callback route component.
 * Returns a Firebase ID token.
 */
export const completeProviderSignIn = async (): Promise<string> => {
  const requestUri = window.location.href;
  const sessionId  = sessionStorage.getItem('firebase_session_id');

  if (!sessionId) {
    throw new Error('No Firebase session found. Please try signing in again.');
  }

  sessionStorage.removeItem('firebase_session_id');
  sessionStorage.removeItem('firebase_provider');

  const response = await fetch(
    `${BASE}/accounts:signInWithIdp?key=${API_KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestUri,
        sessionId,
        returnIdpCredential: true,
        returnSecureToken:   true,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err && err.error && err.error.message) || 'Sign in failed');
  }

  const data = await response.json();
  return data.idToken;
};

// Convenience wrappers
export const signInWithGoogle    = () => initiateProviderSignIn('google');
export const signInWithApple     = () => initiateProviderSignIn('apple');
export const signInWithGitHub    = () => initiateProviderSignIn('github');
export const signInWithMicrosoft = () => initiateProviderSignIn('microsoft');

export const firebaseSignOut = async (): Promise<void> => {
  sessionStorage.removeItem('firebase_session_id');
  sessionStorage.removeItem('firebase_provider');
};
