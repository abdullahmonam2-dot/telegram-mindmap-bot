from arq import create_pool
from arq.connections import RedisSettings
from config import config
from src.utils.logger import log

class TaskQueue:
    def __init__(self):
        self.redis_settings = RedisSettings.from_dsn(config.REDIS_URL)
        self._pool = None

    async def get_pool(self):
        if not self._pool:
            self._pool = await create_pool(self.redis_settings)
        return self._pool

    async def enqueue(self, task_name: str, *args, **kwargs):
        pool = await self.get_pool()
        job = await pool.enqueue_job(task_name, *args, **kwargs)
        log.info(f"Task enqueued: {task_name} (Job ID: {job.job_id})")
        return job

task_queue = TaskQueue()
