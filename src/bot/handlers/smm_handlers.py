from aiogram import Router, F, types
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from config import config
from src.database.repository import Repository
from src.services.smm_service import SMMService
from src.bot.keyboards import smm_keyboards
from src.utils.logger import log

router = Router()
repo = Repository(config.DATABASE_URL)
smm = SMMService()

# Mapping for the user to edit their service IDs
SERVICES_MAP = {
    "service_tiktok_followers": {"id": 100, "name": "متابعين تيكتوك", "price_per_1000": 5},
    "service_tiktok_views": {"id": 101, "name": "مشاهدات تيكتوك", "price_per_1000": 1},
    "service_insta_followers": {"id": 200, "name": "متابعين إنستقرام", "price_per_1000": 4},
    "service_insta_views": {"id": 201, "name": "مشاهدات إنستقرام", "price_per_1000": 0.5},
}

class OrderStates(StatesGroup):
    choosing_service = State()
    entering_link = State()
    entering_quantity = State()
    confirming_order = State()

@router.message(Command("start"))
async def start_cmd(message: types.Message):
    await repo.get_or_create_user(
        message.from_user.id, 
        message.from_user.username, 
        message.from_user.full_name
    )
    welcome_text = (
        f"مرحباً بك {message.from_user.full_name} في بوت الخدمات الجديد! 🚀\n\n"
        "هنا يمكنك رشق متابعين ومشاهدات تيكتوك وإنستقرام بأعلى جودة وأفضل الأسعار.\n"
        "اختر ما تريد من القائمة أدناه:"
    )
    await message.answer(welcome_text, reply_markup=smm_keyboards.get_main_menu())

@router.callback_query(F.data == "main_menu")
async def main_menu_callback(callback: types.CallbackQuery, state: FSMContext):
    await state.clear()
    await callback.message.edit_text("القائمة الرئيسية:", reply_markup=smm_keyboards.get_main_menu())

@router.callback_query(F.data == "smm_new_order")
async def new_order_callback(callback: types.CallbackQuery):
    await callback.message.edit_text("اختر المنصة التي تريد الخدمة لها:", reply_markup=smm_keyboards.get_platform_kb())

@router.callback_query(F.data.startswith("platform_"))
async def platform_callback(callback: types.CallbackQuery):
    platform = callback.data.split("_")[1]
    if platform == "tiktok":
        await callback.message.edit_text("اختر نوع خدمة تيكتوك:", reply_markup=smm_keyboards.get_tiktok_services_kb())
    elif platform == "instagram":
        await callback.message.edit_text("اختر نوع خدمة إنستقرام:", reply_markup=smm_keyboards.get_instagram_services_kb())

@router.callback_query(F.data.startswith("service_"))
async def service_selection(callback: types.CallbackQuery, state: FSMContext):
    service_key = callback.data
    service_info = SERVICES_MAP.get(service_key)
    
    if not service_info:
        await callback.answer("⚠️ هذه الخدمة غير متوفرة حالياً.", show_alert=True)
        return

    await state.update_data(service_key=service_key, service_id=service_info['id'], service_name=service_info['name'], price=service_info['price_per_1000'])
    await callback.message.edit_text(f"لقد اخترت: **{service_info['name']}**\n\nالرجاء إرسال الرابط (تيكتوك أو إنستقرام) الآن:", reply_markup=smm_keyboards.get_cancel_kb())
    await state.set_state(OrderStates.entering_link)

@router.message(OrderStates.entering_link)
async def process_link(message: types.Message, state: FSMContext):
    link = message.text
    if not (link.startswith("http") or "tiktok.com" in link or "instagram.com" in link):
        await message.answer("❌ الرابط غير صحيح. يرجى إرسال رابط صالح.")
        return
    
    await state.update_data(link=link)
    await message.answer("حسناً، أدخل الكمية المطلوبة (أرقام فقط):", reply_markup=smm_keyboards.get_cancel_kb())
    await state.set_state(OrderStates.entering_quantity)

