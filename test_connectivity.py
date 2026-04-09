import os
import asyncio
from telegram import Bot
from dotenv import load_dotenv

load_dotenv()

async def test():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    bot = Bot(token=token)
    try:
        me = await bot.get_me()
        print(f"Success! Bot Name: {me.first_name.encode('utf-8', 'ignore').decode('utf-8')}")
        print(f"Bot Username: @{me.username}")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test())
