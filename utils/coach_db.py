import sqlite3
import os
import psycopg2
from utils.database import get_connection, _USING_POSTGRES

def init_coach_db():
    conn = get_connection()
    c = conn.cursor()
    
    if _USING_POSTGRES:
        c.execute('''CREATE TABLE IF NOT EXISTS study_coach_profiles (
                        user_id BIGINT PRIMARY KEY,
                        name TEXT,
                        stage TEXT,
                        daily_hours INTEGER,
                        exam_date TEXT,
                        start_time TEXT,
                        generated_plan TEXT,
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                     )''')
    else:
        c.execute('''CREATE TABLE IF NOT EXISTS study_coach_profiles (
                        user_id INTEGER PRIMARY KEY,
                        name TEXT,
                        stage TEXT,
                        daily_hours INTEGER,
                        exam_date TEXT,
                        start_time TEXT,
                        generated_plan TEXT,
                        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
                     )''')
    
    conn.commit()
    conn.close()

def save_coach_profile(user_id, name, stage, daily_hours, exam_date, start_time, generated_plan):
    try:
        conn = get_connection()
        c = conn.cursor()
        if _USING_POSTGRES:
            c.execute("""
                INSERT INTO study_coach_profiles (user_id, name, stage, daily_hours, exam_date, start_time, generated_plan, last_updated)
                VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    stage = EXCLUDED.stage,
                    daily_hours = EXCLUDED.daily_hours,
                    exam_date = EXCLUDED.exam_date,
                    start_time = EXCLUDED.start_time,
                    generated_plan = EXCLUDED.generated_plan,
                    last_updated = CURRENT_TIMESTAMP
            """, (user_id, name, stage, daily_hours, exam_date, start_time, generated_plan))
        else:
            c.execute("""
                INSERT OR REPLACE INTO study_coach_profiles (user_id, name, stage, daily_hours, exam_date, start_time, generated_plan, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (user_id, name, stage, daily_hours, exam_date, start_time, generated_plan))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Coach DB Error (Save Profile): {e}")

def get_coach_profile(user_id):
    try:
        conn = get_connection()
        c = conn.cursor()
        if _USING_POSTGRES:
            c.execute("SELECT * FROM study_coach_profiles WHERE user_id = %s", (user_id,))
        else:
            c.execute("SELECT * FROM study_coach_profiles WHERE user_id = ?", (user_id,))
        row = c.fetchone()
        conn.close()
        if row:
            return {
                "user_id": row[0],
                "name": row[1],
                "stage": row[2],
                "daily_hours": row[3],
                "exam_date": row[4],
                "start_time": row[5],
                "generated_plan": row[6]
            }
        return None
    except Exception as e:
        print(f"Coach DB Error (Get Profile): {e}")
        return None

def get_all_coach_profiles():
    try:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM study_coach_profiles")
        rows = c.fetchall()
        profiles = []
        for row in rows:
            profiles.append({
                "user_id": row[0],
                "name": row[1],
                "stage": row[2],
                "daily_hours": row[3],
                "exam_date": row[4],
                "start_time": row[5],
                "generated_plan": row[6]
            })
        conn.close()
        return profiles
    except Exception as e:
        print(f"Coach DB Error (Get All Profiles): {e}")
        return []

# Initialize on import
init_coach_db()
