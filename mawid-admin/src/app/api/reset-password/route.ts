import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

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
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { uid, newPassword } = await req.json();
    if (!uid || !newPassword) {
      return NextResponse.json({ error: 'uid and newPassword are required' }, { status: 400 });
    }
    await admin.auth().updateUser(uid, { password: newPassword });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
