@echo off
call npx vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production --value "AIzaSyD0R_yjLcntV_yIPwfRIYi7tF_7q5qxRCY" --yes
call npx vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production --value "mawid-iraqi" --yes
call npx vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production --value "mawid-iraqi.firebasestorage.app" --yes
call npx vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production --value "1:721879330711:web:1ac819f4dc3fa09e729ed2" --yes
call npx vercel env add NEXT_PUBLIC_FIREBASE_DATABASE_URL production --value "https://mawid-iraqi-default-rtdb.firebaseio.com" --yes
call npx vercel env add NEXT_PUBLIC_ADMIN_PASSWORD production --value "mawid@admin2025" --yes
echo ALL DONE
