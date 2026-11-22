const PROJECT_ID = 'hems-transport';

export async function getFirestoreUser(uid, idToken, email = '') {
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!idToken) {
    return {
      uid,
      role: 'USER',
      email: cleanEmail,
      displayName: '',
      fromFirestore: false
    };
  }

  const headers = {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  };

  const candidatePaths = [
    `users/${encodeURIComponent(uid)}`,
    ...(cleanEmail ? [`users/${encodeURIComponent(cleanEmail)}`] : [])
  ];

  for (const docPath of candidatePaths) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`;
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data && data.fields) {
          const role = String(data.fields.role?.stringValue || '').trim().toLowerCase();
          if (role === 'admin' || role === 'user') {
            const normalized = role === 'admin' ? 'ADMIN' : 'USER';
            console.log(`[FIRESTORE] Confirmed ${normalized} from ${docPath} for ${cleanEmail || uid}`);
            return {
              uid,
              role: normalized,
              email: cleanEmail,
              displayName: data.fields.displayName?.stringValue || data.fields.name?.stringValue || '',
              fromFirestore: true
            };
          }
        }
      }
    } catch (err) {}
  }

  return {
    uid,
    role: 'USER',
    email: cleanEmail,
    displayName: '',
    fromFirestore: false
  };
}
