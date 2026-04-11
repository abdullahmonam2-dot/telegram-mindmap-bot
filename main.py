import asyncio
from aiogram import Bot, Dispatcher
from config import config
from src.bot.handlers import smm_handlers
from src.bot.middleware.throttling import ThrottlingMiddleware
from src.database.repository import Repository
from src.utils.logger import log

async def main():
    # Initialize components
    bot = Bot(token=config.BOT_TOKEN)
    dp = Dispatcher()
    repo = Repository(config.DATABASE_URL)
    
    # Initialize DB
    await repo.init_db()
    
    # Setup Middlewares
    dp.message.middleware(ThrottlingMiddleware(rate_limit=1.5))
    dp.callback_query.middleware(ThrottlingMiddleware(rate_limit=0.5))
    
    # Include routers
    dp.include_router(smm_handlers.router)
    dp.include_router(admin_handlers.router)
    
    # Start polling
    log.info("SMM Booster Bot (TikTok & Instagram) is starting...")
    try:
        await dp.start_polling(bot)
    except Exception as e:
        log.error(f"Critical error: {e}")
    finally:
        await bot.session.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        log.info("Bot stopped.")
