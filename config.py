import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
    SMM_API_URL = os.getenv("SMM_API_URL", "https://smmcpan.com/api/v2")
    SMM_API_KEY = os.getenv("SMM_API_KEY", "18198d40170b2e82a65603df7dd44f27")
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./data/bot_database.db")
    ADMIN_ID = int(os.getenv("ADMIN_ID", 513968051)) # معرف المطور
    
    # Paths
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, "data")
    TEMP_DIR = os.path.join(DATA_DIR, "temp")
    
    # Ensure directories exist
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(TEMP_DIR, exist_ok=True)

config = Config()
