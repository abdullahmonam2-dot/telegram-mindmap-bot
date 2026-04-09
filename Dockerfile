# Use the official Playwright image for Python
FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

# Set working directory
WORKDIR /app

# Install system fonts for Arabic support
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    fonts-freefont-ttf \
    fonts-kacst \
    fonts-arabeyes \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Chromium (Playwright will find it in the image, but we ensure it's here)
RUN playwright install chromium

# Copy the rest of the application
COPY . .

# Download the high-quality Cairo font (overwrites any local corrupt file)
RUN mkdir -p assets/fonts && \
    curl -L https://github.com/google/fonts/raw/main/ofl/cairo/static/Cairo-Regular.ttf -o assets/fonts/Cairo-Regular.ttf && \
    curl -L https://github.com/google/fonts/raw/main/ofl/cairo/static/Cairo-Bold.ttf -o assets/fonts/Cairo-Bold.ttf

# Create temp directory
RUN mkdir -p temp && chmod 777 temp

# Expose the port for Flask Keep-Alive
EXPOSE 8080

# Command to run the bot
CMD ["python", "-u", "bot.py"]
