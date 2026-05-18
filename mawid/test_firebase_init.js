const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Parse .env.local manually
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
  databaseURL: processEnv.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://mawid-iraqi-default-rtdb.firebaseio.com',
});

console.log('Querying database:', admin.app().options.databaseURL);

admin.database().ref('passwordResets').once('value')
  .then((snap) => {
    console.log('Successfully fetched passwordResets!');
    console.log('Exists:', snap.exists());
    if (snap.exists()) {
      console.log('Data:', JSON.stringify(snap.val(), null, 2));
    } else {
      console.log('No recovery requests found in this database.');
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to query database:', err);
    process.exit(1);
  });
