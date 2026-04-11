import asyncio
from src.database.repository import Repository
from config import config

async def recharge():
    repo = Repository(config.DATABASE_URL)
    
    # اطلب من المستخدم إدخال معرفه (ID) والمبلغ
    print("--- سكربت شحن رصيد سريع ---")
    user_id = input("أدخل معرف تليجرام الخاص بك (Telegram ID): ")
    amount = input("أدخل المبلغ الذي تود إضافته (مثلاً 100): ")
    
    try:
        user_id = int(user_id)
        amount = int(amount)
        
        # تأكد من وجود المستخدم في قاعدة البيانات أولاً
        await repo.get_or_create_user(user_id, "Admin", "Admin User")
        
        new_balance = await repo.add_balance(user_id, amount)
        print(f"✅ تم بنجاح! رصيدك الجديد هو: {new_balance}$")
    except ValueError:
        print("❌ خطأ: يرجى إدخال أرقام صحيحة.")
    except Exception as e:
        print(f"❌ حدث خطأ: {e}")

if __name__ == "__main__":
    asyncio.run(recharge())
