'use server';

import * as admin from 'firebase-admin';

let initError: any = null;

// Helper function to robustly clean and extract a PEM private key
function cleanPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  
  let cleaned = key.trim();
  
  // Strip any wrapping double or single quotes
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  } else if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  
  cleaned = cleaned.trim();
  
  // Replace literal '\n' characters with actual newlines
  cleaned = cleaned.replace(/\\n/g, '\n');
  
  // Robustly isolate the PEM key block to strip any leading/trailing quote residues or newlines
  if (cleaned.includes('-----BEGIN PRIVATE KEY-----')) {
    const startIdx = cleaned.indexOf('-----BEGIN PRIVATE KEY-----');
    const endIdx = cleaned.indexOf('-----END PRIVATE KEY-----');
    if (startIdx !== -1 && endIdx !== -1) {
      cleaned = cleaned.substring(startIdx, endIdx + '-----END PRIVATE KEY-----'.length);
    }
  }
  
  return cleaned;
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      databaseURL: 'https://mawid-iraqi-default-rtdb.firebaseio.com',
    });
  } catch (error: any) {
    console.error('Firebase Admin init error:', error);
    initError = error;
  }
}

/**
 * Resets a user's password using Firebase Admin SDK.
 * Note: This requires FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to be set in environment variables.
 */
export async function resetUserPassword(uid: string, newPassword: string) {
  if (initError) {
    return { success: false, error: `فشل تهيئة Firebase Admin: ${initError.message}` };
  }
  try {
    // Safety check: ensure admin-level variables are present
    if (!process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('لم يتم إعداد ملف الـ Service Account في النظام بعد. يرجى التواصل مع المطور.');
    }

    await admin.auth().updateUser(uid, {
      password: newPassword,
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Deletes a user from Firebase Auth.
 */
export async function deleteUserFromAuth(uid: string) {
  if (initError) {
    return { success: false, error: `فشل تهيئة Firebase Admin: ${initError.message}` };
  }
  try {
    if (!process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('Service Account not configured');
    }
    await admin.auth().deleteUser(uid);
    return { success: true };
  } catch (error: any) {
    console.error('Delete user error:', error);
    return { success: false, error: error.message };
  }
}
