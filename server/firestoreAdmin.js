const PROJECT_ID = 'hems-transport';

// Uses the signed-in user's Firebase ID token to read their own Firestore
// users/{uid} document. No service-account/private-key file is required.
export async function getFirestoreUser(uid, idToken) {
  if (!idToken) throw new Error('Missing Firebase ID token for Firestore role lookup.');
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  if (response.status === 404) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Firestore role lookup failed: ${data.error?.message || response.status}`);
  const fields = data.fields || {};
  const role = fields.role?.stringValue || 'USER';
  return {
    uid,
    role: String(role).toUpperCase(),
    email: fields.email?.stringValue || '',
    displayName: fields.displayName?.stringValue || ''
  };
}
