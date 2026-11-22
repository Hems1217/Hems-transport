const PROJECT_ID = 'hems-transport';

function extractFirestoreProfile(fields, uid, cleanEmail, sourceLabel) {
  if (!fields) return null;
  const role = String(fields.role?.stringValue || '').trim().toLowerCase();
  if (role !== 'admin' && role !== 'user') return null;

  const normalized = role === 'admin' ? 'ADMIN' : 'USER';
  console.log(`[FIRESTORE] Confirmed ${normalized} from ${sourceLabel} for ${cleanEmail || uid}`);
  return {
    uid,
    role: normalized,
    email: cleanEmail,
    displayName: fields.displayName?.stringValue || fields.name?.stringValue || '',
    fromFirestore: true
  };
}

export async function getFirestoreUser(uid, idToken, email = '') {
  const rawEmail = String(email || '').trim();
  const cleanEmail = rawEmail.toLowerCase();

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
        const matched = extractFirestoreProfile(data?.fields, uid, cleanEmail, docPath);
        if (matched) return matched;
      }
    } catch {}
  }

  const emailQueries = [...new Set([cleanEmail, rawEmail].filter(Boolean))];
  const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  for (const emailValue of emailQueries) {
    try {
      const response = await fetch(queryUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'users' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'email' },
                op: 'EQUAL',
                value: { stringValue: emailValue }
              }
            },
            limit: 5
          }
        })
      });
      if (response.ok) {
        const rows = await response.json().catch(() => []);
        if (Array.isArray(rows)) {
          for (const row of rows) {
            const matched = extractFirestoreProfile(row?.document?.fields, uid, cleanEmail, 'users:runQuery');
            if (matched) return matched;
          }
        }
      }
    } catch {}
  }

  return {
    uid,
    role: 'USER',
    email: cleanEmail,
    displayName: '',
    fromFirestore: false
  };
}
