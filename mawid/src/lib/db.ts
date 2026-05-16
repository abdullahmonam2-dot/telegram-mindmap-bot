import { db } from './firebase';
import { 
  ref, 
  set, 
  get, 
  push, 
  update, 
  remove, 
  query, 
  orderByChild, 
  equalTo,
  onValue
} from 'firebase/database';
import { Doctor, Appointment, User } from './types';

// USERS
export const saveUser = async (user: User) => {
  await set(ref(db, `users/${user.uid}`), user);
};

export const getUser = async (uid: string): Promise<User | null> => {
  const snapshot = await get(ref(db, `users/${uid}`));
  return snapshot.exists() ? snapshot.val() as User : null;
};

// DOCTORS
export const addDoctor = async (doctor: Omit<Doctor, 'id'>, secretaryPhone?: string) => {
  const newRef = push(ref(db, 'doctors'));
  const id = newRef.key!;
  const docWithId = { ...doctor, id, secretaryPhone };
  await set(newRef, docWithId);
  return id;
};

export const getDoctors = async (): Promise<Doctor[]> => {
  const snapshot = await get(ref(db, 'doctors'));
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val()) as Doctor[];
};

export const getDoctor = async (id: string): Promise<Doctor | null> => {
  const snapshot = await get(ref(db, `doctors/${id}`));
  return snapshot.exists() ? snapshot.val() as Doctor : null;
};

export const getDoctorsBySecretary = async (secretaryId: string): Promise<Doctor[]> => {
  const doctorsRef = ref(db, 'doctors');
  const q = query(doctorsRef, orderByChild('secretaryId'), equalTo(secretaryId));
  const snapshot = await get(q);
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val()) as Doctor[];
};

export const relinkDoctorsByPhone = async (phone: string, newSecretaryId: string) => {
  const doctorsRef = ref(db, 'doctors');
  const snapshot = await get(doctorsRef);
  if (!snapshot.exists()) return;
  
  const doctors = snapshot.val();
  const updates: any = {};
  
  Object.keys(doctors).forEach(id => {
    const doc = doctors[id];
    // Relink if the phone matches (we check multiple possible phone fields for robustness)
    if (doc.secretaryPhone === phone || doc.phone === phone) {
      updates[`doctors/${id}/secretaryId`] = newSecretaryId;
      updates[`doctors/${id}/secretaryPhone`] = phone; // Ensure it's set for future
    }
  });
  
  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }
};

export const updateDoctor = async (id: string, data: Partial<Doctor>) => {
  await update(ref(db, `doctors/${id}`), data);
};

export const deleteDoctor = async (id: string) => {
  await remove(ref(db, `doctors/${id}`));
};

// APPOINTMENTS
export const addAppointment = async (appointment: Omit<Appointment, 'id'>) => {
  const newRef = push(ref(db, 'appointments'));
  const id = newRef.key!;
  const aptWithId = { ...appointment, id };
  await set(newRef, aptWithId);
  return id;
};

export const getAppointmentsByPatient = async (patientId: string): Promise<Appointment[]> => {
  const appointmentsRef = ref(db, 'appointments');
  const q = query(appointmentsRef, orderByChild('patientId'), equalTo(patientId));
  const snapshot = await get(q);
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val()) as Appointment[];
};

export const getAppointmentsBySecretaryDoctors = async (doctorIds: string[]): Promise<Appointment[]> => {
  const snapshot = await get(ref(db, 'appointments'));
  if (!snapshot.exists()) return [];
  const all = Object.values(snapshot.val()) as Appointment[];
  return all.filter(a => doctorIds.includes(a.doctorId)).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const listenToSecretaryAppointments = (doctorIds: string[], callback: (apts: Appointment[]) => void) => {
  const appointmentsRef = ref(db, 'appointments');
  return onValue(appointmentsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const all = Object.values(snapshot.val()) as Appointment[];
    const filtered = all.filter(a => doctorIds.includes(a.doctorId)).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    callback(filtered);
  });
};

export const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
  await update(ref(db, `appointments/${id}`), { status });
};

export const checkSlotAvailability = async (doctorId: string, date: string, time: string): Promise<boolean> => {
  const snapshot = await get(ref(db, 'appointments'));
  if (!snapshot.exists()) return true;
  const all = Object.values(snapshot.val()) as Appointment[];
  const exists = all.find(a => 
    a.doctorId === doctorId && 
    a.date === date && 
    a.time === time && 
    a.status !== 'cancelled'
  );
  return !exists;
};

