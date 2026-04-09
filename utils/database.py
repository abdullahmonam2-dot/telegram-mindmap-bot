import sqlite3
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_PATH = "users.db"
DATABASE_URL = os.getenv("DATABASE_URL")
_USING_POSTGRES = False

def get_connection():
    global _USING_POSTGRES
    if DATABASE_URL:
        try:
            # Try PostgreSQL (Supabase)
            conn = psycopg2.connect(DATABASE_URL)
            _USING_POSTGRES = True
            return conn
        except Exception as e:
            print(f"⚠️ PostgreSQL connection failed: {e}. Falling back to SQLite.")
            _USING_POSTGRES = False
            return sqlite3.connect(DB_PATH)
    else:
        # SQLite
        _USING_POSTGRES = False
        return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_connection()
    c = conn.cursor()
    # Note: We check _USING_POSTGRES based on the successful connection
    if _USING_POSTGRES:
        # PostgreSQL syntax
        c.execute('''CREATE TABLE IF NOT EXISTS users
                     (user_id BIGINT PRIMARY KEY, username TEXT, last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
        c.execute('''CREATE TABLE IF NOT EXISTS history (
                        id SERIAL PRIMARY KEY,
                        user_id BIGINT,
                        file_type TEXT,
                        file_id TEXT,
                        caption TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                     )''')
    else:
        # SQLite syntax
        c.execute('''CREATE TABLE IF NOT EXISTS users
                     (user_id INTEGER PRIMARY KEY, username TEXT, last_seen DATETIME DEFAULT CURRENT_TIMESTAMP)''')
        c.execute('''CREATE TABLE IF NOT EXISTS history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER,
                        file_type TEXT,
                        file_id TEXT,
                        caption TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                     )''')
    conn.commit()
    conn.close()

def add_user(user_id, username=None):
    try:
        conn = get_connection()
        c = conn.cursor()
        if _USING_POSTGRES:
            c.execute("INSERT INTO users (user_id, username, last_seen) VALUES (%s, %s, CURRENT_TIMESTAMP) ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username, last_seen = EXCLUDED.last_seen", (user_id, username))
        else:
            c.execute("INSERT OR REPLACE INTO users (user_id, username, last_seen) VALUES (?, ?, CURRENT_TIMESTAMP)", (user_id, username))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Database Error (Add User): {e}")

def get_all_users():
    try:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT user_id FROM users")
        users = [row[0] for row in c.fetchall()]
        conn.close()
        return users
    except Exception as e:
        print(f"Database Error (Get All): {e}")
        return []

def count_users():
    try:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM users")
        count = c.fetchone()[0]
        conn.close()
        return count
    except Exception as e:
        print(f"Database Error (Count User): {e}")
        return 0

def add_history_entry(user_id, file_type, file_id, caption=None):
    try:
        conn = get_connection()
        c = conn.cursor()
        if _USING_POSTGRES:
            c.execute("INSERT INTO history (user_id, file_type, file_id, caption) VALUES (%s, %s, %s, %s)", (user_id, file_type, file_id, caption))
        else:
            c.execute("INSERT INTO history (user_id, file_type, file_id, caption) VALUES (?, ?, ?, ?)", (user_id, file_type, file_id, caption))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Database Error (Add History): {e}")

def get_db_status():
    # We call get_connection once to ensure _USING_POSTGRES is updated
    try:
        conn = get_connection()
        conn.close()
    except: pass
    return "Supabase (PostgreSQL)" if _USING_POSTGRES else "SQLite (Local Fallback)"

# Initialize on import
init_db()
