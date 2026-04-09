import os
import logging
import asyncio
import time
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes, Application
from dotenv import load_dotenv
import base64

from utils.gemini_handler import generate_mindmap_json, generate_summary, translate_text
from utils.pdf_processor import extract_text_from_pdf
from utils.renderer import render_markmap_to_image, generate_interactive_html
from utils.pdf_gen import create_pdf
import utils.database as db
from flask import Flask
import threading
import html

# Load environment variables
load_dotenv()
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
WATERMARK_NAME = os.getenv("WATERMARK_NAME", "عبدالله منعم (acxo3)")
ADMIN_ID = os.getenv("ADMIN_ID")

# Flask for Keep-Alive (Render Free Tier)
web_app = Flask(__name__)

@web_app.route('/')
def home():
    logging.info("Keep-Alive ping received.")
    return "Bot is alive! 🚀"

def run_flask():
    port = int(os.environ.get("PORT", 8080))
    web_app.run(host='0.0.0.0', port=port)

# Setup logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)

# Temporary storage for user files/text
user_data_store = {}

def cleanup_temp_dir():
    """Cleanup all files in temp directory on startup."""
    import shutil
    if os.path.exists("temp"):
        for filename in os.listdir("temp"):
            file_path = os.path.join("temp", filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                print(f'Failed to delete {file_path}. Reason: {e}')
        print("Cleanup: temp directory cleared.")
    else:
        os.makedirs("temp")
        print("Cleanup: temp directory created.")

async def post_init(application: Application):
    from telegram import BotCommand
    commands = [
        BotCommand("start", "تشغيل أو إعادة تشغيل البوت")
    ]
    await application.bot.set_my_commands(commands)

async def register_user(update: Update):
    user = update.effective_user
    db.add_user(user.id, user.username)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        await register_user(update)
        user = update.effective_user
        user_name = html.escape(user.first_name)
        
        welcome_text = f"""مرحباً {user_name}! 👋

أنا **بوت الخرائط الذهنية الذكي**. 🧠

يمكنني تحويل **الصور، ملفات PDF، وملفات Word** إلى مخططات ذهنية احترافية وتفاعلية.

**كيفية الاستخدام:**
1. أرسل لي (صورة أو ملف PDF أو ملف Word).
2. اختر نوع المخرج الذي تريده (رابط، ملف تفاعلي، أو صورة).
3. سأقوم بتحليل المحتوى وصناعة الخريطة لك فوراً.

تم التطوير بواسطة: **عبدالله منعم**."""
        await update.message.reply_markdown(welcome_text)
    except Exception as e:
        await update.message.reply_text(f"حدث خطأ في رسالة الترحيب:\n{str(e)}")

async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)
    if user_id != str(ADMIN_ID):
        # Silent ignore for non-admins
        return
    
    count = db.count_users()
    await update.message.reply_text(f"📊 إحصائيات البوت:\n\nعدد المستخدمين الكلي: {count}")

async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await register_user(update)
    msg = await update.message.reply_text("جاري استلام الملف... ⏳")
    
    file = await update.message.document.get_file()
    file_name = update.message.document.file_name
    file_path = f"temp/{file.file_id}_{file_name}"
    if not os.path.exists("temp"): os.makedirs("temp")
    await file.download_to_drive(file_path)
    
    file_type = "text"
    if file_path.lower().endswith(".pdf"):
        file_type = "pdf"
    elif file_path.lower().endswith(".docx"):
        file_type = "docx"

    user_data_store[update.effective_user.id] = {
        "file_path": file_path,
        "type": file_type
    }
    
    await show_options(update, context)

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await register_user(update)
    msg = await update.message.reply_text("جاري استلام الصورة... ⏳")
    
    photo = update.message.photo[-1]
    file = await photo.get_file()
    file_path = f"temp/{file.file_id}.jpg"
    if not os.path.exists("temp"): os.makedirs("temp")
    await file.download_to_drive(file_path)
    
    user_data_store[update.effective_user.id] = {
        "file_path": file_path,
        "type": "image"
    }
    
    await show_options(update, context)

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await register_user(update)
    text = update.message.text
    if text.startswith("/"): return

    user_data_store[update.effective_user.id] = {
        "text": text,
        "type": "text"
    }
    
    await show_options(update, context)

