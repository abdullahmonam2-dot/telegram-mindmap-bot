'use server';

import * as admin from 'firebase-admin';
import { Appointment } from '@/lib/types';

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

/**
 * Creates a password reset recovery request securely on the server to bypass client-side database rules.
 */
export async function createRecoveryRequestServer(phone: string, name: string) {
  if (initError) {
    return { success: false, error: `فشل تهيئة Firebase Admin: ${initError.message}` };
  }
  if (!admin.apps.length) {
    return { success: false, error: 'تطبيق Firebase Admin غير متاح حالياً.' };
  }

  try {
    const id = `reset-${Date.now()}`;
    await admin.database().ref(`passwordResets/${id}`).set({
      id,
      phone,
      name,
      createdAt: new Date().toISOString(),
      status: 'pending'
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error creating recovery request:', error);
    return { success: false, error: error.message };
  }
}

export async function validateAndUseActivationCodeServer(code: string): Promise<boolean> {
  const { verifyMasterCode } = await import('./security');
  if (await verifyMasterCode(code)) return true;

  if (initError || !admin.apps.length) return false;

  try {
    const codeRef = admin.database().ref(`activationCodes/${code}`);
    const snapshot = await codeRef.once('value');
    if (!snapshot.exists()) return false;
    
    const data = snapshot.val();
    if (data.used) return false;
    
    await codeRef.update({
      used: true,
      usedAt: new Date().toISOString()
    });
    return true;
  } catch (e) {
    console.error("Activation code validation error:", e);
    return false;
  }
}

export async function secureAddAppointment(appointment: Omit<Appointment, 'id'>) {
  if (initError) {
    return { success: false, error: `فشل تهيئة Firebase Admin: ${initError.message}` };
  }
  if (!admin.apps.length) {
    return { success: false, error: 'تطبيق Firebase Admin غير متاح حالياً.' };
  }

  try {
    const db = admin.database();
    const ref = db.ref('appointments');

    // Query all appointments for this doctor to calculate sequence number
    const snapshot = await ref.orderByChild('doctorId').equalTo(appointment.doctorId).once('value');
    let sequenceNumber = 1;
    if (snapshot.exists()) {
      const all = Object.values(snapshot.val()) as any[];
      // Daily sequence number: count non-cancelled appointments for the same date
      const forDate = all.filter(a => a.date === appointment.date && a.status !== 'cancelled');
      sequenceNumber = forDate.length + 1;
    }

    // Generate new unique ID
    const newAptRef = ref.push();
    const newId = newAptRef.key;

    const fullAppointment = {
      ...appointment,
      id: newId,
      sequenceNumber,
    };

    await newAptRef.set(fullAppointment);
    return { success: true, appointment: fullAppointment };
  } catch (error: any) {
    console.error('Error in secureAddAppointment:', error);
    return { success: false, error: error.message };
  }
}
