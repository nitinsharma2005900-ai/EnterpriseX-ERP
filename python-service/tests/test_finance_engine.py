import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from main import app
from app.models.schemas import (
    JournalValidationRequest,
    JournalLineItem,
    TaxCalculationRequest,
    TaxLineRequest,
    ReconciliationRequest,
    BankTransaction,
    LedgerTransaction,
    AccountBalance,
    FinancialStatementsRequest,
)
from app.services.finance_engine import FinanceEngine

client = TestClient(app)


# ------------------------------------------------------------------------------
# Assessment 05: Unit & API Tests for Journal Validation
# ------------------------------------------------------------------------------

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "HEALTHY"


def test_journal_validation_balanced():
    req = JournalValidationRequest(
        entry_number="JE-TEST-001",
        period_status="OPEN",
        lines=[
            JournalLineItem(account_code="1010", debit=Decimal("250.00"), credit=Decimal("0.00")),
            JournalLineItem(account_code="2010", debit=Decimal("0.00"), credit=Decimal("250.00")),
        ]
    )
    result = FinanceEngine.validate_journal_entry(req)
    assert result.is_valid is True
    assert result.total_debit == Decimal("250.00")
    assert result.total_credit == Decimal("250.00")
    assert result.imbalance == Decimal("0.00")
    assert len(result.errors) == 0


def test_journal_validation_unbalanced_failure_path():
    req = JournalValidationRequest(
        entry_number="JE-TEST-FAIL",
        period_status="OPEN",
        lines=[
            JournalLineItem(account_code="1010", debit=Decimal("250.00"), credit=Decimal("0.00")),
            JournalLineItem(account_code="2010", debit=Decimal("0.00"), credit=Decimal("200.00")),
        ]
    )
    result = FinanceEngine.validate_journal_entry(req)
    assert result.is_valid is False
    assert result.imbalance == Decimal("50.00")
    assert any("Ledger imbalance detected" in e for e in result.errors)


def test_journal_validation_closed_period_failure_path():
    req = JournalValidationRequest(
        entry_number="JE-TEST-CLOSED",
        period_status="CLOSED",
        lines=[
            JournalLineItem(account_code="1010", debit=Decimal("100.00"), credit=Decimal("0.00")),
            JournalLineItem(account_code="2010", debit=Decimal("0.00"), credit=Decimal("100.00")),
        ]
    )
    result = FinanceEngine.validate_journal_entry(req)
    assert result.is_valid is False
    assert any("Financial period is CLOSED" in e for e in result.errors)


# ------------------------------------------------------------------------------
# Assessment 05: Tax Calculation Engine
# ------------------------------------------------------------------------------

def test_tax_calculation_standard_and_exempt():
    req = TaxCalculationRequest(
        jurisdiction="DEFAULT",
        lines=[
            TaxLineRequest(item_id="item-1", category="STANDARD", quantity=Decimal("2"), unit_price=Decimal("100.00")),
            TaxLineRequest(item_id="item-2", category="EXEMPT", quantity=Decimal("1"), unit_price=Decimal("50.00")),
        ]
    )
    res = FinanceEngine.calculate_taxes(req)
    assert res.total_subtotal == Decimal("250.00")
    # standard: 200 * 0.10 = 20.00, exempt: 50 * 0 = 0.00
    assert res.total_tax == Decimal("20.00")
    assert res.grand_total == Decimal("270.00")


# ------------------------------------------------------------------------------
# Assessment 05: Automated Reconciliation
# ------------------------------------------------------------------------------

def test_bank_reconciliation_matching():
    req = ReconciliationRequest(
        bank_transactions=[
            BankTransaction(transaction_id="B-1", date="2026-03-01", amount=Decimal("500.00"), reference="REF-101"),
            BankTransaction(transaction_id="B-2", date="2026-03-02", amount=Decimal("1200.00"), reference="REF-102"),
        ],
        ledger_transactions=[
            LedgerTransaction(entry_id="L-1", date="2026-03-01", amount=Decimal("500.00"), reference="REF-101", account_code="1010"),
            LedgerTransaction(entry_id="L-3", date="2026-03-03", amount=Decimal("300.00"), reference="REF-103", account_code="1010"),
        ]
    )
    res = FinanceEngine.reconcile_transactions(req)
    assert res.matched_count == 1
    assert res.unmatched_bank_count == 1
    assert res.unmatched_ledger_count == 1


# ------------------------------------------------------------------------------
# Assessment 06: Consolidated Reporting & Statements
# ------------------------------------------------------------------------------

def test_financial_statements_trial_balance_and_balance_sheet():
    accounts = [
        AccountBalance(code="1010", name="Cash", category="ASSET", balance=Decimal("100000.00")),
        AccountBalance(code="1200", name="Accounts Receivable", category="ASSET", balance=Decimal("20000.00")),
        AccountBalance(code="2010", name="Accounts Payable", category="LIABILITY", balance=Decimal("40000.00")),
        AccountBalance(code="3010", name="Common Stock", category="EQUITY", balance=Decimal("80000.00")),
        AccountBalance(code="4010", name="Sales Revenue", category="REVENUE", balance=Decimal("50000.00")),
        AccountBalance(code="5010", name="Cost of Goods Sold", category="EXPENSE", balance=Decimal("30000.00")),
        AccountBalance(code="6010", name="Rent Expense", category="EXPENSE", balance=Decimal("20000.00")),
    ]

    tb = FinanceEngine.generate_trial_balance(accounts, "2026-Q1")
    assert tb.is_balanced is True
    assert tb.total_debits == tb.total_credits

    bs = FinanceEngine.generate_balance_sheet(accounts, "2026-Q1")
    assert bs.is_balanced is True
    assert bs.total_assets == bs.total_liabilities_and_equity


def test_performance_benchmark_endpoint():
    res = client.get("/api/finance/benchmark?iterations=500")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["iterations"] == 500
    assert data["throughput_ops_per_sec"] > 0
