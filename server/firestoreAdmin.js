const PROJECT_ID = 'hems-transport';

const ADMIN_EMAILS = [
  'hemuelibabao@gmail.com',
  'ibabaohemuel@gmail.com',
  'admin@hems.ph'
];

export async function getFirestoreUser(uid, idToken, email = '') {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const isRegisteredAdmin = cleanEmail && ADMIN_EMAILS.includes(cleanEmail);

  if (!idToken) {
    return {
      uid,
      role: isRegisteredAdmin ? 'ADMIN' : 'USER',
      email: cleanEmail,
      displayName: ''
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
          if (role === 'admin') {
            console.log(`[FIRESTORE] Confirmed ADMIN from ${docPath} for ${cleanEmail || uid}`);
            return {
              uid,
              role: 'ADMIN',
              email: cleanEmail,
              displayName: data.fields.displayName?.stringValue || data.fields.name?.stringValue || ''
            };
          } else if (role === 'user') {
            console.log(`[FIRESTORE] Confirmed USER from ${docPath} for ${cleanEmail || uid}`);
            return {
              uid,
              role: 'USER',
              email: cleanEmail,
              displayName: data.fields.displayName?.stringValue || data.fields.name?.stringValue || ''
            };
          }
        }
      }
    } catch (err) {}
  }

  return {
    uid,
    role: isRegisteredAdmin ? 'ADMIN' : 'USER',
    email: cleanEmail,
    displayName: ''
  };
}
