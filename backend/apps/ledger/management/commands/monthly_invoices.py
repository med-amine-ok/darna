"""Monthly job (R2): issue the commission invoices of the previous month with gap-free numbers (BR-PAY-12)."""

from django.core.management.base import BaseCommand

from apps.core.timeutils import business_today
from apps.ledger.services import issue_monthly_invoices


class Command(BaseCommand):
    """``python manage.py monthly_invoices [--year Y --month M]``: run on the 1st of each month at 03:00."""

    help = "Issue commission invoices for one month (default: the previous month). Safe to run twice."

    def add_arguments(self, parser):
        """Optional ``--year`` and ``--month`` to (re)run a given month."""
        parser.add_argument("--year", type=int)
        parser.add_argument("--month", type=int)

    def handle(self, *args, **options):
        """Default to the month before today (Algerian calendar)."""
        today = business_today()
        year, month = options.get("year"), options.get("month")
        if not (year and month):
            year, month = (today.year, today.month - 1) if today.month > 1 else (today.year - 1, 12)
        issued = issue_monthly_invoices(year, month)
        self.stdout.write(f"{len(issued)} invoice(s) issued for {year}-{month:02d}.")
