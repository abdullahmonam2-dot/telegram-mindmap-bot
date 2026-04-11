import aiohttp
from config import config
from src.utils.logger import log

class SMMService:
    def __init__(self):
        self.api_url = config.SMM_API_URL
        self.api_key = config.SMM_API_KEY

    async def _post(self, action, **kwargs):
        payload = {
            'key': self.api_key,
            'action': action,
            **kwargs
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.api_url, data=payload) as response:
                    return await response.json()
        except Exception as e:
            log.error(f"SMM API Error: {action} - {e}")
            return {"error": str(e)}

    async def get_services(self):
        return await self._post('services')

    async def add_order(self, service_id, link, quantity):
        return await self._post('add', service=service_id, link=link, quantity=quantity)

    async def get_status(self, order_id):
        return await self._post('status', order=order_id)

    async def get_balance(self):
        return await self._post('balance')
