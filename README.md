# 🤖 Arabic NotebookLM Telegram Bot

بوت تلجرام احترافي متطور يحاكي وظائف Google NotebookLM ولكن باللغة العربية بالكامل. يتيح للمستخدمين رفع الملفات وتحويلها إلى محتوى تعليمي تفاعلي.

## ✨ المميزات
- 📂 **دعم جميع أنواع الملفات**: (PDF, DOCX, JPG, PNG, MP3, MP4).
- 🎧 **ملخص صوتي**: استخراج نص تعليمي جذاب وتحويله لصوت بشري طبيعي.
- 🎥 **ملخص فيديو**: إنشاء شرائح عرض مع تعليق صوتي ودمجها في فيديو MP4.
- 🧠 **بطاقات تعليمية**: توليد أسئلة وأجوبة للمراجعة السريعة.
- ❓ **اختبارات ذكية**: إنشاء أسئلة MCQ مع التقييم الفوري.
- 📊 **خرائط ذهنية**: رسم مخططات بيانية تلخص المحتوى (Mermaid.js).
- 📑 **شرائح PowerPoint**: تصدير ملفات PPTX جاهزة للعرض.

## 🛠 المتطلبات التقنية
- **Python**: 3.10 أو أحدث.
- **API Keys**:
  - `TELEGRAM_BOT_TOKEN` من @BotFather
  - `GEMINI_API_KEY` من [Google AI Studio](https://aistudio.google.com/) (مجاني).
- **FFmpeg**: ضروري جداً لإنتاج الفيديو.

## 🚀 التشغيل المحلي (Local Run)

1. **قم بتثبيت المتطلبات**:
   ```bash
   pip install -r requirements.txt
   ```

2. **إعداد البيئة**:
   - انسخ ملف `.env.example` إلى `.env` وقم بتعبئة المفاتيح (API Keys).

3. **تثبيت FFmpeg**:
   - تأكد من تثبيت FFmpeg وإضافته لمتغيرات النظام (PATH).

4. **التشغيل**:
   ```bash
   python main.py
   ```

## 🐳 التشغيل باستخدام Docker (VPS Deployment)

هذه هي الطريقة الأفضل للتشغيل على سيرفر خارجي:
```bash
docker build -t arabic-notebooklm-bot .
docker run -d --env-file .env arabic-notebooklm-bot
```

## 🏗 بنية المشروع
- `src/core`: منطق الذكاء الاصطناعي (Gemini).
- `src/services`: خدمات تحويل الوسائط (Video, Audio, PPTX, Diagrams).
- `src/bot`: معالجات التلجرام وواجهة المستخدم.
- `data`: تخزين قاعدة البيانات والملفات المؤقتة.

---
تم التطوير بواسطة Antigravity AI.