async def show_options(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("🔗 فتح في المتصفح (رابط)", callback_data="mm_browser")],
        [InlineKeyboardButton("🎮 ملف تفاعلي (HTML)", callback_data="mm_interactive")],
        [InlineKeyboardButton("🖼️ مخطط ذهني (PNG)", callback_data="mm_only")],
        [InlineKeyboardButton("🌍 ترجمة + مخطط (PNG)", callback_data="translate_mm")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("اختر الوسيلة التي تود عرض الخريطة بها:", reply_markup=reply_markup)

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    user_id = update.effective_user.id
    if user_id not in user_data_store:
        await query.edit_message_text("عذراً، انتهت صلاحية الجلسة. يرجى إرسال الملف مرة أخرى.")
        return
    
    action = query.data
    data = user_data_store.get(user_id)
    
    if not data:
        await query.edit_message_text("عذراً، انتهت صلاحية الجلسة. يرجى إرسال الملف مرة أخرى.")
        return

    status_msg = await query.edit_message_text("جاري المعالجة باحترافية... 🚀")
    
    is_image = (data["type"] == "image")
    content = ""
    if is_image:
        content = data["file_path"]
    elif data["type"] == "pdf":
        content = await asyncio.to_thread(extract_text_from_pdf, data["file_path"])
    elif data["type"] == "docx":
        from utils.pdf_processor import extract_text_from_docx
        content = await asyncio.to_thread(extract_text_from_docx, data["file_path"])
    else:
        content = data.get("text", "")

    try:
        if action == "translate_mm":
            json_data = await generate_mindmap_json(content, is_image=is_image, translate=True)
            if json_data == "ERROR_QUOTA":
                await query.message.reply_text("🛑 تجاوزت الحد المسموح. حاول لاحقاً.")
                return
            if not json_data:
                await query.message.reply_text("⚠️ فشل بناء الخريطة.")
                return
            img_path = f"temp/{user_id}_mm.png"
            await render_markmap_to_image(json_data, img_path, watermark_name=WATERMARK_NAME)
            sent_msg = await query.message.reply_document(document=open(img_path, 'rb'), caption=f"✅ تم رسم الخريطة المترجمة.\nبواسطة: [عبدالله منعم](https://t.me/acxo3)", parse_mode='Markdown')
            db.add_history_entry(user_id, "mindmap_translated", sent_msg.document.file_id, "Translated Mindmap")
            if os.path.exists(img_path): os.remove(img_path)
            
        elif action == "mm_only":
            json_data = await generate_mindmap_json(content, is_image=is_image, translate=False)
            if json_data == "ERROR_QUOTA":
                await query.message.reply_text("🛑 تجاوزت الحد المسموح. حاول لاحقاً.")
                return
            if not json_data:
                await query.message.reply_text("⚠️ فشل استخراج الخريطة.")
                return
            img_path = f"temp/{user_id}_mm.png"
            await render_markmap_to_image(json_data, img_path, watermark_name=WATERMARK_NAME)
            sent_msg = await query.message.reply_document(document=open(img_path, 'rb'), caption=f"✅ تم رسم الخريطة الذهنية.\nبواسطة: [عبدالله منعم](https://t.me/acxo3)", parse_mode='Markdown')
            db.add_history_entry(user_id, "mindmap_png", sent_msg.document.file_id, "Mindmap Only")
            if os.path.exists(img_path): os.remove(img_path)
            
        elif action == "mm_browser":
            json_data = await generate_mindmap_json(content, is_image=is_image, translate=False)
            if json_data == "ERROR_QUOTA":
                await query.message.reply_text("🛑 تجاوزت الحد المسموح. حاول لاحقاً.")
                return
            
            b64_data = base64.b64encode(json_data.encode('utf-8')).decode('utf-8')
            browser_url = f"https://markmap.js.org/repl#?d=data:text/markdown;base64,{b64_data}"
            
            keyboard = [[InlineKeyboardButton("🔗 اضغط هنا لفتح الخريطة", url=browser_url)]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.message.reply_text(
                "🌍 **رابط المتصفح المباشر المفتوح:**\nستفتح الخريطة في المتصفح بشكل كامل وجاهزة للعرض.",
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
            
        elif action == "mm_interactive":
            json_data = await generate_mindmap_json(content, is_image=is_image, translate=False)
            if json_data == "ERROR_QUOTA":
                await query.message.reply_text("🛑 تجاوزت الحد المسموح. حاول لاحقاً.")
                return
            
            html_path = f"temp/{user_id}_interactive.html"
            generate_interactive_html(json_data, html_path, watermark_name=WATERMARK_NAME)
            
            await query.message.reply_document(
                document=open(html_path, 'rb'), 
                caption=f"🎮 **الخريطة التفاعلية (ملف):**\nبواسطة: [عبدالله منعم](https://t.me/acxo3)",
                parse_mode='Markdown'
            )
            if os.path.exists(html_path): os.remove(html_path)

    except Exception as e:
        error_info = f"❌ حدث خطأ تقني:\n`{str(e)}`"
        logging.error(f"Error processing action {action}: {e}")
        await query.message.reply_text(error_info, parse_mode='Markdown')
    finally:
        # 1. Delete original source file if it exists
        source_file = data.get("file_path")
        if source_file and os.path.exists(source_file):
            try:
                os.remove(source_file)
                logging.info(f"Deleted source file: {source_file}")
            except Exception as e:
                logging.error(f"Failed to delete source file {source_file}: {e}")
        
        # 2. Clear user session data
        if user_id in user_data_store:
            del user_data_store[user_id]
            
        # 3. Delete the "Processing..." message to keep chat clean
        try:
            await status_msg.delete()
        except Exception as e:
            logging.error(f"Failed to delete status message: {e}")

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Log the error and send a telegram message to notify the developer."""
    logging.error("Exception while handling an update:", exc_info=context.error)
    # Optional: send message to ADMIN_ID
    if ADMIN_ID:
        try:
            await context.bot.send_message(chat_id=ADMIN_ID, text=f"⚠️ حدث خطأ في البوت:\n<code>{html.escape(str(context.error))}</code>", parse_mode='HTML')
        except:
            pass

if __name__ == "__main__":
    if not BOT_TOKEN:
        print("Error: TELEGRAM_BOT_TOKEN not found in .env")
    else:
        # Start Cleanup
        cleanup_temp_dir()
        
        # Start Flask in background
        print("Starting Flask Keep-Alive...")
        threading.Thread(target=run_flask, daemon=True).start()
        
        # Log Database Status
        print(f"Database System: {db.get_db_status()} [READY]")
        
        # Build Application
        app = ApplicationBuilder().token(BOT_TOKEN).post_init(post_init).connect_timeout(60).read_timeout(60).write_timeout(60).build()
        
        # Add Handlers
        app.add_handler(CommandHandler("start", start))
        app.add_handler(CommandHandler("stats", stats))
        app.add_handler(MessageHandler(filters.Document.ALL, handle_document))
        app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
        app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_text))
        app.add_handler(CallbackQueryHandler(button_callback))
        
        # Add Error Handler
        app.add_error_handler(error_handler)
        
        print("Bot is starting polling... [OK]")
        
        while True:
            try:
                app.run_polling(drop_pending_updates=True)
            except Exception as e:
                logging.error(f"Critical error in polling: {e}. Restarting in 10 seconds...")
                time.sleep(10)
