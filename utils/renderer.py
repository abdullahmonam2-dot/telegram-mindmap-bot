import os
import asyncio
import json
from playwright.async_api import async_playwright
from dotenv import load_dotenv

load_dotenv()

MARKMAP_HTML_TEMPLATE = """
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MINDMAP ARABIC</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: #f8fafc; /* Professional light background */
      font-family: 'Cairo', sans-serif;
      overflow: hidden;
    }
    #markmapSvg {
      width: 100vw;
      height: 100vh;
      display: block;
      direction: ltr; /* Engine requirement */
    }
    /* Official Markmap Node Styling */
    .markmap-node {
      cursor: pointer;
    }
    .markmap-node div {
      padding: 4px 8px;
      border-radius: 4px;
      color: #1e293b;
      font-size: 16px;
      font-weight: 500;
      direction: rtl !important;
      text-align: right;
      white-space: nowrap;
    }
    .watermark {
      position: absolute;
      bottom: 20px;
      left: 20px;
      color: #64748b;
      font-size: 14px;
      font-weight: bold;
      z-index: 100;
      background: rgba(255, 255, 255, 0.8);
      padding: 4px 12px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/markmap-view/dist/style.css">
  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-lib/dist/browser/index.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-view/dist/browser/index.js"></script>
</head>
<body>
  <div class="watermark">
    <span>{watermark_name}</span>
  </div>
  <svg id="markmapSvg"></svg>
  
  <script>
    document.addEventListener("DOMContentLoaded", () => {
      try {
        const markdown = {markdown_data};
        const { Markmap, Transformer } = window.markmap;
        
        const transformer = new Transformer();
        const { root } = transformer.transform(markdown);
        
        Markmap.create('#markmapSvg', {
            autoFit: true,
            duration: 500,
            initialExpandLevel: 999
        }, root);
        
      } catch (e) {
        console.error("Markmap Failure:", e);
      }
    });
  </script>
</body>
</html>
"""

def generate_interactive_html(markdown_str, output_path, watermark_name="صانع الخرائط الذهنية الذكي"):
    """
    Generates a standalone interactive HTML file from Markmap Markdown.
    """
    markdown_str_for_js = json.dumps(markdown_str)
    
    html_content = MARKMAP_HTML_TEMPLATE.format(
        watermark_name=watermark_name,
        markdown_data=markdown_str_for_js
    )
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    return output_path

class BrowserManager:
    """ Manages a Playwright browser instance with extreme memory care for Cloud hosting. """
    _playwright = None
    _browser = None

    @classmethod
    async def get_browser(self):
        from playwright.async_api import async_playwright
        if self._playwright is None:
            self._playwright = await async_playwright().start()
        
        if self._browser is None:
            self._browser = await self._playwright.chromium.launch(args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--disable-gpu",
                "--no-first-run",
                "--no-zygote",
                "--single-process" # Helps on extremely low RAM (Docker/Render)
            ])
        return self._browser

    @classmethod
    async def close_all(self):
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None

async def render_markmap_to_image(markdown_str, output_path, watermark_name="Smart Mind Map Bot"):
    """
    Renders the Markmap Markdown string to a PNG image.
    Uses a fresh context and closes browser after use to save RAM on Render.
    """
    markdown_str_for_js = json.dumps(markdown_str)
    
    html_content = MARKMAP_HTML_TEMPLATE.format(
        watermark_name=watermark_name,
        markdown_data=markdown_str_for_js
    )
    
    temp_html = os.path.join("temp", f"map_{os.path.basename(output_path)}.html")
    if not os.path.exists("temp"): os.makedirs("temp")
    
    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    try:
        browser = await BrowserManager.get_browser()
        
        context = await browser.new_context(
            viewport={"width": 1600, "height": 1000},
            device_scale_factor=2 # Slightly reduced for memory stability
        )
        page = await context.new_page()
        
        await page.goto(f"file://{os.path.abspath(temp_html)}", wait_until="networkidle", timeout=60000)
        
        # Wait for content to render
        try:
            await page.wait_for_selector("foreignObject", timeout=20000)
        except:
            pass
        
        await asyncio.sleep(1) # Brief pause for stability
        
        await page.screenshot(path=output_path, full_page=True, omit_background=False)
        
        await context.close()
        
        # PROACTIVE MEMORY CLEANUP: Close browser after render on Render Free Tier
        # This prevents Chromium from sitting in RAM indefinitely
        await BrowserManager.close_all()
        
    except Exception as e:
        print(f"Playwright Error: {e}")
        # Ensure cleanup even on failure
        await BrowserManager.close_all()
    finally:
        if os.path.exists(temp_html):
            os.remove(temp_html)
            
    return output_path
