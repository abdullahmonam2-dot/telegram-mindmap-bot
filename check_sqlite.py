import sqlite3

def check_users():
    try:
        conn = sqlite3.connect("users_desktop.db")
        c = conn.cursor()
        c.execute("SELECT * FROM users;")
        rows = c.fetchall()
        print(f"Users in SQLite: {rows}")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_users()
