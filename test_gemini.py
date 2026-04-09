import asyncio
import os
from utils.gemini_handler import generate_summary
from dotenv import load_dotenv

load_dotenv()

async def test_gemini():
    print("Testing Gemini connectivity (Gemini 2.0 Flash)...")
    content = "This is a quick test to verify API key status."
    try:
        response = await generate_summary(content)
        if response and "ERROR_" not in str(response):
            print(f"Success! Key is Working. Response length: {len(response)}")
            print(f"Partial response: {response[:50]}...")
        else:
            print(f"Failed! Gemini returned: {response}")
    except Exception as e:
        print(f"Exception occurred: {e}")

if __name__ == "__main__":
    asyncio.run(test_gemini())
