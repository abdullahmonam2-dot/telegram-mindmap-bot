import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def test_supabase():
    print(f"Testing connection...")
    if not DATABASE_URL:
        print("DATABASE_URL not found in .env")
        return

    # 1. Try Pooler (from .env)
    print("Trying Pooler Connection (Port 6543)...")
    try:
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=5)
        print("SUCCESS: Connected to Supabase Pooler!")
        check_db(conn)
        conn.close()
        return
    except Exception as e:
        print(f"FAIL: Pooler Connection failed: {e}")

    # 2. Try Direct Connection (Port 5432)
    project_ref = "miwnccpxfprajejhmrvz"
    password = DATABASE_URL.split(':')[2].split('@')[0] if DATABASE_URL else "UNKNOWN"
    direct_url = f"postgresql://postgres:{password}@db.{project_ref}.supabase.co:5432/postgres"
    print("\nTrying Direct Connection (Port 5432)...")
    try:
        conn = psycopg2.connect(direct_url, connect_timeout=5)
        print("SUCCESS: Connected to Supabase Direct!")
        check_db(conn)
        conn.close()
    except Exception as e:
        print(f"FAIL: Direct Connection failed: {e}")

def check_db(conn):
    try:
        c = conn.cursor()
        c.execute("SELECT version();")
        version = c.fetchone()
        print(f"PostgreSQL version: {version[0]}")
        c.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        tables = [t[0] for t in c.fetchall()]
        print(f"Tables in public schema: {tables}")
        if 'users' in tables:
            c.execute("SELECT COUNT(*) FROM users")
            count = c.fetchone()[0]
            print(f"Number of users: {count}")
    except Exception as e:
        print(f"Error during check: {e}")

if __name__ == "__main__":
    test_supabase()
