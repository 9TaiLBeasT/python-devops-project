from app import app
import json

def test_home():
    tester = app.test_client()
    response = tester.get("/")
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data["message"] == "DevOps Flask App Running!"
    assert data["status"] == "success"
    assert "timestamp" in data

def test_health():
    tester = app.test_client()
    response = tester.get("/health")
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data["status"] == "healthy"
    assert data["service"] == "flask-app"
    assert data["version"] == "1.0.0"
    assert "timestamp" in data

def test_metrics():
    tester = app.test_client()
    response = tester.get("/metrics")
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert data["status"] == "ok"
    assert "uptime_seconds" in data
    assert "avg_latency_ms" in data
    assert "request_count" in data

def test_404_error():
    tester = app.test_client()
    response = tester.get("/nonexistent")
    assert response.status_code == 404
    
    data = json.loads(response.data)
    assert data["error"] == "Not found"
    assert data["status_code"] == 404

def test_environment_config():
    assert app.config['ENV'] == 'production'
    assert app.config['DEBUG'] == False