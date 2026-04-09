import os
import logging
import asyncio
import time
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes, Application, ConversationHandler
from dotenv import load_dotenv
import base64

from utils.gemini_handler import generate_mindmap_json, generate_summary, translate_text
from utils.pdf_processor import extract_text_from_pdf
from utils.renderer import render_markmap_to_image, generate_interactive_html
from utils.pdf_gen import create_pdf
import utils.database as db
from features.study_coach import coach_conv_handler, view_plan, setup_reminders_for_user
from utils.coach_db import get_all_coach_profiles
from flask import Flask
import threading
import html

# Load environment variables
load_dotenv()
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
WATERMARK_NAME = os.getenv("WATERMARK_NAME", "عبدالله منعم (acxo3)")
ADMIN_ID = os.getenv("ADMIN_ID")

# Flask for Keep-Alive
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
    
    # Reload all study reminders on startup
    print("Reloading study reminders...")
    profiles = get_all_coach_profiles()
    for profile in profiles:
        user_id = profile["user_id"]
        # Use a dummy job data to trigger the setup
        class Job:
            data = user_id
        application.job_queue.run_once(setup_reminders_for_user, when=1, data=user_id)

async def register_user(update: Update):
    user = update.effective_user
    db.add_user(user.id, user.username)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        await register_user(update)
        user = update.effective_user
        user_name = html.escape(user.first_name)
        
        main_keyboard = [
            ["صناعة المخطط الذهني 🧠"],
            ["المدرب الدراسي الذكي 🤖"],
            ["عرض جدولي الدراسي الحالي 📋"],
            ["تواصل مع المطور 📩"]
        ]
        
        welcome_text = f"""مرحباً {user_name}! 👋

أنا **بوت الخرائط الذهنية والمدرب الدراسي الذكي**. 🧠

يمكنني تحويل **الصور والملفات** إلى مخططات ذهنية، أو بناء **جدول دراسي ذكي** مخصص لك.

**كيفية الاستخدام:**
1. أرسل (صورة أو ملف) لصناعة خريطة ذهنية.
2. اضغط على الزر أدناه للبدء مع **المدرب الدراسي**.

تم التطوير بواسطة: **عبدالله منعم**."""
        
        await update.message.reply_markdown(
            welcome_text,
            reply_markup=ReplyKeyboardMarkup(main_keyboard, resize_keyboard=True)
        )
    except Exception as e:
        await update.message.reply_text(f"حدث خطأ في رسالة الترحيب:\n{str(e)}")

async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)
    if user_id != str(ADMIN_ID):
        return
    
    count = db.count_users()
    await update.message.reply_text(f"📊 إحصائيات البوت:\n\nعدد المستخدمين الكلي: {count}")

# --- MINDMAP FLOW ---
MM_WAIT_FILE = range(1)

async def start_mm_flow(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📥 **أهلاً بك في صانع الخرائط الذهنية!**\n\nيرجى إرسال (صورة، ملف PDF، أو ملف Word) الآن لأقوم بتحليله لك.",
        parse_mode='Markdown'
    )
    return MM_WAIT_FILE

async def handle_mm_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.document:
        return await handle_document(update, context)
    elif update.message.photo:
        return await handle_photo(update, context)
    else:
        await update.message.reply_text("عذراً، يرجى إرسال ملف أو صورة فقط.")
        return MM_WAIT_FILE

# --- BROADCAST SYSTEM ---
BROADCAST_TEXT = range(1)

async def start_broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if str(update.effective_user.id) != str(ADMIN_ID): return ConversationHandler.END
    await update.message.reply_text("🔎 أرسل الآن الرسالة التي تريد إذاعتها للجميع (نص، صورة، فيديو، إلخ...):\nللإلغاء أرسل /cancel")
    return BROADCAST_TEXT

async def execute_broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE):
    users = db.get_all_users()
    total = len(users)
    sent = 0
    failed = 0
    
    msg = await update.message.reply_text(f"🚀 جاري الإذاعة إلى {total} مستخدم...")
    
    for user_id in users:
        try:
            await update.message.copy(chat_id=user_id)
            sent += 1
            if sent % 10 == 0:
                await msg.edit_text(f"🚀 جاري الإذاعة... تم إرسال {sent} من أصل {total}")
        except Exception:
            failed += 1
        await asyncio.sleep(0.05) # Rate limiting
    
    await msg.edit_text(f"✅ اكتملت الإذاعة!\n\nتم الإرسال لـ: {sent}\nفشل: {failed}")
    return ConversationHandler.END

# --- SUPPORT SYSTEM ---
SUPPORT_TEXT = range(1)

