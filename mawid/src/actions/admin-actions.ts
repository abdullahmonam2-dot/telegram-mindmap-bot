'use server';

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://mawid-iraqi-default-rtdb.firebaseio.com',
    });
  } catch (error) {
    console.error('Firebase Admin init error:', error);
  }
}

/**
 * Resets a user's password using Firebase Admin SDK.
 * Note: This requires FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to be set in environment variables.
 */
export async function resetUserPassword(uid: string, newPassword: string) {
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
