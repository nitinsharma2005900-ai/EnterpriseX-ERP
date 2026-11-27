import time
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Tuple
from app.models.schemas import (
    JournalLineItem,
    JournalValidationRequest,
    JournalValidationResponse,
    TaxCalculationRequest,
    TaxCalculationResponse,
    TaxLineResult,
    ReconciliationRequest,
    ReconciliationResponse,
    MatchResult,
    BankTransaction,
    LedgerTransaction,
    AccountBalance,
    TrialBalanceResponse,
    BalanceSheetResponse,
    ProfitAndLossResponse,
)

TWOPLACES = Decimal("0.01")


class FinanceEngine:
    """
    Assessment 05: Core deterministic finance processing engine.
    Ensures exact double-entry validation, configurable tax schedules,
    automated reconciliation, and financial report calculations.
    """

    # Configurable tax jurisdiction brackets
    TAX_RATES = {
        "DEFAULT": {
            "STANDARD": Decimal("0.10"),  # 10%
            "REDUCED": Decimal("0.05"),   # 5%
            "LUXURY": Decimal("0.20"),    # 20%
            "EXEMPT": Decimal("0.00"),    # 0%
        },
        "CALIFORNIA": {
            "STANDARD": Decimal("0.0825"),
            "REDUCED": Decimal("0.0400"),
            "LUXURY": Decimal("0.1500"),
            "EXEMPT": Decimal("0.0000"),
        },
        "NEW_YORK": {
            "STANDARD": Decimal("0.08875"),
            "REDUCED": Decimal("0.0400"),
            "LUXURY": Decimal("0.1600"),
            "EXEMPT": Decimal("0.0000"),
        },
        "EU_VAT": {
            "STANDARD": Decimal("0.2000"),
            "REDUCED": Decimal("0.0700"),
            "LUXURY": Decimal("0.2500"),
            "EXEMPT": Decimal("0.0000"),
        },
    }

    @staticmethod
    def validate_journal_entry(request: JournalValidationRequest) -> JournalValidationResponse:
        """
        Validates double-entry accounting rules:
        1. Debits == Credits (zero imbalance)
        2. Both debit and credit totals > 0 (non-empty journal)
        3. Financial period must be OPEN (cannot post to CLOSED or LOCKED periods)
        4. No line has both debit and credit simultaneously
        5. Valid account code formats
        """
        start_time = time.perf_counter()
        errors: List[str] = []
        warnings: List[str] = []

        if request.period_status.upper() != "OPEN":
            errors.append(f"Financial period is {request.period_status}. Postings are forbidden.")

        if not request.lines:
            errors.append("Journal entry must contain at least two transaction lines.")
            return JournalValidationResponse(
                is_valid=False,
                total_debit=Decimal("0.00"),
                total_credit=Decimal("0.00"),
                imbalance=Decimal("0.00"),
                errors=errors,
                warnings=warnings,
                benchmark_ms=round((time.perf_counter() - start_time) * 1000, 3)
            )

        total_debit = Decimal("0.00")
        total_credit = Decimal("0.00")

        for idx, line in enumerate(request.lines, start=1):
            if line.debit > 0 and line.credit > 0:
                errors.append(f"Line {idx} ({line.account_code}) has both debit ({line.debit}) and credit ({line.credit}).")

            if line.debit == 0 and line.credit == 0:
                warnings.append(f"Line {idx} ({line.account_code}) has zero amount on both sides.")

            if not line.account_code or len(line.account_code.strip()) < 3:
                errors.append(f"Line {idx} has invalid account code: '{line.account_code}'.")

            total_debit += line.debit
            total_credit += line.credit

        total_debit = total_debit.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        total_credit = total_credit.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        imbalance = (total_debit - total_credit).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        if total_debit == Decimal("0.00") and total_credit == Decimal("0.00"):
            errors.append("Journal entry total value cannot be zero.")

        if imbalance != Decimal("0.00"):
            errors.append(
                f"Ledger imbalance detected: Total Debits ({total_debit}) != Total Credits ({total_credit}). Imbalance: {imbalance}"
            )

        is_valid = len(errors) == 0
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 3)

        return JournalValidationResponse(
            is_valid=is_valid,
            total_debit=total_debit,
            total_credit=total_credit,
            imbalance=imbalance,
            errors=errors,
            warnings=warnings,
            benchmark_ms=elapsed_ms
        )

    @classmethod
    def calculate_taxes(cls, request: TaxCalculationRequest) -> TaxCalculationResponse:
        """
        Calculates itemized taxes using deterministic rounding.
        """
        jurisdiction = request.jurisdiction.upper()
        rates_map = cls.TAX_RATES.get(jurisdiction, cls.TAX_RATES["DEFAULT"])

        total_subtotal = Decimal("0.00")
        total_tax = Decimal("0.00")
        itemized_lines: List[TaxLineResult] = []

        for line in request.lines:
            discount_mult = Decimal("1.00") - (line.discount_pct / Decimal("100.00"))
            line_subtotal = (line.quantity * line.unit_price * discount_mult).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

            if request.tax_rate_override is not None:
                rate = request.tax_rate_override
            else:
                rate = rates_map.get(line.category.upper(), rates_map["STANDARD"])

            tax_amount = (line_subtotal * rate).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            line_total = line_subtotal + tax_amount

            total_subtotal += line_subtotal
            total_tax += tax_amount

            itemized_lines.append(
                TaxLineResult(
                    item_id=line.item_id,
                    subtotal=line_subtotal,
                    tax_rate_applied=rate,
                    tax_amount=tax_amount,
                    total=line_total,
                )
            )

        return TaxCalculationResponse(
            jurisdiction=jurisdiction,
            total_subtotal=total_subtotal.quantize(TWOPLACES, rounding=ROUND_HALF_UP),
            total_tax=total_tax.quantize(TWOPLACES, rounding=ROUND_HALF_UP),
            grand_total=(total_subtotal + total_tax).quantize(TWOPLACES, rounding=ROUND_HALF_UP),
            itemized_lines=itemized_lines,
        )

    @staticmethod
    def reconcile_transactions(request: ReconciliationRequest) -> ReconciliationResponse:
        """
        Assessment 05: Automated 3-way or Bank Reconciliation algorithm.
        Matches by reference number and amount within tolerance.
        """
        matched: List[MatchResult] = []
        unmatched_bank: List[BankTransaction] = []
        unmatched_ledger: List[LedgerTransaction] = list(request.ledger_transactions)

        for b_tx in request.bank_transactions:
            found_idx = None
            for idx, l_tx in enumerate(unmatched_ledger):
                # Check reference match or amount match
                ref_match = (
                    b_tx.reference and l_tx.reference and
                    b_tx.reference.strip().lower() == l_tx.reference.strip().lower()
                )
                amount_diff = abs(b_tx.amount - l_tx.amount)
                amount_match = amount_diff <= request.tolerance

                if (ref_match and amount_match) or (not b_tx.reference and amount_match):
                    found_idx = idx
                    break

            if found_idx is not None:
                matched_ledger = unmatched_ledger.pop(found_idx)
                matched.append(
                    MatchResult(
                        bank_tx_id=b_tx.transaction_id,
                        ledger_entry_id=matched_ledger.entry_id,
                        amount=b_tx.amount,
                        status="MATCHED",
                    )
                )
            else:
                unmatched_bank.append(b_tx)

        discrepancy_total = sum((t.amount for t in unmatched_bank), Decimal("0.00")) - sum(
            (t.amount for t in unmatched_ledger), Decimal("0.00")
        )

        return ReconciliationResponse(
            matched_count=len(matched),
            unmatched_bank_count=len(unmatched_bank),
            unmatched_ledger_count=len(unmatched_ledger),
            matched=matched,
            unmatched_bank=unmatched_bank,
            unmatched_ledger=unmatched_ledger,
            discrepancy_total=discrepancy_total.quantize(TWOPLACES, rounding=ROUND_HALF_UP),
        )

    @staticmethod
    def generate_trial_balance(accounts: List[AccountBalance], period: str) -> TrialBalanceResponse:
        """
        Computes Trial Balance: Debits (Assets, Expenses) must equal Credits (Liabilities, Equity, Revenue)
        """
        total_assets = Decimal("0.00")
        total_liabilities = Decimal("0.00")
        total_equity = Decimal("0.00")
        total_revenue = Decimal("0.00")
        total_expense = Decimal("0.00")

        total_debits = Decimal("0.00")
        total_credits = Decimal("0.00")
        account_rows = []

        for acc in accounts:
            bal = acc.balance.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            cat = acc.category.upper()
            debit = Decimal("0.00")
            credit = Decimal("0.00")

            if cat == "ASSET":
                total_assets += bal
                debit = bal
                total_debits += bal
            elif cat == "EXPENSE":
                total_expense += bal
                debit = bal
                total_debits += bal
            elif cat == "LIABILITY":
                total_liabilities += bal
                credit = bal
                total_credits += bal
            elif cat == "EQUITY":
                total_equity += bal
                credit = bal
                total_credits += bal
            elif cat == "REVENUE":
                total_revenue += bal
                credit = bal
                total_credits += bal

            account_rows.append({
                "code": acc.code,
                "name": acc.name,
                "category": cat,
                "debit": float(debit),
                "credit": float(credit),
            })

        is_balanced = (total_debits - total_credits).quantize(TWOPLACES) == Decimal("0.00")

        return TrialBalanceResponse(
            period=period,
            total_assets=total_assets,
            total_liabilities=total_liabilities,
            total_equity=total_equity,
            total_revenue=total_revenue,
            total_expense=total_expense,
            total_debits=total_debits,
            total_credits=total_credits,
            is_balanced=is_balanced,
            accounts=account_rows,
        )

    @staticmethod
    def generate_balance_sheet(accounts: List[AccountBalance], period: str) -> BalanceSheetResponse:
        """
        Balance Sheet: Total Assets == Total Liabilities + Total Equity
        """
        assets: Dict[str, float] = {}
        liabilities: Dict[str, float] = {}
        equity: Dict[str, float] = {}

        total_assets = Decimal("0.00")
        total_liabilities = Decimal("0.00")
        total_equity = Decimal("0.00")
        net_income = Decimal("0.00")

        for acc in accounts:
            bal = acc.balance.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            cat = acc.category.upper()
            if cat == "ASSET":
                assets[acc.name] = float(bal)
                total_assets += bal
            elif cat == "LIABILITY":
                liabilities[acc.name] = float(bal)
                total_liabilities += bal
            elif cat == "EQUITY":
                equity[acc.name] = float(bal)
                total_equity += bal
            elif cat == "REVENUE":
                net_income += bal
            elif cat == "EXPENSE":
                net_income -= bal

        # Add current period Net Income to Equity
        equity["Current Period Net Income"] = float(net_income)
        total_equity += net_income

        total_liab_eq = total_liabilities + total_equity
        is_balanced = abs(total_assets - total_liab_eq).quantize(TWOPLACES) == Decimal("0.00")

        return BalanceSheetResponse(
            period=period,
            assets=assets,
            liabilities=liabilities,
            equity=equity,
            total_assets=total_assets,
            total_liabilities_and_equity=total_liab_eq,
            is_balanced=is_balanced,
        )

    @staticmethod
    def generate_profit_and_loss(accounts: List[AccountBalance], period: str) -> ProfitAndLossResponse:
        """
        Profit and Loss Statement (Income Statement):
        Gross Profit = Revenue - COGS
        Net Operating Income = Gross Profit - Operating Expenses
        """
        revenue_total = Decimal("0.00")
        cogs_total = Decimal("0.00")
        opex_total = Decimal("0.00")
        breakdown: Dict[str, Dict[str, float]] = {
            "revenue": {},
            "cogs": {},
            "operating_expenses": {},
        }

        for acc in accounts:
            bal = acc.balance.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            cat = acc.category.upper()
            if cat == "REVENUE":
                revenue_total += bal
                breakdown["revenue"][acc.name] = float(bal)
            elif cat == "EXPENSE":
                if "COGS" in acc.name.upper() or "COST OF GOODS" in acc.name.upper() or acc.code.startswith("5"):
                    cogs_total += bal
                    breakdown["cogs"][acc.name] = float(bal)
                else:
                    opex_total += bal
                    breakdown["operating_expenses"][acc.name] = float(bal)

        gross_profit = revenue_total - cogs_total
        net_income = gross_profit - opex_total
        net_margin_pct = (
            (net_income / revenue_total * Decimal("100.00")).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            if revenue_total > 0 else Decimal("0.00")
        )

        return ProfitAndLossResponse(
            period=period,
            revenue_total=revenue_total,
            cogs_total=cogs_total,
            gross_profit=gross_profit,
            operating_expenses_total=opex_total,
            net_operating_income=net_income,
            net_margin_pct=net_margin_pct,
            breakdown=breakdown,
        )
