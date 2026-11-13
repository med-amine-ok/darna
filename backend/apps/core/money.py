"""
Money helpers.

Rule BR-PAY-01: amounts are stored as whole centimes (``*_minor`` integer
columns) with a currency code, never as floats. Prices shown to people are
whole dinars. Rates are stored in basis points (bp): 1200 bp = 12 %.
"""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

MINOR_PER_UNIT = 100       # 1 DZD = 100 centimes
BP_DENOMINATOR = 10_000    # 100 % = 10,000 basis points


@dataclass(frozen=True)
class Money:
    """An amount in centimes with its currency. Immutable."""

    amount_minor: int
    currency: str = "DZD"

    def __add__(self, other: "Money") -> "Money":
        """Add two amounts of the same currency."""
        self._check_currency(other)
        return Money(self.amount_minor + other.amount_minor, self.currency)

    def __sub__(self, other: "Money") -> "Money":
        """Subtract two amounts of the same currency."""
        self._check_currency(other)
        return Money(self.amount_minor - other.amount_minor, self.currency)

    def _check_currency(self, other: "Money") -> None:
        """Refuse to mix currencies."""
        if self.currency != other.currency:
            raise ValueError(f"Cannot mix {self.currency} and {other.currency}.")

    def as_dict(self) -> dict:
        """Shape used in every API response: ``{"amount_minor": 5950000, "currency": "DZD"}``."""
        return {"amount_minor": self.amount_minor, "currency": self.currency}


def dzd(units: int | float | Decimal) -> int:
    """Convert dinars to centimes: ``dzd(18_500)`` gives ``1_850_000``."""
    return int((Decimal(str(units)) * MINOR_PER_UNIT).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def apply_bp(amount_minor: int, rate_bp: int) -> int:
    """
    Return ``amount_minor x rate_bp / 10,000`` rounded half up.

    Example: ``apply_bp(5_550_000, 1200)`` gives ``666_000`` (12 % of
    55,500 DZD = 6,660 DZD). Used for commission and discounts.
    """
    value = Decimal(amount_minor) * Decimal(rate_bp) / Decimal(BP_DENOMINATOR)
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def money_dict(amount_minor: int | None, currency: str = "DZD") -> dict | None:
    """API representation of an amount, or ``None`` when there is no amount."""
    if amount_minor is None:
        return None
    return {"amount_minor": int(amount_minor), "currency": currency}
