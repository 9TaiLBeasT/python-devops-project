from flask import Flask, jsonify
import logging

app = Flask(__name__)

# Logging setup
logging.basicConfig(level=logging.INFO)

@app.route("/")
def home():
    logging.info("Home endpoint accessed")
    return jsonify({"message": "DevOps Flask App Running!"})

@app.route("/health")
def health():
    return jsonify({"status": "healthy"})

if __name__ == "__main__":
    app.run(debug=True)