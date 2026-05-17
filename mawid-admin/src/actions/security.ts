'use server';

// This file runs ONLY on the server, hiding the master code from the client bundle.
const MASTER_CODE = process.env.ADMIN_MASTER_CODE || 'SHAHAMA_ADMIN_2024';

// Add a simple delay to slow down brute-force attacks
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function verifyAdminPassword(password: string): Promise<boolean> {
  await delay(500); // 500ms delay protects against rapid brute-force attempts
  return password === MASTER_CODE;
}

export async function verifyMasterCode(code: string): Promise<boolean> {
  await delay(500);
  return code === MASTER_CODE;
}
