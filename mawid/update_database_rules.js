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

const newRules = {
  "rules": {
    "users": {
      ".read": "auth != null && (auth.token.admin === true || auth.uid === 'mawid-admin-user')",
      "$uid": {
        ".read": "auth != null && (auth.uid == $uid || auth.token.admin === true || auth.uid === 'mawid-admin-user')",
        ".write": "auth != null && (auth.uid == $uid || auth.token.admin === true || auth.uid === 'mawid-admin-user')"
      }
    },
    "doctors": {
      ".read": true,
      "$doctorId": {
        ".write": "auth != null && (newData.child('secretaryId').val() == auth.uid || data.child('secretaryId').val() == auth.uid || auth.token.admin === true || auth.uid === 'mawid-admin-user')"
      },
      ".indexOn": ["secretaryId"]
    },
    "appointments": {
      // Direct reading at root is restricted to admins only.
      // But query reads (by child) are allowed if querying by the patient's own ID or the secretary's doctor ID.
      ".read": "auth != null && (" +
        "auth.token.admin === true || " +
        "auth.uid === 'mawid-admin-user' || " +
        "query.orderByChild == 'patientId' && query.equalTo == auth.uid || " +
        "query.orderByChild == 'doctorId' && root.child('doctors').child(query.equalTo).child('secretaryId').val() == auth.uid" +
      ")",
      "$aptId": {
        // Individual appointments can be read/written by the patient, the secretary of the doctor, or the admin.
        ".read": "auth != null && (data.child('patientId').val() == auth.uid || root.child('doctors').child(data.child('doctorId').val()).child('secretaryId').val() == auth.uid || auth.token.admin === true || auth.uid === 'mawid-admin-user')",
        ".write": "auth != null && (" +
          "!data.exists() && newData.child('patientId').val() == auth.uid || " + // Creating own appointment
          "data.child('patientId').val() == auth.uid || " + // Owner modifying/cancelling
          "root.child('doctors').child(data.child('doctorId').val()).child('secretaryId').val() == auth.uid || " + // Secretary of the old doctor modifying
          "root.child('doctors').child(newData.child('doctorId').val()).child('secretaryId').val() == auth.uid || " + // Secretary of the new doctor modifying
          "auth.token.admin === true || " +
          "auth.uid === 'mawid-admin-user'" +
        ")"
      },
      ".indexOn": ["patientId", "doctorId"]
    },
    "ads": {
      ".read": true,
      ".write": "auth != null && (auth.token.admin === true || auth.uid === 'mawid-admin-user')"
    },
    "activationCodes": {
      ".read": "auth != null && (auth.token.admin === true || auth.uid === 'mawid-admin-user')",
      ".write": "auth != null && (auth.token.admin === true || auth.uid === 'mawid-admin-user')"
    },
    "messages": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "passwordResets": {
      ".read": true,
      ".write": true
    }
  }
};

console.log('Deploying new database rules...');

admin.database().setRules(newRules)
  .then(() => {
    console.log('Database rules deployed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to deploy database rules:', err);
    process.exit(1);
  });
