from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


# ------------------------------------------------------------------------------
# Assessment 05: Journal Validation Schemas
# ------------------------------------------------------------------------------

class JournalLineItem(BaseModel):
    account_code: str = Field(..., description="GL Account code (e.g., 1010, 2010)")
    account_name: Optional[str] = None
    description: Optional[str] = None
    debit: Decimal = Field(default=Decimal("0.00"), ge=0)
    credit: Decimal = Field(default=Decimal("0.00"), ge=0)

    @field_validator("debit", "credit", mode="before")
    def parse_decimal(cls, v):
        if v is None:
            return Decimal("0.00")
        return Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class JournalValidationRequest(BaseModel):
    entry_number: str
    period_status: str = Field(default="OPEN", description="OPEN, CLOSED, or LOCKED")
    lines: List[JournalLineItem]


class JournalValidationResponse(BaseModel):
    is_valid: bool
    total_debit: Decimal
    total_credit: Decimal
    imbalance: Decimal
    errors: List[str]
    warnings: List[str]
    benchmark_ms: Optional[float] = None


# ------------------------------------------------------------------------------
# Assessment 05: Tax Calculation Schemas
# ------------------------------------------------------------------------------

class TaxLineRequest(BaseModel):
    item_id: str
    sku: Optional[str] = None
    category: str = Field(default="STANDARD", description="STANDARD, EXEMPT, REDUCED, LUXURY")
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    discount_pct: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)


class TaxCalculationRequest(BaseModel):
    jurisdiction: str = Field(default="DEFAULT", description="Tax jurisdiction / State")
    tax_rate_override: Optional[Decimal] = Field(default=None, ge=0, le=1)
    lines: List[TaxLineRequest]


class TaxLineResult(BaseModel):
    item_id: str
    subtotal: Decimal
    tax_rate_applied: Decimal
    tax_amount: Decimal
    total: Decimal


class TaxCalculationResponse(BaseModel):
    jurisdiction: str
    total_subtotal: Decimal
    total_tax: Decimal
    grand_total: Decimal
    itemized_lines: List[TaxLineResult]


# ------------------------------------------------------------------------------
# Assessment 05: Bank & 3-Way Reconciliation Schemas
# ------------------------------------------------------------------------------

class BankTransaction(BaseModel):
    transaction_id: str
    date: str
    amount: Decimal
    reference: Optional[str] = None
    description: Optional[str] = None


class LedgerTransaction(BaseModel):
    entry_id: str
    date: str
    amount: Decimal
    reference: Optional[str] = None
    account_code: str


class ReconciliationRequest(BaseModel):
    bank_transactions: List[BankTransaction]
    ledger_transactions: List[LedgerTransaction]
    tolerance: Decimal = Field(default=Decimal("0.00"), ge=0)


class MatchResult(BaseModel):
    bank_tx_id: str
    ledger_entry_id: str
    amount: Decimal
    status: str = "MATCHED"


class ReconciliationResponse(BaseModel):
    matched_count: int
    unmatched_bank_count: int
    unmatched_ledger_count: int
    matched: List[MatchResult]
    unmatched_bank: List[BankTransaction]
    unmatched_ledger: List[LedgerTransaction]
    discrepancy_total: Decimal


# ------------------------------------------------------------------------------
# Assessment 06: Consolidated Reporting & Analytics Schemas
# ------------------------------------------------------------------------------

class AccountBalance(BaseModel):
    code: str
    name: str
    category: str  # ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    balance: Decimal


class FinancialStatementsRequest(BaseModel):
    accounts: List[AccountBalance]
    period_name: str


class TrialBalanceResponse(BaseModel):
    period: str
    total_assets: Decimal
    total_liabilities: Decimal
    total_equity: Decimal
    total_revenue: Decimal
    total_expense: Decimal
    total_debits: Decimal
    total_credits: Decimal
    is_balanced: bool
    accounts: List[Dict[str, Any]]


class BalanceSheetResponse(BaseModel):
    period: str
    assets: Dict[str, Any]
    liabilities: Dict[str, Any]
    equity: Dict[str, Any]
    total_assets: Decimal
    total_liabilities_and_equity: Decimal
    is_balanced: bool


class ProfitAndLossResponse(BaseModel):
    period: str
    revenue_total: Decimal
    cogs_total: Decimal
    gross_profit: Decimal
    operating_expenses_total: Decimal
    net_operating_income: Decimal
    net_margin_pct: Decimal
    breakdown: Dict[str, Any]


class ExecutiveAnalyticsRequest(BaseModel):
    period: str = "CURRENT"
    transactions: Optional[List[Dict[str, Any]]] = None


class ExecutiveAnalyticsResponse(BaseModel):
    revenue: Decimal
    expenses: Decimal
    net_profit: Decimal
    accounts_receivable: Decimal
    accounts_payable: Decimal
    inventory_valuation: Decimal
    cash_flow_health: str
    dso_days: float
    dpo_days: float
    inventory_turnover_ratio: float
    top_vendors_by_spend: List[Dict[str, Any]]
    monthly_trend: List[Dict[str, Any]]
