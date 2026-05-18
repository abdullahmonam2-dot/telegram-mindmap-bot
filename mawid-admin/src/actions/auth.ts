'use server';

import * as admin from 'firebase-admin';

let initError: any = null;

function cleanPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  let cleaned = key.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.substring(1, cleaned.length - 1);
  else if (cleaned.startsWith("'") && cleaned.endsWith("'")) cleaned = cleaned.substring(1, cleaned.length - 1);
  cleaned = cleaned.trim().replace(/\\n/g, '\n');
  if (cleaned.includes('-----BEGIN PRIVATE KEY-----')) {
    const startIdx = cleaned.indexOf('-----BEGIN PRIVATE KEY-----');
    const endIdx = cleaned.indexOf('-----END PRIVATE KEY-----');
    if (startIdx !== -1 && endIdx !== -1) {
      cleaned = cleaned.substring(startIdx, endIdx + '-----END PRIVATE KEY-----'.length);
    }
  }
  return cleaned;
}

if (!admin.apps.length) {
  try {
    const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
    if (!privateKey) throw new Error("FIREBASE_PRIVATE_KEY is missing or invalid");

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://mawid-iraqi-default-rtdb.firebaseio.com',
    });
  } catch (error) {
    initError = error;
    console.error("Firebase Admin Init Error:", error);
  }
}

export async function verifyAdminPassword(password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  const correctPassword = process.env.ADMIN_SECRET_PASSWORD || 'mawid@admin2025';
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (password === correctPassword) {
    if (initError || !admin.apps.length) {
       console.error("Cannot generate token, admin SDK not initialized.", initError);
       return { success: false, error: "Firebase Admin Error: " + (initError ? initError.message : "Not initialized. Check Env variables.") };
    }
    try {
      const token = await admin.auth().createCustomToken('mawid-admin-user', { admin: true });
      return { success: true, token };
    } catch (e: any) {
      console.error("Error creating custom token:", e);
      return { success: false, error: e.message };
    }
  }
  return { success: false };
}
