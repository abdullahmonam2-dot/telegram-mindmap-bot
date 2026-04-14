import yt_dlp
import os
import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def download_video(url, output_dir="temp"):
    """
    Downloads a video from TikTok or Instagram using yt-dlp.
    Returns the path to the downloaded file.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # التحميل باحترافية وبدون علامة مائية (تلقائي في yt-dlp للتيك توك)
    ydl_opts = {
        'format': 'bestvideo+bestaudio/best',
        'outtmpl': f'{output_dir}/%(id)s.%(ext)s',
        'quiet': True,
        'no_warnings': True,
        'merge_output_format': 'mp4',
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }
    }

    try:
        # تنفيذ التحميل في خيط منفصل لتجنب حظر الـ Event Loop
        loop = asyncio.get_event_loop()
        info = await loop.run_in_executor(None, lambda: _extract_and_download(url, ydl_opts))
        
        if info:
            file_path = info.get('requested_downloads', [{}])[0].get('filepath')
            if not file_path:
                # في حال لم يجد المسار المباشر، نبحث عنه بالنمط المتوقع
                ext = info.get('ext', 'mp4')
                file_path = f"{output_dir}/{info['id']}.{ext}"
            
            return file_path
        return None
    except Exception as e:
        logger.error(f"Error downloading video: {e}")
        return None

def _extract_and_download(url, opts):
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return info

async def get_video_info(url):
    """
    Extracts video info without downloading.
    """
    ydl_opts = {'quiet': True, 'no_warnings': True}
    try:
        loop = asyncio.get_event_loop()
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = await loop.run_in_executor(None, lambda: ydl.extract_info(url, download=False))
            return info
    except Exception as e:
        logger.error(f"Error extracting info: {e}")
        return None
