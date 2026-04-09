import asyncio
import os
from utils.gemini_handler import generate_mindmap_json
from utils.renderer import render_markmap_to_image
from dotenv import load_dotenv

load_dotenv()

async def debug_mindmap():
    print("--- Mindmap Debug Flow ---")
    content = "IPv6 features including dynamic location switching, Mobile IPv6, and packet labeling."
    print(f"Input Content: {content}")
    
    print("Step 1: Generating JSON...")
    json_data = await generate_mindmap_json(content)
    if json_data:
        print(f"JSON Success! Length: {len(json_data)}")
        print(f"JSON Sample: {json_data[:100]}")
    else:
        print("JSON FAILED: generate_mindmap_json returned None")
        return

    print("Step 2: Rendering Image...")
    output_path = "temp/debug_mm.png"
    if not os.path.exists("temp"): os.makedirs("temp")
    
    await render_markmap_to_image(json_data, output_path)
    
    if os.path.exists(output_path):
        print(f"Image Rendered! Path: {output_path}")
        # We'll leave it there and maybe I can see it if I list files
    else:
        print("Image Rendering FAILED (No file created)")

if __name__ == "__main__":
    asyncio.run(debug_mindmap())
