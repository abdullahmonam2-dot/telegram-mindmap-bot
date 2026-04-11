from aiogram import Router, F, types
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from config import config
from src.database.repository import Repository
from src.bot.keyboards import admin_keyboards
from src.utils.logger import log
import asyncio

router = Router()
repo = Repository(config.DATABASE_URL)

class AdminStates(StatesGroup):
    entering_user_id = State()
    entering_amount = State()
    entering_broadcast_msg = State()

# Middleware-like check for admin
def is_admin(user_id: int):
    return user_id == config.ADMIN_ID

@router.message(Command("admin"))
async def admin_main(message: types.Message):
    if not is_admin(message.from_user.id):
        return
    await message.answer("🛠 **لوحة تحكم الإدمن:**\nمرحباً بك في وحدة التحكم السرية.", reply_markup=admin_keyboards.get_admin_main())

@router.callback_query(F.data == "admin_main")
async def admin_main_callback(callback: types.CallbackQuery, state: FSMContext):
    if not is_admin(callback.from_user.id): return
    await state.clear()
    await callback.message.edit_text("🛠 **لوحة تحكم الإدمن:**", reply_markup=admin_keyboards.get_admin_main())

@router.callback_query(F.data == "admin_stats")
async def admin_stats_callback(callback: types.CallbackQuery):
    if not is_admin(callback.from_user.id): return
    stats = await repo.get_stats()
    text = (
        "📊 **إحصائيات البوت:**\n\n"
        f"👥 عدد المستخدمين: {stats['users']}\n"
        f"📦 إجمالي الطلبات: {stats['orders']}\n"
    )
    await callback.message.edit_text(text, reply_markup=admin_keyboards.get_admin_main())

# Recharge Flow
@router.callback_query(F.data == "admin_recharge")
async def admin_recharge_start(callback: types.CallbackQuery, state: FSMContext):
    if not is_admin(callback.from_user.id): return
    await callback.message.edit_text("💰 أدخل معرف المستخدم (User ID) المراد شحنه:", reply_markup=admin_keyboards.get_admin_cancel())
    await state.set_state(AdminStates.entering_user_id)

@router.message(AdminStates.entering_user_id)
async def process_recharge_id(message: types.Message, state: FSMContext):
    if not is_admin(message.from_user.id): return
    if not message.text.isdigit():
        await message.answer("❌ يرجى إدخال أرقام فقط للمعرف.")
        return
    await state.update_data(target_id=int(message.text))
    await message.answer("أدخل المبلغ الذي تود إضافته لرصيده:")
    await state.set_state(AdminStates.entering_amount)

@router.message(AdminStates.entering_amount)
async def process_recharge_amount(message: types.Message, state: FSMContext):
    if not is_admin(message.from_user.id): return
    if not message.text.replace('.', '', 1).isdigit():
        await message.answer("❌ يرجى إدخال مبلغ صحيح.")
        return
    
    amount = float(message.text)
    data = await state.get_data()
    target_id = data['target_id']
    
    try:
        new_balance = await repo.add_balance(target_id, amount)
        await message.answer(f"✅ تم شحن {amount}$ للمستخدم `{target_id}` بنجاح!\nالرصيد الكلي له الآن: {new_balance}$", reply_markup=admin_keyboards.get_admin_main())
        
        # Notify user if possible
        try:
            await message.bot.send_message(target_id, f"🎉 تم شحن حسابك بمبلغ: {amount}$\n رصيدك الحالي هو: {new_balance}$")
        except:
            await message.answer("⚠️ تم الشحن لكن تعذر إرسال إشعار للمستخدم (ربما قام بحظر البوت).")
            
    except Exception as e:
        await message.answer(f"❌ حدث خطأ أثناء الشحن: {e}")
    
    await state.clear()

# Broadcast Flow
@router.callback_query(F.data == "admin_broadcast")
async def admin_broadcast_start(callback: types.CallbackQuery, state: FSMContext):
    if not is_admin(callback.from_user.id): return
    await callback.message.edit_text("📢 أرسل الرسالة التي تريد تعميمها على جميع المستخدمين:", reply_markup=admin_keyboards.get_admin_cancel())
    await state.set_state(AdminStates.entering_broadcast_msg)

@router.message(AdminStates.entering_broadcast_msg)
async def process_broadcast(message: types.Message, state: FSMContext):
    if not is_admin(message.from_user.id): return
    broadcast_msg = message.text
    user_ids = await repo.get_all_user_ids()
    
    await message.answer(f"⏳ جاري البدء في إرسال الرسالة إلى {len(user_ids)} مستخدم...")
    
    success = 0
    fail = 0
    for uid in user_ids:
        try:
            await message.bot.send_message(uid, f"📢 **تنبيه من الإدارة:**\n\n{broadcast_msg}")
            success += 1
            await asyncio.sleep(0.05) # Rate limiting
        except:
            fail += 1
            
    await message.answer(f"✅ انتهى الإرسال!\nتم الإرسال لـ: {success}\nفشل: {fail}", reply_markup=admin_keyboards.get_admin_main())
    await state.clear()