async def start_support(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("📥 أرسل رسالتك أو استفسارك الآن وسيقوم المطور بالرد عليك في أقرب وقت:")
    return SUPPORT_TEXT

async def forward_to_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_info = f"📩 رسالة جديدة من: {user.first_name} (@{user.username})\nID: <code>{user.id}</code>\n\nالمحتوى أدناه 👇"
    
    await context.bot.send_message(chat_id=ADMIN_ID, text=user_info, parse_mode='HTML')
    await update.message.copy(chat_id=ADMIN_ID)
    
    await update.message.reply_text("✅ تم إرسال رسالتك للإدارة بنجاح. سيصلك الرد هنا قريباً.")
    return ConversationHandler.END

async def cancel_comm(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("تم الإلغاء.")
    return ConversationHandler.END

# --- ADMIN REPLY ---
async def handle_reply_to_user(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if str(update.effective_user.id) != str(ADMIN_ID): return
    if not update.message.reply_to_message: return
    
    # Extract User ID from the info message
    reply_msg = update.message.reply_to_message
    text = ""
    if reply_msg.text: text = reply_msg.text
    elif reply_msg.caption: text = reply_msg.caption
    
    import re
    match = re.search(r"ID: (\d+)", text)
    if match:
        target_user_id = match.group(1)
        try:
            await update.message.copy(chat_id=target_user_id)
            await update.message.reply_text("✅ تم إرسال ردك للمستخدم بنجاح.")
        except Exception as e:
            await update.message.reply_text(f"❌ فشل إرسال الرد: {e}")

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
    
    if not update.message.photo:
        await update.message.reply_text("عذراً، لم أتمكن من العثور على الصورة. يرجى المحاولة مرة أخرى.")
        return
        
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
    
    if text == "عرض جدولي الدراسي الحالي 📋":
        await view_plan(update, context)
        return
    
    if text == "تواصل مع المطور 📩":
        return

    user_data_store[update.effective_user.id] = {
        "text": text,
        "type": "text"
    }
    
    await show_options(update, context)

async def show_options(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("🔗 فتح المخطط الذهني في المتصفح", callback_data="mm_browser")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("تم استخراج البيانات، اضغط على الزر أدناه لعرض الخريطة التفاعلية:", reply_markup=reply_markup)

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
            
            # Send the link as text instead of a button to avoid "Reply markup is too long" error
            await query.message.reply_text(
                f"🌍 **رابط المخطط الذهني التفاعلي:**\n\n[اضغط هنا لفتح الخريطة في المتصفح]({browser_url})\n\nبواسطة: [عبدالله منعم](https://t.me/acxo3)",
                parse_mode='Markdown',
                disable_web_page_preview=False
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
        source_file = data.get("file_path")
        if source_file and os.path.exists(source_file):
            try:
                os.remove(source_file)
            except Exception as e:
                logging.error(f"Failed to delete source file {source_file}: {e}")
        
        if user_id in user_data_store:
            del user_data_store[user_id]
            
        try:
            await status_msg.delete()
        except Exception as e:
            logging.error(f"Failed to delete status message: {e}")

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logging.error("Exception while handling an update:", exc_info=context.error)
    if ADMIN_ID:
        try:
            await context.bot.send_message(chat_id=ADMIN_ID, text=f"⚠️ حدث خطأ في البوت:\n<code>{html.escape(str(context.error))}</code>", parse_mode='HTML')
        except:
            pass

if __name__ == "__main__":
    if not BOT_TOKEN:
        print("Error: TELEGRAM_BOT_TOKEN not found in .env")
    else:
        cleanup_temp_dir()
        print("Starting Flask Keep-Alive...")
        threading.Thread(target=run_flask, daemon=True).start()
        print(f"Database System: {db.get_db_status()} [READY]")
        
        app = ApplicationBuilder().token(BOT_TOKEN).post_init(post_init).connect_timeout(60).read_timeout(60).write_timeout(60).build()
        
        # Add Handlers
        app.add_handler(CommandHandler("start", start))
        app.add_handler(CommandHandler("stats", stats))
        
        # Communication Handlers
        broadcast_handler = ConversationHandler(
            entry_points=[CommandHandler("broadcast", start_broadcast)],
            states={BROADCAST_TEXT: [MessageHandler(filters.ALL & ~filters.COMMAND, execute_broadcast)]},
            fallbacks=[CommandHandler("cancel", cancel_comm)]
        )
        support_handler = ConversationHandler(
            entry_points=[MessageHandler(filters.Regex("^تواصل مع المطور 📩$"), start_support)],
            states={SUPPORT_TEXT: [MessageHandler(filters.ALL & ~filters.COMMAND, forward_to_admin)]},
            fallbacks=[CommandHandler("cancel", cancel_comm)]
        )
        
        mm_handler = ConversationHandler(
            entry_points=[MessageHandler(filters.Regex("^صناعة المخطط الذهني 🧠$"), start_mm_flow)],
            states={MM_WAIT_FILE: [MessageHandler(filters.Document.ALL | filters.PHOTO, handle_mm_input)]},
            fallbacks=[CommandHandler("cancel", cancel_comm)],
        )
        
        app.add_handler(broadcast_handler)
        app.add_handler(support_handler)
        app.add_handler(mm_handler)
        app.add_handler(MessageHandler(filters.REPLY & filters.User(int(ADMIN_ID or 0)), handle_reply_to_user))
        
        app.add_handler(coach_conv_handler) # Register Study Coach Handler
        app.add_handler(MessageHandler(filters.Document.ALL, handle_document))
        app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
        app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_text))
        app.add_handler(CallbackQueryHandler(button_callback))
        app.add_error_handler(error_handler)
        
        print("Bot is starting polling... [OK]")
        
        while True:
            try:
                app.run_polling(drop_pending_updates=True)
            except Exception as e:
                logging.error(f"Critical error in polling: {e}. Restarting in 10 seconds...")
                time.sleep(10)
