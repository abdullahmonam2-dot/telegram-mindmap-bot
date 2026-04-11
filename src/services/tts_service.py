import edge_tts
from config import config
from src.utils.logger import log
import os
import uuid

class TTSService:
    def __init__(self):
        self.voice = config.DEFAULT_VOICE

    async def generate_audio(self, text: str, output_path: str = None):
        """Generate Arabic audio from text using edge-tts."""
        if not output_path:
            output_path = os.path.join(config.TEMP_DIR, f"audio_{uuid.uuid4()}.mp3")
            
        try:
            communicate = edge_tts.Communicate(text, self.voice)
            await communicate.save(output_path)
            log.info(f"Audio generated: {output_path}")
            return output_path
        except Exception as e:
            log.error(f"TTS Error: {e}")
            return None

tts_service = TTSService()
