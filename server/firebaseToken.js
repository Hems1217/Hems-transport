import crypto from 'crypto';

const PROJECT_ID = 'hems-transport';
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts = null;
let certsExpiresAt = 0;

function base64UrlToBuffer(value) {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '='), 'base64');
}

function decodeJwt(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('Invalid Firebase ID token format.');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlToBuffer(encodedHeader).toString('utf8'));
    payload = JSON.parse(base64UrlToBuffer(encodedPayload).toString('utf8'));
  } catch {
    throw new Error('Invalid Firebase ID token encoding.');
  }
  return { encodedHeader, encodedPayload, encodedSignature, header, payload };
}

async function getCerts() {
  const now = Date.now();
  if (cachedCerts && now < certsExpiresAt) return cachedCerts;

  const response = await fetch(CERTS_URL);
  if (!response.ok) throw new Error(`Unable to retrieve Google's Firebase signing certificates (${response.status}).`);

  const certs = await response.json();
  cachedCerts = certs;

  const cacheControl = response.headers.get('cache-control') || '';
  const match = cacheControl.match(/max-age=(\d+)/i);
  const maxAge = match ? Number(match[1]) * 1000 : 60 * 60 * 1000;
  certsExpiresAt = now + Math.max(60_000, maxAge);

  return certs;
}

export async function verifyFirebaseIdToken(token) {
  const { encodedHeader, encodedPayload, encodedSignature, header, payload } = decodeJwt(token);

  if (header.alg !== 'RS256' || header.typ !== 'JWT') {
    throw new Error('Unsupported Firebase ID token algorithm.');
  }

  if (!header.kid) throw new Error('Firebase ID token has no signing key ID.');

  if (payload.aud !== PROJECT_ID) throw new Error('Firebase ID token belongs to a different Firebase project.');
  if (payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) throw new Error('Invalid Firebase token issuer.');
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length > 128) throw new Error('Invalid Firebase user ID.');

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= now) throw new Error('Firebase ID token has expired.');
  if (typeof payload.iat !== 'number' || payload.iat > now + 300) throw new Error('Firebase ID token was issued in the future.');

  const certs = await getCerts();
  const certificate = certs[header.kid];
  if (!certificate) {
    cachedCerts = null;
    certsExpiresAt = 0;
    const refreshed = await getCerts();
    if (!refreshed[header.kid]) throw new Error('Firebase signing key is not available.');
  }

  const finalCertificate = certificate || certs[header.kid];
  const publicKey = crypto.createPublicKey(finalCertificate);
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  if (!verifier.verify(publicKey, base64UrlToBuffer(encodedSignature))) {
    throw new Error('Firebase ID token signature is invalid.');
  }

  return payload;
}
