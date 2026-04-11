import google.generativeai as genai
from aiocache import cached
from config import config
from src.utils.logger import log
import asyncio
import os
import hashlib

class AIService:
    def __init__(self):
        genai.configure(api_key=config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
    async def analyze_document(self, file_path: str, prompt: str):
        """Analyze document/image/audio/video using Gemini."""
        try:
            log.info(f"Uploading file to Gemini: {file_path}")
            uploaded_file = await asyncio.to_thread(genai.upload_file, path=file_path)
            
            while uploaded_file.state.name == "PROCESSING":
                await asyncio.sleep(2)
                uploaded_file = await asyncio.to_thread(genai.get_file, uploaded_file.name)
            
            if uploaded_file.state.name == "FAILED":
                raise Exception("Gemini file processing failed.")
                
            response = await asyncio.to_thread(
                self.model.generate_content,
                [uploaded_file, prompt]
            )
            
            await asyncio.to_thread(genai.delete_file, uploaded_file.name)
            return response.text
        except Exception as e:
            log.error(f"Gemini analysis error: {e}")
            return f"عذراً، حدث خطأ أثناء تحليل الملف: {str(e)}"

    @cached(ttl=3600)
    async def generate_response(self, text: str, prompt_type: str):
        """Generate specialized content based on prompt type with caching."""
        prompts = {
            "summary": "قم بتلخيص المحتوى التالي باللغة العربية بأسلوب أكاديمي مبسط وواضح. ركز على المفاهيم الأساسية:",
            "quiz": "بناءً على المحتوى التالي، قم بإنشاء 5 أسئلة اختيار من متعدد (MCQ) باللغة العربية مع الإجابات الصحيحة وشرح بسيط لكل إجابة. التنسيق: السؤال، الخيارات، الإجابة الصحيحة، الشرح:",
            "flashcards": "قم بإنشاء 10 بطاقات تعليمية (Flashcards) باللغة العربية (سؤال وجواب) بناءً على المحتوى التالي:",
            "mindmap": "قم بإنشاء كود Mermaid.js لرسم خريطة ذهنية (mindmap) مفصلة باللغة العربية تلخص المحتوى التالي:",
            "slides": "قم بإنشاء محتوى لـ 5 شرائح تقديمية (Slides) باللغة العربية تلخص المحتوى التالي. لكل شريحة: عنوان ونقاط رئيسية:",
            "audio_script": "اكتب نصاً صوتياً (Script) باللغة العربية يصلح ليكون ملخصاً صوتياً تعليمياً جذاباً لهذا المحتوى. اجعل الأسلوب تفاعلياً وكأنك معلم يشرح لطالب:"
        }
        
        target_prompt = prompts.get(prompt_type, prompts["summary"])
        full_prompt = f"{target_prompt}\n\nالمحتوى:\n{text}"
        
        try:
            response = await asyncio.to_thread(self.model.generate_content, full_prompt)
            return response.text
        except Exception as e:
            log.error(f"Gemini text generation error: {e}")
            return "عذراً، حدث خطأ أثناء توليد المحتوى."

ai_service = AIService()
