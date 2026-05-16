@echo off
echo AIzaSyD0R_yjLcntV_yIPwfRIYi7tF_7q5qxRCY| npx.cmd vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
echo mawid-iraqi.firebaseapp.com| npx.cmd vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
echo mawid-iraqi| npx.cmd vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
echo mawid-iraqi.firebasestorage.app| npx.cmd vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production
echo 721879330711| npx.cmd vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production
echo 1:721879330711:web:1ac819f4dc3fa09e729ed2| npx.cmd vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
echo Done.
