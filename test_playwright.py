import asyncio
import os
from playwright.async_api import async_playwright

async def test_playwright():
    print("Testing Playwright...")
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()
            await page.set_content("<h1>Test</h1>")
            await page.screenshot(path="temp/test_screenshot.png")
            await browser.close()
            print("Playwright Success!")
            if os.path.exists("temp/test_screenshot.png"):
                print("Screenshot exists!")
                os.remove("temp/test_screenshot.png")
    except Exception as e:
        print(f"Playwright FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(test_playwright())
