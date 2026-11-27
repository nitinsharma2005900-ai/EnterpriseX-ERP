from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Any
from app.models.schemas import ExecutiveAnalyticsResponse

TWOPLACES = Decimal("0.01")


class AnalyticsEngine:
    """
    Assessment 06: Consolidated executive analytics and financial health engine.
    Calculates Days Sales Outstanding (DSO), Days Payable Outstanding (DPO),
    Inventory Turnover, Working Capital, and Vendor Spend Distribution.
    """

    @staticmethod
    def compute_executive_metrics(
        revenue: Decimal,
        cogs: Decimal,
        expenses: Decimal,
        accounts_receivable: Decimal,
        accounts_payable: Decimal,
        inventory_valuation: Decimal,
        top_vendors: List[Dict[str, Any]] = None,
        monthly_trend: List[Dict[str, Any]] = None,
    ) -> ExecutiveAnalyticsResponse:
        net_profit = (revenue - expenses).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        # DSO (Days Sales Outstanding) = (AR / Total Credit Sales) * 365
        annualized_revenue = revenue if revenue > 0 else Decimal("1")
        dso_days = float(((accounts_receivable / annualized_revenue) * Decimal("365.00")).quantize(TWOPLACES))

        # DPO (Days Payable Outstanding) = (AP / Cost of Goods Sold) * 365
        annualized_cogs = cogs if cogs > 0 else Decimal("1")
        dpo_days = float(((accounts_payable / annualized_cogs) * Decimal("365.00")).quantize(TWOPLACES))

        # Inventory Turnover Ratio = COGS / Average Inventory
        inv_val = inventory_valuation
        inv_turnover = float((cogs / inv_val).quantize(TWOPLACES)) if inv_val > 0 else 0.0

        # Cash Flow Health determination
        if net_profit > 0 and accounts_receivable < accounts_payable * Decimal("1.5"):
            cash_flow_health = "HEALTHY"
        elif net_profit > 0:
            cash_flow_health = "MODERATE"
        else:
            cash_flow_health = "AT_RISK"

        return ExecutiveAnalyticsResponse(
            revenue=revenue.quantize(TWOPLACES),
            expenses=expenses.quantize(TWOPLACES),
            net_profit=net_profit,
            accounts_receivable=accounts_receivable.quantize(TWOPLACES),
            accounts_payable=accounts_payable.quantize(TWOPLACES),
            inventory_valuation=inventory_valuation.quantize(TWOPLACES),
            cash_flow_health=cash_flow_health,
            dso_days=dso_days if revenue > 0 else 0,
            dpo_days=dpo_days if cogs > 0 else 0,
            inventory_turnover_ratio=inv_turnover,
            top_vendors_by_spend=top_vendors or [],
            monthly_trend=monthly_trend or [],
        )
