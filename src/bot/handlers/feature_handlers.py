from aiogram import Router, F
from aiogram.types import CallbackQuery
from config import config
from src.database.repository import Repository
from src.core.task_queue import task_queue
from src.utils.logger import log
import os

router = Router()
repo = Repository(config.DATABASE_URL)

async def download_tg_file(bot, file_id, extension="tmp"):
    file = await bot.get_file(file_id)
    file_path = os.path.join(config.TEMP_DIR, f"{file_id}.{extension}")
    await bot.download_file(file.file_path, file_path)
    return file_path

@router.callback_query(F.data.startswith("feature_"))
async def handle_features(callback: CallbackQuery, bot):
    feature = callback.data.split("_")[1]
    user_id = callback.from_user.id
    
    db_file = await repo.get_latest_file(user_id)
    if not db_file:
        await callback.message.answer("❌ لم أجد ملفات سابقة. يرجى رفع ملف أولاً.")
        return

    # Update UI to show it's in queue
    status_msg = await callback.message.edit_text(
        f"⏳ تم إضافة طلبك (**{feature}**) إلى قائمة الانتظار...\n"
        "سنقوم بإرسال النتيجة فور جاهزيتها."
    )
    await callback.answer()

    try:
        # Download file (consider moving this to worker if it's large)
        ext = "pdf" if db_file.file_type == "document" else "mp3" if db_file.file_type == "audio" else "mp4" if db_file.file_type == "video" else "jpg"
        local_path = await download_tg_file(bot, db_file.file_id, ext)
        
        # OFF-LOAD TO WORKER
        await task_queue.enqueue(
            "process_media_task",
            chat_id=callback.message.chat.id,
            file_path=os.path.abspath(local_path),
            feature=feature,
            message_id=status_msg.message_id
        )
        
    except Exception as e:
        log.error(f"Task enqueue error: {e}")
        await callback.message.answer(f"❌ فشل إرسال الطلب للمعالجة: {str(e)}")

