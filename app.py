from flask import Flask, jsonify
import logging
import os
from datetime import datetime

app = Flask(__name__)

# Environment configuration
app.config['ENV'] = os.getenv('FLASK_ENV', 'production')
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

# Enhanced logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log') if app.config['ENV'] == 'production' else logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

@app.route("/")
def home():
    logger.info("Home endpoint accessed")
    return jsonify({
        "message": "DevOps Flask App Running!",
        "environment": app.config['ENV'],
        "timestamp": datetime.utcnow().isoformat(),
        "status": "success"
    })

@app.route("/health")
def health():
    logger.debug("Health check endpoint accessed")
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "flask-app",
        "version": "1.0.0"
    })

@app.route("/metrics")
def metrics():
    logger.debug("Metrics endpoint accessed")
    return jsonify({
        "status": "ok",
        "uptime": "todo",  # You can add uptime tracking here
        "memory_usage": "todo",  # Add memory usage monitoring
        "request_count": "todo"  # Add request counting
    })

@app.errorhandler(404)
def not_found(error):
    logger.warning(f"404 error: {error}")
    return jsonify({
        "error": "Not found",
        "message": "The requested resource was not found",
        "status_code": 404
    }), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 error: {error}")
    return jsonify({
        "error": "Internal server error",
        "message": "An unexpected error occurred",
        "status_code": 500
    }), 500

if __name__ == "__main__":
    logger.info(f"Starting Flask app in {app.config['ENV']} mode")
    app.run(
        host=os.getenv('FLASK_HOST', '0.0.0.0'),
        port=int(os.getenv('FLASK_PORT', 5000)),
        debug=app.config['DEBUG']
    )