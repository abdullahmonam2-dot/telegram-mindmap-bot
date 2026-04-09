import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import (
    ContextTypes,
    ConversationHandler,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
)
from utils.coach_db import save_coach_profile, get_coach_profile
from utils.gemini_handler import generate_ai_study_plan
from datetime import datetime
import json

# Conversation stages
STAGE, NAME, HOURS, EXAM_DATE, START_TIME, LEVELS = range(6)

SUBJECTS = {
    "ثالث متوسط": ["التربية الإسلامية", "اللغة العربية", "اللغة الإنكليزية", "الرياضيات", "الاجتماعيات", "الفيزياء", "الكيمياء", "الأحياء"],
    "سادس علمي": ["التربية الإسلامية", "اللغة العربية", "اللغة الإنكليزية", "الرياضيات", "الفيزياء", "الكيمياء", "الأحياء"],
    "سادس أدبي": ["التربية الإسلامية", "اللغة العربية", "اللغة الإنكليزية", "الرياضيات", "التاريخ", "الجغرافية", "الاقتصاد"]
}

async def start_coach(update: Update, context: ContextTypes.DEFAULT_TYPE):
    reply_keyboard = [["ثالث متوسط"], ["سادس علمي"], ["سادس أدبي"]]
    await update.message.reply_text(
        "مرحباً بك في المدرب الدراسي الذكي! 🎓\n\nأولاً، اختر مرحلتك الدراسية:",
        reply_markup=ReplyKeyboardMarkup(reply_keyboard, one_time_keyboard=True, resize_keyboard=True),
    )
    return STAGE

async def select_stage(update: Update, context: ContextTypes.DEFAULT_TYPE):
    stage = update.message.text
    if stage not in SUBJECTS:
        await update.message.reply_text("عذراً، الخيار غير صحيح. يرجى اختيار مرحلة من القائمة.")
        return STAGE
    
    context.user_data["stage"] = stage
    await update.message.reply_text(f"ممتاز! أنت طالب {stage}.\n\nالآن، ما هو اسمك؟", reply_markup=ReplyKeyboardRemove())
    return NAME

async def get_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["name"] = update.message.text
    await update.message.reply_text(f"أهلاً بك يا {context.user_data['name']}!\n\nكم عدد الساعات التي يمكنك دراستها يومياً؟ (أدخل رقماً فقط)")
    return HOURS

