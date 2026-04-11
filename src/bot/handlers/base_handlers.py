from aiogram import Router, F
from aiogram.filters import CommandStart
from aiogram.types import Message, CallbackQuery
from config import config
from src.bot.keyboards.main_menu import get_main_menu
from src.database.repository import Repository
from src.utils.logger import log

router = Router()
repo = Repository(config.DATABASE_URL)

@router.message(CommandStart())
async def cmd_start(message: Message):
    await repo.get_or_create_user(
        telegram_id=message.from_user.id,
        username=message.from_user.username,
        full_name=message.from_user.full_name
    )
    
    welcome_text = (
        "👋 أهلاً بك في **Arabic NotebookLM** المتطور!\n\n"
        "أنا مساعدك الذكي لتحويل الملفات إلى محتوى تعليمي.\n"
        "قم برفع أي ملف (PDF، صور، صوت، فيديو) وسأقوم بتحليله لك.\n\n"
        "ماذا يمكنني أن أفعل؟\n"
        "• تلخيص صوتي ومرئي\n"
        "• إنشاء اختبارات وبطاقات تعليمية\n"
        "• رسم خرائط ذهنية\n"
        "• إنشاء شرائح عرض (PowerPoint)"
    )
    await message.answer(welcome_text, parse_mode="Markdown")

@router.message(F.document | F.photo | F.audio | F.video)
async def handle_file_upload(message: Message):
    # Get file details
    if message.document:
        file_id = message.document.file_id
        file_name = message.document.file_name
        file_type = "document"
    elif message.photo:
        file_id = message.photo[-1].file_id
        file_name = f"photo_{file_id[:10]}.jpg"
        file_type = "image"
    elif message.audio or message.voice:
        file_obj = message.audio or message.voice
        file_id = file_obj.file_id
        file_name = getattr(file_obj, "file_name", f"audio_{file_id[:10]}.mp3")
        file_type = "audio"
    elif message.video:
        file_id = message.video.file_id
        file_name = message.video.file_name or f"video_{file_id[:10]}.mp4"
        file_type = "video"
    else:
        return

    msg = await message.answer("📥 جاري استلام الملف ومعالجته...")
    
    # Save to DB
    await repo.save_file(message.from_user.id, file_id, file_name, file_type)
    
    await msg.edit_text(
        f"✅ تم استلام الملف: **{file_name}**\n\n"
        "اختر ماذا تريد أن أفعل بهذا الملف من القائمة أدناه:",
        reply_markup=get_main_menu(),
        parse_mode="Markdown"
    )

@router.callback_query(F.data == "cancel")
async def cmd_cancel(callback: CallbackQuery):
    await callback.message.edit_text("❌ تم الإلغاء. يمكنك رفع ملف جديد في أي وقت.")
    await callback.answer()
