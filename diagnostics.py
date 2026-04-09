import os
import sys
import logging
from dotenv import load_dotenv
import google.generativeai as genai
from telegram import Bot
import asyncio

load_dotenv()

async def run_diagnostics():
    print("--- Diagnostic Report ---")
    
    # 1. Check Env
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    genai_key = os.getenv("GEMINI_API_KEY")
    print(f"Telegram Token: {'Found' if token else 'NOT FOUND'}")
    print(f"Gemini API Key: {'Found' if genai_key else 'NOT FOUND'}")
    
    # 2. Check Directories
    print(f"Temp directory: {'Exists' if os.path.exists('temp') else 'NOT FOUND (Creating...)'}")
    if not os.path.exists('temp'): os.makedirs('temp')
    
    # 3. Test Telegram
    print("Testing Telegram Connection...")
    try:
        bot = Bot(token=token)
        me = await bot.get_me()
        print(f"Telegram Success: Connected as @{me.username}")
    except Exception as e:
        print(f"Telegram FAILED: {e}")
        
    # 4. Test Gemini
    print("Testing Gemini Connection...")
    try:
        genai.configure(api_key=genai_key)
        model = genai.GenerativeModel("gemini-flash-latest")
        response = model.generate_content("Test")
        print(f"Gemini Success: Received response (Length: {len(response.text)})")
    except Exception as e:
        print(f"Gemini FAILED: {e}")

    # 5. Check dependencies
    try:
        import fitz
        print("PyMuPDF: OK")
    except ImportError:
        print("PyMuPDF: MISSING")
        
    try:
        from playwright.async_api import async_playwright
        print("Playwright: OK")
    except ImportError:
        print("Playwright: MISSING")

if __name__ == "__main__":
    asyncio.run(run_diagnostics())
