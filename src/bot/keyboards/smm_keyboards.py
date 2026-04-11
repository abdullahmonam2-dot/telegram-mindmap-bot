from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder

def get_main_menu():
    buttons = [
        [InlineKeyboardButton(text="🚀 طلب خدمة جديدة", callback_data="smm_new_order")],
        [InlineKeyboardButton(text="👤 حسابي", callback_data="smm_profile")],
        [InlineKeyboardButton(text="💳 شحن الرصيد", callback_data="smm_recharge")],
        [InlineKeyboardButton(text="📞 الدعم الفني", callback_data="smm_support")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_platform_kb():
    buttons = [
        [InlineKeyboardButton(text="📱 TikTok - تيكتوك", callback_data="platform_tiktok")],
        [InlineKeyboardButton(text="📸 Instagram - إنستقرام", callback_data="platform_instagram")],
        [InlineKeyboardButton(text="🔙 العودة", callback_data="main_menu")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_tiktok_services_kb():
    buttons = [
        [InlineKeyboardButton(text="👥 متابعين تيكتوك", callback_data="service_tiktok_followers")],
        [InlineKeyboardButton(text="👁 مشاهدات تيكتوك", callback_data="service_tiktok_views")],
        [InlineKeyboardButton(text="🔙 العودة", callback_data="smm_new_order")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_instagram_services_kb():
    buttons = [
        [InlineKeyboardButton(text="👥 متابعين إنستقرام", callback_data="service_insta_followers")],
        [InlineKeyboardButton(text="👁 مشاهدات إنستقرام", callback_data="service_insta_views")],
        [InlineKeyboardButton(text="🔙 العودة", callback_data="smm_new_order")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_cancel_kb():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❌ إلغاء", callback_data="main_menu")]
    ])
