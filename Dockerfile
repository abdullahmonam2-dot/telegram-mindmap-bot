# Use a lightweight Python image
FROM python:3.11-slim-bullseye

# Set working directory
WORKDIR /app

# Install system dependencies (ffmpeg is CRITICAL for video processing)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create temp directory
RUN mkdir -p temp && chmod 777 temp

# Expose the port for Flask Keep-Alive (Render Support)
EXPOSE 8080

# Command to run the bot
CMD ["python", "-u", "bot.py"]