async def get_hours(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        hours = int(update.message.text)
        if hours <= 0 or hours > 24:
            raise ValueError
    except ValueError:
        await update.message.reply_text("يرجى إدخال رقم صحيح لعدد الساعات (بين 1 و 24).")
        return HOURS

    context.user_data["daily_hours"] = hours
    await update.message.reply_text("متى تتوقع أن تبدأ الامتحانات الوزارية؟ (مثلاً: 2026-06-01)")
    return EXAM_DATE

async def get_exam_date(update: Update, context: ContextTypes.DEFAULT_TYPE):
    date_text = update.message.text
    try:
        datetime.strptime(date_text, "%Y-%m-%d")
    except ValueError:
        await update.message.reply_text("يرجى إدخال التاريخ بتنسيق YYYY-MM-DD (مثال: 2026-06-01).")
        return EXAM_DATE

    context.user_data["exam_date"] = date_text
    await update.message.reply_text("في أي وقت تود البدء بالدراسة يومياً؟ (مثلاً: 08:00 أو 14:30)")
    return START_TIME

async def get_start_time(update: Update, context: ContextTypes.DEFAULT_TYPE):
    time_text = update.message.text
    try:
        datetime.strptime(time_text, "%H:%M")
    except ValueError:
        await update.message.reply_text("يرجى إدخال الوقت بتنسيق HH:MM (مثال: 08:00).")
        return START_TIME

    context.user_data["start_time"] = time_text
    context.user_data["current_subject_index"] = 0
    context.user_data["levels"] = {}
    
    stage = context.user_data["stage"]
    subject = SUBJECTS[stage][0]
    
    keyboard = [
        [InlineKeyboardButton("ضعيف 🔴", callback_data="weak")],
        [InlineKeyboardButton("متوسط 🟡", callback_data="medium")],
        [InlineKeyboardButton("جيد 🟢", callback_data="good")]
    ]
    await update.message.reply_text(
        f"الآن لنقم بتقييم مستواك في المواد.\n\nما هو مستواك في مادة: **{subject}**؟",
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode='Markdown'
    )
    return LEVELS

async def get_levels(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    level = query.data
    stage = context.user_data["stage"]
    idx = context.user_data["current_subject_index"]
    subject = SUBJECTS[stage][idx]
    
    context.user_data["levels"][subject] = level
    context.user_data["current_subject_index"] += 1
    
    if context.user_data["current_subject_index"] < len(SUBJECTS[stage]):
        next_subject = SUBJECTS[stage][context.user_data["current_subject_index"]]
        keyboard = [
            [InlineKeyboardButton("ضعيف 🔴", callback_data="weak")],
            [InlineKeyboardButton("متوسط 🟡", callback_data="medium")],
            [InlineKeyboardButton("جيد 🟢", callback_data="good")]
        ]
        await query.edit_message_text(
            f"ما هو مستواك في مادة: **{next_subject}**؟",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )
        return LEVELS
    else:
        await query.edit_message_text("جاري تحليل بياناتك وبناء الجدول الدراسي الذكي بواسطة الذكاء الاصطناعي... ⏳")
        
        # Format levels for Gemini
        levels_summary = ""
        for s, l in context.user_data["levels"].items():
            level_ar = "ضعيف" if l == "weak" else "متوسط" if l == "medium" else "جيد"
            levels_summary += f"- {s}: {level_ar}\n"
        
        student_data = {
            "name": context.user_data["name"],
            "stage": context.user_data["stage"],
            "daily_hours": context.user_data["daily_hours"],
            "exam_date": context.user_data["exam_date"],
            "levels_summary": levels_summary
        }
        
        plan = await generate_ai_study_plan(student_data)
        
        # Save to DB
        save_coach_profile(
            update.effective_user.id,
            student_data["name"],
            student_data["stage"],
            student_data["daily_hours"],
            student_data["exam_date"],
            context.user_data["start_time"],
            plan
        )
        
        try:
            await query.message.reply_text(
                "✅ تم إنشاء جدولك الدراسي الذكي!\n\n" + plan,
                parse_mode='Markdown'
            )
        except Exception:
            # Fallback to plain text if markdown formatting is invalid
            await query.message.reply_text(
                "✅ تم إنشاء جدولك الدراسي الذكي!\n\n" + plan
            )
        
        # Trigger reload of reminders (handled in bot.py)
        context.application.job_queue.run_once(setup_reminders_for_user, when=1, data=update.effective_user.id)
        
        return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("تم إلغاء إعداد المدرب الدراسي.", reply_markup=ReplyKeyboardRemove())
    return ConversationHandler.END

async def setup_reminders_for_user(context: ContextTypes.DEFAULT_TYPE):
    user_id = context.job.data
    profile = get_coach_profile(user_id)
    if not profile: return
    
    start_time_str = profile["start_time"]
    try:
        t = datetime.strptime(start_time_str, "%H:%M").time()
        
        # Remove old jobs for this user
        current_jobs = context.job_queue.get_jobs_by_name(f"reminder_{user_id}")
        for job in current_jobs:
            job.schedule_removal()
            
        # Add new job
        context.job_queue.run_daily(
            send_study_reminder,
            time=t,
            days=(0, 1, 2, 3, 4, 5, 6),
            name=f"reminder_{user_id}",
            data=user_id
        )
    except Exception as e:
        logging.error(f"Error setting up reminder for {user_id}: {e}")

async def send_study_reminder(context: ContextTypes.DEFAULT_TYPE):
    user_id = context.job.data
    profile = get_coach_profile(user_id)
    if not profile: return
    
    text = (
        f"📚 مرحباً يا {profile['name']}! حان وقت الدراسة الآن حسب جدولك الذكي. 🔥\n\n"
        "تذكر: 'النجاح هو مجموع جهود صغيرة تتكرر يوماً بعد يوم'.\n"
        "ابدأ الآن بقوة! 💪"
    )
    await context.bot.send_message(chat_id=user_id, text=text)

async def view_plan(update: Update, context: ContextTypes.DEFAULT_TYPE):
    profile = get_coach_profile(update.effective_user.id)
    if not profile:
        await update.message.reply_text("لم تقم بإعداد جدولك بعد. اضغط على 'المدرب الدراسي الذكي 🤖' للبدء.")
        return
    
    try:
        await update.message.reply_text(
            f"📋 جدولك الدراسي الذكي الحالي:\n\n{profile['generated_plan']}",
            parse_mode='Markdown'
        )
    except Exception:
        await update.message.reply_text(
            f"📋 جدولك الدراسي الذكي الحالي:\n\n{profile['generated_plan']}"
        )

coach_conv_handler = ConversationHandler(
    entry_points=[MessageHandler(filters.Regex("^المدرب الدراسي الذكي 🤖$"), start_coach)],
    states={
        STAGE: [MessageHandler(filters.TEXT & ~filters.COMMAND, select_stage)],
        NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_name)],
        HOURS: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_hours)],
        EXAM_DATE: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_exam_date)],
        START_TIME: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_start_time)],
        LEVELS: [CallbackQueryHandler(get_levels)],
    },
    fallbacks=[CommandHandler("cancel", cancel)],
)
