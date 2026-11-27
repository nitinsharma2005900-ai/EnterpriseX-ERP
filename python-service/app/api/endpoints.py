import time
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import (
    JournalValidationRequest,
    JournalValidationResponse,
    TaxCalculationRequest,
    TaxCalculationResponse,
    ReconciliationRequest,
    ReconciliationResponse,
    FinancialStatementsRequest,
    TrialBalanceResponse,
    BalanceSheetResponse,
    ProfitAndLossResponse,
    ExecutiveAnalyticsResponse,
)
from app.services.finance_engine import FinanceEngine
from app.services.analytics_engine import AnalyticsEngine

router = APIRouter()


# ------------------------------------------------------------------------------
# Assessment 05: Finance Processing Endpoints
# ------------------------------------------------------------------------------

@router.post("/finance/validate-journal", response_model=JournalValidationResponse, tags=["Finance Processing"])
def validate_journal(payload: JournalValidationRequest):
    """
    Assessment 05: Validate double-entry journal integrity, debit-credit balance,
    and period status.
    """
    return FinanceEngine.validate_journal_entry(payload)


@router.post("/finance/calculate-tax", response_model=TaxCalculationResponse, tags=["Finance Processing"])
def calculate_tax(payload: TaxCalculationRequest):
    """
    Assessment 05: Deterministic tax calculation across multiple jurisdictions and schedules.
    """
    return FinanceEngine.calculate_taxes(payload)


@router.post("/finance/reconcile", response_model=ReconciliationResponse, tags=["Finance Processing"])
def reconcile(payload: ReconciliationRequest):
    """
    Assessment 05: Automated 3-way reconciliation and bank reconciliation matching.
    """
    return FinanceEngine.reconcile_transactions(payload)


@router.post("/finance/trial-balance", response_model=TrialBalanceResponse, tags=["Financial Reporting"])
def trial_balance(payload: FinancialStatementsRequest):
    """
    Assessment 05 & 06: Generate Trial Balance from GL account balances.
    """
    return FinanceEngine.generate_trial_balance(payload.accounts, payload.period_name)


@router.post("/finance/balance-sheet", response_model=BalanceSheetResponse, tags=["Financial Reporting"])
def balance_sheet(payload: FinancialStatementsRequest):
    """
    Assessment 05 & 06: Generate Balance Sheet (Assets = Liabilities + Equity).
    """
    return FinanceEngine.generate_balance_sheet(payload.accounts, payload.period_name)


@router.post("/finance/profit-and-loss", response_model=ProfitAndLossResponse, tags=["Financial Reporting"])
def profit_and_loss(payload: FinancialStatementsRequest):
    """
    Assessment 05 & 06: Generate Profit & Loss statement with Gross & Net margin calculations.
    """
    return FinanceEngine.generate_profit_and_loss(payload.accounts, payload.period_name)


# ------------------------------------------------------------------------------
# Assessment 06: Executive Analytics Endpoints
# ------------------------------------------------------------------------------

@router.get("/analytics/executive-summary", response_model=ExecutiveAnalyticsResponse, tags=["Business Analytics"])
def get_executive_summary(
    revenue: float = Query(default=142000.00),
    cogs: float = Query(default=52000.00),
    expenses: float = Query(default=91000.00),
    accounts_receivable: float = Query(default=38500.00),
    accounts_payable: float = Query(default=24800.00),
    inventory_valuation: float = Query(default=68400.00),
):
    """
    Assessment 06: High-efficiency consolidated executive analytics with DSO, DPO,
    working capital, cash flow health indicator, and vendor spend breakdown.
    """
    return AnalyticsEngine.compute_executive_metrics(
        revenue=Decimal(str(revenue)),
        cogs=Decimal(str(cogs)),
        expenses=Decimal(str(expenses)),
        accounts_receivable=Decimal(str(accounts_receivable)),
        accounts_payable=Decimal(str(accounts_payable)),
        inventory_valuation=Decimal(str(inventory_valuation)),
    )


@router.get("/finance/benchmark", tags=["Finance Processing"])
def run_benchmark(iterations: int = Query(default=5000, le=50000)):
    """
    Assessment 05: Benchmark requirement - validates deterministic performance on high volume.
    """
    start_time = time.perf_counter()
    from app.models.schemas import JournalLineItem

    dummy_request = JournalValidationRequest(
        entry_number="BENCHMARK-001",
        period_status="OPEN",
        lines=[
            JournalLineItem(account_code="1010", debit=Decimal("1500.50"), credit=Decimal("0.00")),
            JournalLineItem(account_code="1200", debit=Decimal("499.50"), credit=Decimal("0.00")),
            JournalLineItem(account_code="2010", debit=Decimal("0.00"), credit=Decimal("2000.00")),
        ]
    )

    for _ in range(iterations):
        res = FinanceEngine.validate_journal_entry(dummy_request)
        if not res.is_valid:
            raise HTTPException(status_code=500, detail="Benchmark validation failed")

    total_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
    ops_per_second = round(iterations / (total_time_ms / 1000), 2)

    return {
        "status": "SUCCESS",
        "iterations": iterations,
        "total_time_ms": total_time_ms,
        "avg_latency_ms_per_op": round(total_time_ms / iterations, 4),
        "throughput_ops_per_sec": ops_per_second,
        "assessment": "Assessment 05 - Python Finance Processing Benchmark",
    }
