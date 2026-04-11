import os
import uuid
import asyncio
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display
from src.services.tts_service import tts_service
from config import config
from src.utils.logger import log
import subprocess

class VideoService:
    def __init__(self):
        self.font_path = os.path.join(config.ASSETS_DIR, "fonts", "Amiri-Regular.ttf")
        # Fallback fonts
        if not os.path.exists(self.font_path):
            fallbacks = ["C:\\Windows\\Fonts\\arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
            for f in fallbacks:
                if os.path.exists(f):
                    self.font_path = f
                    break

    def _prepare_arabic_text(self, text):
        reshaped_text = arabic_reshaper.reshape(text)
        return get_display(reshaped_text)

    def _create_slide_image(self, title, content, output_path):
        """Create a PNG image for a slide."""
        width, height = 1280, 720
        img = Image.new('RGB', (width, height), color=(30, 30, 30))
        draw = ImageDraw.Draw(img)
        
        try:
            title_font = ImageFont.truetype(self.font_path, 60)
            body_font = ImageFont.truetype(self.font_path, 40)
        except:
            title_font = ImageFont.load_default()
            body_font = ImageFont.load_default()

        # Draw Title
        title_ar = self._prepare_arabic_text(title)
        draw.text((width/2, 100), title_ar, font=title_font, fill=(255, 255, 255), anchor="mm")
        
        # Draw Body (simple wrapping)
        body_ar = self._prepare_arabic_text(content)
        draw.text((width/2, 400), body_ar, font=body_font, fill=(200, 200, 200), anchor="mm")
        
        img.save(output_path)
        return output_path

    async def generate_video(self, slides_data):
        """
        Expects slides_data as list of dicts: [{'title': '...', 'content': '...'}]
        Returns path to final mp4.
        """
        session_id = str(uuid.uuid4())
        session_dir = os.path.join(config.TEMP_DIR, session_id)
        os.makedirs(session_dir, exist_ok=True)
        
        clips = []
        
        for i, slide in enumerate(slides_data[:5]): # Limit to 5 slides for speed
            img_path = os.path.join(session_dir, f"slide_{i}.png")
            audio_path = os.path.join(session_dir, f"audio_{i}.mp3")
            clip_path = os.path.join(session_dir, f"clip_{i}.mp4")
            
            # Create Image
            self._create_slide_image(slide['title'], slide['content'], img_path)
            
            # Create Audio
            tts_text = f"{slide['title']}. {slide['content']}"
            await tts_service.generate_audio(tts_text, audio_path)
            
            # Combine image and audio into a clip using ffmpeg
            # cmd: ffmpeg -loop 1 -i image.png -i audio.mp3 -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest out.mp4
            cmd = [
                "ffmpeg", "-y", "-loop", "1", "-i", img_path, "-i", audio_path,
                "-c:v", "libx264", "-tune", "stillimage", "-c:a", "aac", 
                "-b:a", "192k", "-pix_fmt", "yuv420p", "-shortest", clip_path
            ]
            
            process = await asyncio.create_subprocess_exec(*cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            await process.communicate()
            
            if os.path.exists(clip_path):
                clips.append(clip_path)

        if not clips:
            return None
            
        # Concatenate clips
        list_path = os.path.join(session_dir, "clips.txt")
        with open(list_path, "w") as f:
            for clip in clips:
                f.write(f"file '{os.path.abspath(clip)}'\n")
        
        final_video = os.path.join(config.TEMP_DIR, f"video_{session_id}.mp4")
        concat_cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_path,
            "-c", "copy", final_video
        ]
        
        process = await asyncio.create_subprocess_exec(*concat_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        await process.communicate()
        
        return final_video

video_service = VideoService()
