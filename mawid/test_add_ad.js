const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const envPath = path.resolve(__dirname, '.env.local');
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
db.ref('ads/test-123').remove().then(() => {
  console.log('Successfully deleted test ad from DB!');
  process.exit(0);
}).catch(err => {
  console.error('Delete failed:', err);
  process.exit(1);
});
