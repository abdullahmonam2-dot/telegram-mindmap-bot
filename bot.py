import os
import logging
import asyncio
import time
import threading
import html
import re
from telegram import Update, ReplyKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes, Application
from dotenv import load_dotenv
from flask import Flask

# Import our new downloader
from utils.video_downloader import download_video
import utils.database as db

# Load environment variables
load_dotenv()
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ADMIN_ID = os.getenv("ADMIN_ID")

# Flask for Keep-Alive (Render Support)
web_app = Flask(__name__)
@web_app.route('/')
def home():
    return "Video Downloader Bot is alive! 🚀"

def run_flask():
    port = int(os.environ.get("PORT", 8080))
    web_app.run(host='0.0.0.0', port=port)

# Setup logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

def cleanup_temp_dir():
    """Cleanup all files in temp directory on startup."""
    import shutil
    if os.path.exists("temp"):
        for filename in os.listdir("temp"):
            file_path = os.path.join("temp", filename)
            try:
                if os.path.isfile(file_path): os.unlink(file_path)
                elif os.path.isdir(file_path): shutil.rmtree(file_path)
            except Exception as e: print(f'Failed to delete {file_path}: {e}')
    else:
        os.makedirs("temp")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    db.add_user(user.id, user.username)
    
    keyboard = [["تواصل مع المطور 📩"]]
    welcome_text = (
        f"مرحباً {html.escape(user.first_name)}! 👋\n\n"
        "🚀 **أنا بوت تنزيل الفيديوهات السريع.**\n\n"
        "أرسل لي رابط فيديو من **تيك توك** أو **إنستغرام** وسأقوم بتنزيله لك فوراً وبأعلى دقة وبدون علامة مائية! ✨\n\n"
        "**منصات مدعومة:**\n"
        "✅ TikTok (بدون علامة)\n"
        "✅ Instagram (Reels & Posts)\n\n"
        "بواسطة: عبدالله منعم"
    )
    await update.message.reply_text(
        welcome_text,
        reply_markup=ReplyKeyboardMarkup(keyboard, resize_keyboard=True),
        parse_mode='Markdown'
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    if not text: return
    
    # التحقق من الروابط
    tiktok_regex = r'(https?://(?:www\.|vm\.|vt\.)?tiktok\.com/.*)'
    insta_regex = r'(https?://(?:www\.)?instagram\.com/(?:p|reels|reel)/.*)'
    
    if re.search(tiktok_regex, text) or re.search(insta_regex, text):
        url = re.search(r'(https?://\S+)', text).group(1)
        await process_video_download(update, context, url)
    elif text == "تواصل مع المطور 📩":
        await update.message.reply_text("يمكنك التواصل مع المطور عبر المعرف: @acxo3")
    else:
        await update.message.reply_text("❌ عذراً، أرسل لي رابطاً صالحاً من تيك توك أو إنستغرام.")

async def process_video_download(update: Update, context: ContextTypes.DEFAULT_TYPE, url: str):
    status_msg = await update.message.reply_text("⏳ جاري استخراج الفيديو وبدء التحميل... يرجى الانتظار.")
    
    try:
        # تحميل الفيديو باستخدام اليوتيلتي الجديد
        file_path = await download_video(url)
        
        if file_path and os.path.exists(file_path):
            await status_msg.edit_text("🚀 جاري رفع الفيديو إلى تلغرام...")
            
            # إرسال الفيديو للتلغرام
            with open(file_path, 'rb') as video:
                await update.message.reply_video(
                    video=video,
                    caption="✅ تم التنزيل بنجاح بواسطة @acxo3\nدقة عالية وبدون علامة مائية ✨",
                    supports_streaming=True
                )
            
            # تنظيف الملف المحلي
            os.remove(file_path)
            await status_msg.delete()
        else:
            await status_msg.edit_text("❌ عذراً، فشل تحميل الفيديو. تأكد من أن الحساب عام (Public) والرابط صحيح.")
            
    except Exception as e:
        logger.error(f"Error in process_video_download: {e}")
        await status_msg.edit_text(f"❌ حدث خطأ أثناء المعالجة: {str(e)}")

async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if str(update.effective_user.id) != str(ADMIN_ID): return
    count = db.count_users()
    await update.message.reply_text(f"📊 إجمالي المستخدمين: {count}")

# --- نظام النشر (Broadcast) ---
BROADCAST_TEXT = range(1)
async def start_broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if str(update.effective_user.id) != str(ADMIN_ID): return ConversationHandler.END
    await update.message.reply_text("🔎 أرسل الآن الرسالة (نص، صورة، فيديو) التي تريد إذاعتها للجميع:\nللإلغاء أرسل /cancel")
    return BROADCAST_TEXT

async def execute_broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE):
    users = db.get_all_users()
    sent, failed = 0, 0
    msg = await update.message.reply_text(f"🚀 جاري الإرسال إلى {len(users)} مستخدم...")
    
    for user_id in users:
        try:
            await update.message.copy(chat_id=user_id)
            sent += 1
            if sent % 10 == 0: await msg.edit_text(f"🚀 جاري الإرسال... تم إرسال {sent}")
        except: failed += 1
        await asyncio.sleep(0.05) # تفادي الحظر
        
    await msg.edit_text(f"✅ اكتمل الإرسال!\nتم الإرسال: {sent}\nفشل: {failed}")
    return ConversationHandler.END

async def cancel_broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("تم إلغاء الإذاعة.")
    return ConversationHandler.END

if __name__ == "__main__":
    if not BOT_TOKEN:
        print("Error: TELEGRAM_BOT_TOKEN not found in .env")
    else:
        cleanup_temp_dir()
        threading.Thread(target=run_flask, daemon=True).start()
        
        from telegram.ext import ConversationHandler
        app = ApplicationBuilder().token(BOT_TOKEN).connect_timeout(60).read_timeout(60).write_timeout(60).build()
        
        # الأوامر الأساسية
        app.add_handler(CommandHandler("start", start))
        app.add_handler(CommandHandler("stats", stats))
        
        # نظام النشر
        app.add_handler(ConversationHandler(
            entry_points=[CommandHandler("broadcast", start_broadcast)],
            states={BROADCAST_TEXT: [MessageHandler(filters.ALL & ~filters.COMMAND, execute_broadcast)]},
            fallbacks=[CommandHandler("cancel", cancel_broadcast)]
        ))
        
        app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_message))
        
        print("Bot is starting... [OK]")
        app.run_polling(drop_pending_updates=True)
