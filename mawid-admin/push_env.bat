@echo off
cd /d "C:\Users\DEEL\.gemini\antigravity\scratch\mawid-admin"

echo Pushing Firebase env vars to Vercel mawid-admin...

npx vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production --value "mawid-iraqi.firebaseapp.com" --yes --force
npx vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production --value "mawid-iraqi" --yes --force
npx vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production --value "mawid-iraqi.firebasestorage.app" --yes --force
npx vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production --value "721879330711" --yes --force
npx vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production --value "1:721879330711:web:1ac819f4dc3fa09e729ed2" --yes --force
npx vercel env add NEXT_PUBLIC_FIREBASE_DATABASE_URL production --value "https://mawid-iraqi-default-rtdb.firebaseio.com" --yes --force

echo Done! All env vars pushed.
pause