@router.message(OrderStates.entering_quantity)
async def process_quantity(message: types.Message, state: FSMContext):
    if not message.text.isdigit():
        await message.answer("❌ يرجى إدخال أرقام فقط للكمية.")
        return
    
    quantity = int(message.text)
    if quantity < 10:
        await message.answer("❌ أقل كمية يمكن طلبها هي 10.")
        return

    data = await state.get_data()
    price_per_1000 = data['price']
    total_cost = (quantity / 1000) * price_per_1000
    
    await state.update_data(quantity=quantity, total_cost=total_cost)
    
    confirm_text = (
        "📊 **تفاصيل الطلب:**\n\n"
        f"🔹 الخدمة: {data['service_name']}\n"
        f"🔗 الرابط: {data['link']}\n"
        f"🔢 الكمية: {quantity}\n"
        f"💰 التكلفة المقدرة: {total_cost:.2f}$ (أو نقاط)\n\n"
        "هل تريد تأكيد الطلب؟"
    )
    
    kb = smm_keyboards.get_cancel_kb()
    kb.inline_keyboard.insert(0, [types.InlineKeyboardButton(text="✅ تأكيد الطلب", callback_data="confirm_now")])
    
    await message.answer(confirm_text, reply_markup=kb)
    await state.set_state(OrderStates.confirming_order)

@router.callback_query(F.data == "confirm_now", OrderStates.confirming_order)
async def confirm_order(callback: types.CallbackQuery, state: FSMContext):
    data = await state.get_data()
    user_id = callback.from_user.id
    
    # Check balance
    user = await repo.get_or_create_user(user_id)
    if user.balance < data['total_cost']:
        await callback.message.edit_text(
            f"❌ نعتذر، رصيدك غير كافٍ.\n"
            f"💰 رصيدك الحالي: {user.balance:.2f}$\n"
            f"💵 تكلفة الطلب: {data['total_cost']:.2f}$\n\n"
            "يرجى شحن رصيدك أولاً.",
            reply_markup=smm_keyboards.get_main_menu()
        )
        await state.clear()
        return

    # Call API
    api_response = await smm.add_order(data['service_id'], data['link'], data['quantity'])
    
    if "order" in api_response:
        order_id = api_response['order']
        # Deduct balance
        await repo.deduct_balance(user_id, data['total_cost'])
        # Save order
        await repo.create_order(user_id, order_id, data['service_id'], data['link'], data['quantity'], data['total_cost'])
        
        await callback.message.edit_text(
            f"✅ تم تنفيذ طلبك بنجاح!\n"
            f"🆔 رقم الطلب: `{order_id}`\n"
            f"💰 تم خصم: {data['total_cost']:.2f}$\n\n"
            "يمكنك متابعة حالة الطلب من قسم (حسابي).",
            reply_markup=smm_keyboards.get_main_menu()
        )
    else:
        error_msg = api_response.get("error", "فشل غير معروف")
        await callback.message.edit_text(f"❌ حدث خطأ عند إرسال الطلب للمزود:\n`{error_msg}`", reply_markup=smm_keyboards.get_main_menu())
    
    await state.clear()

@router.callback_query(F.data == "smm_profile")
async def profile_callback(callback: types.CallbackQuery):
    user = await repo.get_or_create_user(callback.from_user.id)
    orders = await repo.get_user_orders(callback.from_user.id, limit=5)
    
    profile_text = (
        f"👤 **ملف المستخدم:** {callback.from_user.full_name}\n\n"
        f"💰 الرصيد: {user.balance:.2f}$\n"
        f"📅 تاريخ الانضمام: {user.created_at.strftime('%Y-%m-%d')}\n\n"
        "📜 **آخر 5 طلبات:**\n"
    )
    
    if not orders:
        profile_text += "_لا توجد طلبات سابقة._"
    else:
        for o in orders:
            profile_text += f"- طلب #{o.order_id} | كلف {o.cost}$ | {o.status}\n"
            
    await callback.message.edit_text(profile_text, reply_markup=smm_keyboards.get_main_menu())

@router.callback_query(F.data == "smm_recharge")
async def recharge_callback(callback: types.CallbackQuery):
    recharge_text = (
        "💳 **شحن الرصيد:**\n\n"
        "لشحن رصيدك حالياً، يرجى التواصل مع الإدارة وإرسال معرف حسابك (ID).\n\n"
        f"🆔 معرفك: `{callback.from_user.id}`\n\n"
        "سيتم إضافة الدفع التلقائي قريباً."
    )
    await callback.message.edit_text(recharge_text, reply_markup=smm_keyboards.get_main_menu())

@router.callback_query(F.data == "smm_support")
async def support_callback(callback: types.CallbackQuery):
    await callback.message.edit_text("📞 بخصوص أي استفسار، تواصل مع المطور: \n\n @Administrator", reply_markup=smm_keyboards.get_main_menu())
