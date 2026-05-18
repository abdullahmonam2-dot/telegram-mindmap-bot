const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Parse .env.local manually
const envPath = path.resolve(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local not found');
  process.exit(1);
}
const envContent = fs.readFileSync(envPath, 'utf8');
const processEnv = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.substring(1, val.length - 1);
    }
    processEnv[key] = val;
  }
});

let key = processEnv.FIREBASE_PRIVATE_KEY;
if (key) {
  key = key.replace(/\\n/g, '\n');
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: processEnv.FIREBASE_PROJECT_ID,
    clientEmail: processEnv.FIREBASE_CLIENT_EMAIL,
    privateKey: key,
  }),
  databaseURL: 'https://mawid-iraqi-default-rtdb.firebaseio.com',
});

const db = admin.database();

async function run() {
  console.log('Fetching all appointments...');
  const ref = db.ref('appointments');
  const snapshot = await ref.once('value');
  if (!snapshot.exists()) {
    console.log('No appointments found.');
    process.exit(0);
  }

  const appointments = snapshot.val();
  const toDelete = [];
  for (const id in appointments) {
    if (appointments[id].status === 'cancelled') {
      toDelete.push(id);
    }
  }

  console.log(`Found ${toDelete.length} cancelled appointments.`);

  if (toDelete.length === 0) {
    console.log('No cancelled appointments to delete.');
    process.exit(0);
  }

  const updates = {};
  toDelete.forEach(id => {
    updates[id] = null; // Setting to null deletes it in Realtime Database!
  });

  console.log('Deleting cancelled appointments...');
  await ref.update(updates);
  console.log('Successfully deleted all cancelled appointments from the database!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
