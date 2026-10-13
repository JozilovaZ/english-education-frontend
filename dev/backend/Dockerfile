# Faqat lokal ishlab chiqish uchun: backend Django 6.1 Python 3.12+ talab qiladi.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Backend kodi volume orqali ulanadi, image ichiga faqat kutubxonalar o'rnatiladi.
COPY requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt
