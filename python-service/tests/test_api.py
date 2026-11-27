import os
from fastapi.testclient import TestClient
from main import app

client = TestClient(app, headers={"x-service-token": os.environ.get("SERVICE_TOKEN", "local-development-service-token")})

def test_requires_service_authentication():
    response = TestClient(app).post('/api/finance/trial-balance', json={"accounts": [], "period_name": "Empty"})
    assert response.status_code == 401

def test_empty_analytics_has_no_synthetic_metrics():
    response = client.post('/api/analytics/executive-summary', json={"revenue": 0, "cogs": 0, "expenses": 0, "accounts_receivable": 0, "accounts_payable": 0, "inventory_valuation": 0})
    assert response.status_code == 200
    result = response.json()
    assert float(result['revenue']) == 0
    assert result['monthly_trend'] == []
    assert result['top_vendors_by_spend'] == []
    assert result['dso_days'] == 0

def test_rejects_unbounded_tax_override():
    assert client.post('/api/finance/calculate-tax', json={"tax_rate_override": -1, "lines": []}).status_code == 422

def test_rejects_zero_benchmark_iterations():
    assert client.get('/api/finance/benchmark?iterations=0').status_code == 422

def test_trial_balance_and_equity_include_current_earnings():
    payload = {"period_name": "Test", "accounts": [
        {"code": "1010", "name": "Cash", "category": "ASSET", "balance": "100.01"},
        {"code": "3010", "name": "Capital", "category": "EQUITY", "balance": "90.00"},
        {"code": "4010", "name": "Revenue", "category": "REVENUE", "balance": "10.01"},
    ]}
    trial = client.post('/api/finance/trial-balance', json=payload)
    assert trial.status_code == 200 and trial.json()['is_balanced']
    balance = client.post('/api/finance/balance-sheet', json=payload)
    assert balance.status_code == 200 and balance.json()['is_balanced']
    profit = client.post('/api/finance/profit-and-loss', json=payload)
    assert float(profit.json()['net_operating_income']) == 10.01
