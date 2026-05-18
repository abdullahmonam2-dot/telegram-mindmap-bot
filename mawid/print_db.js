const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const processEnv = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    processEnv[match[1]] = (match[2] || '').replace(/['"]/g, '');
  }
});

let key = processEnv.FIREBASE_PRIVATE_KEY;
if (key) key = key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: processEnv.FIREBASE_PROJECT_ID,
    clientEmail: processEnv.FIREBASE_CLIENT_EMAIL,
    privateKey: key,
  }),
  databaseURL: 'https://mawid-iraqi-default-rtdb.firebaseio.com',
});

admin.database().ref('appointments').once('value').then(snap => {
  console.log(JSON.stringify(snap.val(), null, 2));
  process.exit(0);
});
