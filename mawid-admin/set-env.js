const https = require('https');

// Get token from vercel config
const fs = require('fs');
const path = require('path');
const os = require('os');

let token = '';
try {
  const config = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.local/share/com.vercel.cli/auth.json'), 'utf-8'));
  token = config.token;
} catch {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/com.vercel.cli/auth.json'), 'utf-8'));
    token = config.token;
  } catch {
    // Windows path
    try {
      const config = JSON.parse(fs.readFileSync(path.join(os.homedir(), 'AppData', 'Roaming', 'com.vercel.cli', 'auth.json'), 'utf-8'));
      token = config.token;
    } catch(e) {
      console.error('Could not find vercel token', e);
      process.exit(1);
    }
  }
}

const ENV_VARS = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyD0R_yjLcntV_yIPwfRIYi7tF_7q5qxRCY',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'mawid-iraqi.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'mawid-iraqi',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'mawid-iraqi.firebasestorage.app',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '721879330711',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:721879330711:web:1ac819f4dc3fa09e729ed2',
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: 'https://mawid-iraqi-default-rtdb.firebaseio.com',
  NEXT_PUBLIC_ADMIN_PASSWORD: 'mawid@admin2025',
};

async function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = https.request({
      hostname: 'api.vercel.com',
      path,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Get project ID
  const projects = await request('GET', '/v9/projects/mawid-admin');
  const projectId = projects.id;
  console.log('Project ID:', projectId);

  for (const [key, value] of Object.entries(ENV_VARS)) {
    const result = await request('POST', `/v10/projects/${projectId}/env`, {
      key,
      value,
      type: 'plain',
      target: ['production', 'preview', 'development'],
    });
    if (result.error) {
      console.log(`⚠️  ${key}: ${result.error.message}`);
    } else {
      console.log(`✅ ${key} added`);
    }
  }
  console.log('\nAll env vars processed! Deploying...');
}

main();
