from flask import Flask, jsonify, request, g
from flask_cors import CORS
import logging
import os
import time
from collections import deque
import requests
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# Metrics Storage
START_TIME = time.time()
request_latencies = deque(maxlen=100)
total_requests = 0

@app.before_request
def before_request():
    g.start_time = time.time()
    global total_requests
    total_requests += 1

@app.after_request
def after_request(response):
    if hasattr(g, 'start_time'):
        latency = (time.time() - g.start_time) * 1000  # ms
        request_latencies.append(latency)
    return response

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
    uptime_seconds = time.time() - START_TIME
    avg_latency = sum(request_latencies) / len(request_latencies) if request_latencies else 0
    
    return jsonify({
        "status": "ok",
        "uptime_seconds": uptime_seconds,
        "avg_latency_ms": round(avg_latency, 2),
        "request_count": total_requests
    })

@app.route("/deploy", methods=["POST"])
def deploy():
    """Trigger the real GitHub Actions CI/CD Pipeline via GitHub REST API."""
    token = os.getenv("GITHUB_TOKEN")
    owner = os.getenv("GITHUB_OWNER")
    repo = os.getenv("GITHUB_REPO")
    
    if not token or not owner or not repo:
        error_msg = "Missing GitHub configuration in environment variables."
        logger.error(error_msg)
        return jsonify({"error": error_msg}), 400
        
    url = f"https://api.github.com/repos/{owner}/{repo}/actions/workflows/python-ci.yml/dispatches"
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"Bearer {token}"
    }
    data = {"ref": "main"}
    
    try:
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 204:
            logger.info("Successfully triggered GitHub Actions deployment pipeline.")
            return jsonify({"status": "success", "message": "Pipeline triggered."}), 200
        else:
            logger.error(f"GitHub API Error: {response.text}")
            return jsonify({"error": "Failed to trigger pipeline via GitHub API.", "details": response.text}), response.status_code
    except Exception as e:
        logger.error(f"Error communicating with GitHub: {str(e)}")
        return jsonify({"error": str(e)}), 500

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