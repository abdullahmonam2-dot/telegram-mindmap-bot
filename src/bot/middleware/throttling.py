from typing import Any, Awaitable, Callable, Dict
from aiogram import BaseMiddleware
from aiogram.types import Message, CallbackQuery
from aiocache import Cache
from src.utils.logger import log

class ThrottlingMiddleware(BaseMiddleware):
    def __init__(self, rate_limit: float = 1.0):
        self.cache = Cache(Cache.MEMORY) # In production for 10k users, use REDIS
        self.rate_limit = rate_limit
        super().__init__()

    async def __call__(
        self,
        handler: Callable[[Message, Dict[str, Any]], Awaitable[Any]],
        event: Message,
        data: Dict[str, Any]
    ) -> Any:
        user_id = event.from_user.id
        key = f"throttle_{user_id}"
        
        if await self.cache.exists(key):
            log.warning(f"User {user_id} is being throttled.")
            if isinstance(event, Message):
                await event.answer("⚠️ يرجى التمهل قليلاً! لا تقم بإرسال الطلبات بسرعة كبيرة.")
            return
            
        await self.cache.set(key, True, ttl=self.rate_limit)
        return await handler(event, data)
