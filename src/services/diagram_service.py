import base64
import requests
from src.utils.logger import log
import os
import uuid
from config import config

class DiagramService:
    def __init__(self):
        self.api_url = "https://mermaid.ink/img/"

    async def generate_diagram(self, mermaid_code: str):
        """Convert Mermaid code to an image using mermaid.ink."""
        try:
            # Clean up mermaid code (sometimes LLM adds markdown blocks)
            mermaid_code = mermaid_code.replace("```mermaid", "").replace("```", "").strip()
            
            # Encode code for URL
            sample_string_bytes = mermaid_code.encode("ascii")
            base64_bytes = base64.b64encode(sample_string_bytes)
            base64_string = base64_bytes.decode("ascii")
            
            image_url = self.api_url + base64_string
            
            # Download image
            response = requests.get(image_url)
            if response.status_code == 200:
                file_path = os.path.join(config.TEMP_DIR, f"diagram_{uuid.uuid4()}.png")
                with open(file_path, "wb") as f:
                    f.write(response.content)
                log.info(f"Diagram generated: {file_path}")
                return file_path
            else:
                log.error(f"Mermaid.ink error: {response.status_code}")
                return None
        except Exception as e:
            log.error(f"Diagram generation error: {e}")
            return None

diagram_service = DiagramService()
