from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

def get_admin_main():
    buttons = [
        [InlineKeyboardButton(text="💰 شحن رصيد مستخدم", callback_data="admin_recharge")],
        [InlineKeyboardButton(text="📊 إحصائيات البوت", callback_data="admin_stats")],
        [InlineKeyboardButton(text="📢 رسالة جماعية (Broadcast)", callback_data="admin_broadcast")],
        [InlineKeyboardButton(text="🔙 القائمة الرئيسية", callback_data="main_menu")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_admin_cancel():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❌ إلغاء", callback_data="admin_main")]
    ])
