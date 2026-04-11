from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import func
from sqlalchemy.future import select
from .models import Base, User, SMMOrder
from src.utils.logger import log

class Repository:
    def __init__(self, db_url: str):
        self.engine = create_async_engine(db_url, echo=False)
        self.SessionLocal = async_sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

    async def init_db(self):
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        log.info("Database initialized.")

    async def get_or_create_user(self, telegram_id: int, username: str = None, full_name: str = None):
        async with self.SessionLocal() as session:
            result = await session.execute(select(User).where(User.telegram_id == telegram_id))
            user = result.scalar_one_or_none()
            
            if not user:
                user = User(telegram_id=telegram_id, username=username, full_name=full_name, balance=0)
                session.add(user)
                await session.commit()
                log.info(f"New user created: {telegram_id}")
            else:
                # Update username/name if changed
                changed = False
                if user.username != username:
                    user.username = username
                    changed = True
                if user.full_name != full_name:
                    user.full_name = full_name
                    changed = True
                if changed:
                    await session.commit()
            
            # Refresh to get latest data
            result = await session.execute(select(User).where(User.telegram_id == telegram_id))
            return result.scalar_one()

    async def add_balance(self, telegram_id: int, amount: int):
        async with self.SessionLocal() as session:
            user = await self.get_or_create_user(telegram_id)
            user.balance += amount
            await session.commit()
            return user.balance

    async def deduct_balance(self, telegram_id: int, amount: int):
        async with self.SessionLocal() as session:
            user = await self.get_or_create_user(telegram_id)
            if user.balance >= amount:
                user.balance -= amount
                await session.commit()
                return True
            return False

    async def create_order(self, telegram_id: int, order_id: int, service_id: int, link: str, quantity: int, cost: int):
        async with self.SessionLocal() as session:
            user = await self.get_or_create_user(telegram_id)
            order = SMMOrder(
                user_id=user.id,
                order_id=order_id,
                service_id=service_id,
                link=link,
                quantity=quantity,
                cost=cost
            )
            session.add(order)
            await session.commit()
            return order

    async def get_user_orders(self, telegram_id: int, limit: int = 5):
        async with self.SessionLocal() as session:
            user = await self.get_or_create_user(telegram_id)
            result = await session.execute(
                select(SMMOrder).where(SMMOrder.user_id == user.id).order_by(SMMOrder.id.desc()).limit(limit)
            )
            return result.scalars().all()

    async def get_stats(self):
        async with self.SessionLocal() as session:
            users_count = await session.execute(select(func.count(User.id)))
            orders_count = await session.execute(select(func.count(SMMOrder.id)))
            return {
                "users": users_count.scalar(),
                "orders": orders_count.scalar()
            }

    async def get_all_user_ids(self):
        async with self.SessionLocal() as session:
            result = await session.execute(select(User.telegram_id))
            return result.scalars().all()
