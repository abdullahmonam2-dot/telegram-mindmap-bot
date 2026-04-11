from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

def get_main_menu():
    buttons = [
        [InlineKeyboardButton(text="🎧 الملخص الصوتي", callback_data="feature_audio")],
        [InlineKeyboardButton(text="🎥 ملخص فيديو", callback_data="feature_video")],
        [InlineKeyboardButton(text="🧠 البطاقات التعليمية", callback_data="feature_flashcards")],
        [InlineKeyboardButton(text="❓ الاختبار الذكي", callback_data="feature_quiz")],
        [InlineKeyboardButton(text="📊 مخطط بياني (خريطة ذهنية)", callback_data="feature_diagram")],
        [InlineKeyboardButton(text="📑 مجموعة شرائح (PPTX)", callback_data="feature_slides")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_cancel_kb():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❌ إلغاء", callback_data="cancel")]
    ])
