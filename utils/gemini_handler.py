import google.generativeai as genai
import os
import re
import json
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-1.5-flash")

async def get_gemini_response(prompt, content=None, is_image=False):
    """
    Sends a prompt and optionally content (text or image) to Gemini asynchronously.
    """
    try:
        if is_image and content:
            # content is the image path
            img = {
                'mime_type': 'image/jpeg', # Default to jpeg
                'data': open(content, 'rb').read()
            }
            response = await model.generate_content_async([prompt, img])
        elif content:
            response = await model.generate_content_async(f"{prompt}\n\nContent:\n{content}")
        else:
            response = await model.generate_content_async(prompt)
        
        return response.text
    except Exception as e:
        error_msg = str(e).lower()
        if "429" in error_msg or "quota" in error_msg:
            print("GEMINI ERROR: Quota Exceeded.")
            return "ERROR_QUOTA"
        elif "403" in error_msg or "permission" in error_msg or "key" in error_msg:
            print(f"GEMINI ERROR: API Key Issue: {e}")
            return "ERROR_KEY"
        elif "safety" in error_msg or "blocked" in error_msg:
            print(f"GEMINI ERROR: Safety Block: {e}")
            return "ERROR_SAFETY"
        
        print(f"GEMINI Error: {e}")
        return f"ERROR_GENERIC: {str(e)}"

async def generate_mindmap_json(content, is_image=False, translate=False):
    """
    Generates professional, extremely detailed Markdown structure via Gemini for Markmap.
    """
    lang_instruction = "ترجم المحتوى للغة العربية الفصحى و" if translate else ""
    prompt = (
        f"أنت خبير في تحليل البيانات وبناء الخرائط الذهنية الاحترافية. "
        f"قم بتحليل المحتوى التالي بدقة فائقة وحوله إلى هيكل Markmap Markdown مفصل جداً. "
        f"يجب أن تكون اللغة المستخدمة هي العربية الفصحى الأكاديمية. "
        f"استخدم '#' للعنوان الرئيسي، '##' للعناوين الفرعية، و '-' للشرح والتفاصيل العميقة. "
        f"توسع في النقاط واجعل الخريطة شاملة لكل الأفكار الموجودة في النص. "
        f"الرد يجب أن يكون كود Markdown فقط، بدون أي مقدمات أو خاتمة، وبدون استخدام أقواس الكود (```markdown). "
        f"تأكد من أن الاتجاه من اليمين لليسار في صياغة الجمل."
    )
    
    response = await get_gemini_response(prompt, content=content, is_image=is_image)
    if response:
        # Cleanup code blocks if Gemini ignores instructions
        response = response.strip().replace("```markdown", "").replace("```", "")
    return response

async def generate_summary(content, is_image=False):
    prompt = (
        "Analyze the following content and provide a professional, structured, and deep summary in formal Arabic (اللغة العربية الفصحى الاحترافية). "
        "The summary MUST be formatted as a clear bulleted list (نقاط واضحة). "
        "Use bullet points for every key concept and keep it very concise but informative. "
        "The output should be a clean, ready-to-present node-based summary for a high-level report."
    )
    return await get_gemini_response(prompt, content=content, is_image=is_image)

async def translate_text(content, is_image=False):
    prompt = (
        "You are a professional academic translator specializing in creating BILINGUAL STUDY GUIDES. "
        "Your task is to perform a detailed INTERLINEAR translation (الترجمة السطرية) of the provided content. "
        "Strictly follow these rules:\n"
        "1. DO NOT summarize or omit any part. Keep every original English word exactly as it is.\n"
        "2. Break the content into logical chunks (headings, sentences, or phrases).\n"
        "3. For every chunk, provide the original English text first, prefixed with '[EN]'.\n"
        "4. Immediately after, provide its High-Level Professional Arabic translation (اللغة العربية الفصحى) on a new line, prefixed with '[AR]'.\n"
        "5. If there is a table or list, preserve the structure but translate each item interlinearly.\n"
        "6. Focus on clarity so a student can read the English and look directly below it for the Arabic meaning.\n"
        "Now, process the following content:"
    )
    return await get_gemini_response(prompt, content=content, is_image=is_image)

async def generate_ai_study_plan(student_data):
    """
    Uses Gemini to analyze student data (stage, level, availability) and generate a personalized Iraqi study table.
    """
    prompt = (
        "بصفتك خبيراً في التوجيه الأكاديمي للمناهج العراقية، قم بإنشاء جدول دراسي ذكي ومخصص للطالب بناءً على البيانات التالية:\n\n"
        f"👤 اسم الطالب: {student_data['name']}\n"
        f"🎓 المرحلة الدراسية: {student_data['stage']}\n"
        f"⏰ ساعات الدراسة اليومية المتاحة: {student_data['daily_hours']} ساعة\n"
        f"📅 تاريخ الامتحان الوزاري المتوقع: {student_data['exam_date']}\n"
        f"🕒 مستويات المواد (ضعيف/متوسط/جيد):\n{student_data['levels_summary']}\n\n"
        "القواعد الأساسية:\n"
        "1. قم بتوزيع المواد الدراسية بحيث تأخذ المواد 'الضعيفة' وقتاً أطول وجهداً أكبر.\n"
        "2. قم بتقسيم اليوم الدراسي إلى فترات (مثلاً: الصباح للمواد العلمية، المساء للحفظ).\n"
        "3. اجعل الجدول الأسبوعي متوازناً وشاملاً لكل المواد.\n"
        "4. أضف نصيحة دراسية ذكية وتقنية (مثل Pomodoro) مناسبة لهذا الطالب.\n"
        "5. يجب أن يكون الرد باللغة العربية الفصحى الاحترافية وبتنسيق جميل جداً ومنظم باستخدام رموز تعبيرية (Emojis).\n\n"
        "الناتج مطلوب أن يكون نصاً منسقاً جاهزاً للعرض المباشر للطالب."
    )
    
    return await get_gemini_response(prompt)
