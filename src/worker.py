import asyncio
from arq import create_pool
from arq.connections import RedisSettings
from aiogram import Bot
from config import config
from src.core.ai_service import ai_service
from src.services.tts_service import tts_service
from src.services.video_service import video_service
from src.services.diagram_service import diagram_service
from src.services.pptx_service import pptx_service
from src.utils.logger import log
from aiogram.types import FSInputFile

async def process_media_task(ctx, chat_id: int, file_path: str, feature: str, message_id: int):
    """Background task to handle heavy AI/Media work."""
    bot: Bot = ctx['bot']
    
    try:
        if feature == "audio":
            text = await ai_service.analyze_document(file_path, "قم بتلخيص هذا الملف في نص صوتي تعليمي مشوق باللغة العربية.")
            audio_path = await tts_service.generate_audio(text)
            await bot.send_audio(chat_id, FSInputFile(audio_path), caption="🎧 ملخصك الصوتي جاهز!")
            
        elif feature == "video":
            slides_text = await ai_service.analyze_document(file_path, "قم بتحليل هذا الملف وتحويله إلى 5 شرائح تعليمية. التنسيق: الشريحة 1: العنوان \n المحتوى...")
            # Parsing logic (simplified for production but could be improved with Pydantic)
            lines = slides_text.split("\n")
            slides_data = []
            current_slide = {"title": "العنوان", "content": ""}
            for line in lines:
                if "الشريحة" in line:
                    if current_slide["content"]: slides_data.append(current_slide)
                    current_slide = {"title": line, "content": ""}
                else:
                    current_slide["content"] += line + " "
            slides_data.append(current_slide)
            
            video_path = await video_service.generate_video(slides_data)
            await bot.send_video(chat_id, FSInputFile(video_path), caption="🎥 ملخص الفيديو جاهز!")

        elif feature == "quiz":
            quiz = await ai_service.analyze_document(file_path, "أنشئ اختباراً من 5 أسئلة MCQ بالعربية.")
            await bot.send_message(chat_id, f"❓ **الاختبار الذكي:**\n\n{quiz}", parse_mode="Markdown")

        # Add other features...
        
    except Exception as e:
        log.error(f"Worker Error for task {feature}: {e}")
        await bot.send_message(chat_id, f"❌ حدث خطأ أثناء المعالجة: {str(e)}")
    finally:
        # Cleanup temp file maybe? (careful if shared)
        # Delete status message
        try:
            await bot.delete_message(chat_id, message_id)
        except:
            pass

async def startup(ctx):
    ctx['bot'] = Bot(token=config.BOT_TOKEN)
    log.info("Worker started.")

async def shutdown(ctx):
    await ctx['bot'].session.close()
    log.info("Worker stopped.")

class WorkerSettings:
    functions = [process_media_task]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(config.REDIS_URL)
    max_jobs = 10 # Allow 10 concurrent heavy tasks per worker process