export const validateAndUseActivationCode = async (code: string): Promise<boolean> => {
  const { verifyMasterCode } = await import('@/actions/security');
  // Check if it matches the master code (for your emergency use) securely on the server
  if (await verifyMasterCode(code)) return true;

  const codeRef = ref(db, `activationCodes/${code}`);
  const snapshot = await get(codeRef);
  
  if (!snapshot.exists()) return false;
  
  const data = snapshot.val();
  if (data.used) return false;

  // Mark as used
  await update(codeRef, { 
    used: true, 
    usedAt: new Date().toISOString() 
  });
  
  return true;
};

export const listenToPatientAppointments = (patientId: string, callback: (apts: Appointment[]) => void) => {
  const appointmentsRef = ref(db, 'appointments');
  return onValue(appointmentsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const all = Object.values(snapshot.val()) as Appointment[];
    const filtered = all.filter(a => a.patientId === patientId).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    callback(filtered);
  });
};

export const generateActivationCode = async (): Promise<string> => {
  const code = 'MAWID-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  await update(ref(db, `activationCodes/${code}`), {
    used: false,
    createdAt: new Date().toISOString()
  });
  return code;
};

export const getAllActivationCodes = async (): Promise<any[]> => {
  const snapshot = await get(ref(db, 'activationCodes'));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.keys(data).map(key => ({
    code: key,
    ...data[key]
  })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const addAd = async (ad: { title: string; description: string; imageUrl: string; linkUrl?: string }) => {
  const id = `ad-${Date.now()}`;
  await set(ref(db, `ads/${id}`), {
    ...ad,
    id,
    createdAt: Date.now(),
  });
};

export const getAllAds = async (): Promise<any[]> => {
  const snapshot = await get(ref(db, 'ads'));
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val());
};

export const getAdminStats = async () => {
  const usersSnap = await get(ref(db, 'users'));
  const doctorsSnap = await get(ref(db, 'doctors'));
  const apptsSnap = await get(ref(db, 'appointments'));
  
  return {
    totalUsers: usersSnap.exists() ? Object.keys(usersSnap.val()).length : 0,
    totalDoctors: doctorsSnap.exists() ? Object.keys(doctorsSnap.val()).length : 0,
    totalAppointments: apptsSnap.exists() ? Object.keys(apptsSnap.val()).length : 0
  };
};

export const deleteAd = async (id: string) => {
  await remove(ref(db, `ads/${id}`));
};

export const getUsers = async (): Promise<User[]> => {
  const snapshot = await get(ref(db, 'users'));
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val()) as User[];
};

export const deleteUser = async (uid: string) => {
  await remove(ref(db, `users/${uid}`));
};

export const resetDatabase = async () => {
  const nodes = ['users', 'doctors', 'appointments', 'ads', 'activationCodes', 'messages'];
  await Promise.all(nodes.map(node => remove(ref(db, node))));
};
export const cleanupOldAppointments = async () => {
  try {
    const snapshot = await get(ref(db, 'appointments'));
    if (!snapshot.exists()) return;
    
    const appointments = snapshot.val();
    const now = new Date();
    // Reset time to start of day for accurate day-based comparison
    now.setHours(0, 0, 0, 0);
    
    const oneDayInMs = 24 * 60 * 60 * 1000;
    
    const deletions = Object.keys(appointments).filter(id => {
      const apt = appointments[id];
      if (!apt.date) return false;
      
      const aptDate = new Date(apt.date);
      aptDate.setHours(0, 0, 0, 0);
      
      // Delete if appointment date was more than 1 day ago
      // (e.g., if today is May 17, and apt was May 15, it's > 1 day old)
      return (now.getTime() - aptDate.getTime()) > oneDayInMs;
    }).map(id => remove(ref(db, `appointments/${id}`)));
    
    if (deletions.length > 0) {
      console.log(`Cleaning up ${deletions.length} old appointments...`);
      await Promise.all(deletions);
    }
  } catch (err) {
    console.error("Cleanup error:", err);
  }
};
export const createPasswordResetRequest = async (phone: string, name: string) => {
  const id = `reset-${Date.now()}`;
  await set(ref(db, `passwordResets/${id}`), {
    id,
    phone,
    name,
    createdAt: new Date().toISOString(),
    status: 'pending'
  });
};

export const getPasswordResetRequests = async (): Promise<any[]> => {
  const snapshot = await get(ref(db, 'passwordResets'));
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val()).sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const deletePasswordResetRequest = async (id: string) => {
  await remove(ref(db, `passwordResets/${id}`));
};
