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
  databaseURL: 'https://mawid-iraqi-default-rtdb.firebaseio.com',
});

// Fetch database rules
const db = admin.database();
db.getRules()
  .then((rules) => {
    console.log('Database rules fetched successfully:');
    console.log(rules);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to fetch database rules:', err);
    process.exit(1);
  });
