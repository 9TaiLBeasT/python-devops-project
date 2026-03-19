FROM python:3.10-slim

WORKDIR /app

# Install system dependencies and create non-root user
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 --gid 1001 appuser

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies globally (not in user directory)
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PORT=5000

# Change ownership of the app directory
RUN chown -R appuser:appgroup /app

# Create a startup script that handles PORT environment variable
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'exec gunicorn --bind "0.0.0.0:${PORT:-5000}" --workers 4 --threads 2 --timeout 120 app:app' >> /app/start.sh && \
    chmod +x /app/start.sh && \
    chown appuser:appgroup /app/start.sh

# Switch to non-root user
USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Use the startup script that properly handles environment variables
CMD ["/app/start.sh"]