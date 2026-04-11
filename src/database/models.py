from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, DeclarativeBase

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    telegram_id = Column(Integer, unique=True, nullable=False)
    username = Column(String)
    full_name = Column(String)
    balance = Column(Integer, default=0) # الرصيد بالدولار أو النقاط
    created_at = Column(DateTime, default=datetime.utcnow)
    
    orders = relationship("SMMOrder", back_populates="user")

class SMMOrder(Base):
    __tablename__ = 'smm_orders'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    order_id = Column(Integer)  # ID from SMM Panel
    service_id = Column(Integer)
    link = Column(String)
    quantity = Column(Integer)
    status = Column(String, default="Pending")
    cost = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="orders")
