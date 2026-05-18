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
  const list = [];
  for (const id in appointments) {
    list.push({ id, ...appointments[id] });
  }

  // Group by doctorId and date
  const groups = {};
  list.forEach(apt => {
    const groupKey = `${apt.doctorId}_${apt.date}`;
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(apt);
  });

  console.log(`Found appointments for ${Object.keys(groups).length} doctor-date groups.`);

  const updates = {};
  for (const groupKey in groups) {
    const apts = groups[groupKey];
    // Sort by createdAt ascending (oldest first)
    apts.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    console.log(`Group ${groupKey} has ${apts.length} appointments.`);
    apts.forEach((apt, index) => {
      const seq = index + 1;
      console.log(`  - Appointment ${apt.id}: ${apt.patientName} (${apt.date}) -> Daily Sequence ${seq}`);
      updates[`${apt.id}/sequenceNumber`] = seq;
    });
  }

  console.log('Updating database...');
  await ref.update(updates);
  console.log('Successfully updated all sequence numbers to be daily!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
