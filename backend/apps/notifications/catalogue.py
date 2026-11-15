"""
Catalogue of notification kinds: templates in en, fr and ar, criticality and defaults.

BR-NTF-01: every booking state change, verification decision, review
publication and wallet going below 0 creates an in-app notification.
BR-NTF-02 and BR-PRV-03: critical kinds also go by email or SMS and their
email and SMS switches cannot be turned off.

Templates use ``{name}`` placeholders filled from ``Notification.params``;
a missing value renders as an empty string, never as an error.
Add a kind here before calling ``notify`` with it.
"""

import string
from dataclasses import dataclass, field

LOCALES = ("en", "fr", "ar")


@dataclass(frozen=True)
class Kind:
    """One notification kind: templates per locale, criticality and default channel switches."""

    title: dict
    body: dict
    critical: bool = False
    defaults: dict = field(default_factory=lambda: {"email": True, "sms": False, "push": True})


def _k(title_en, title_fr, title_ar, body_en, body_fr, body_ar, *, critical=False, sms=False, email=True) -> Kind:
    """Short constructor for the table below."""
    return Kind(
        title={"en": title_en, "fr": title_fr, "ar": title_ar},
        body={"en": body_en, "fr": body_fr, "ar": body_ar},
        critical=critical,
        defaults={"email": email or critical, "sms": sms or critical, "push": True},
    )


KINDS: dict[str, Kind] = {
    # Bookings (BR-NTF-01, BR-NTF-02: confirmed, declined, expired, cancelled are critical)
    "booking.requested": _k(
        "New booking request", "Nouvelle demande de reservation", "طلب حجز جديد",
        "{guest_name} asks to book {title}.", "{guest_name} demande a reserver {title}.", "{guest_name} يطلب حجز {title}.",
    ),
    "booking.confirmed": _k(
        "Booking confirmed", "Reservation confirmee", "تم تأكيد الحجز",
        "Your booking {reference} for {title} is confirmed.", "Votre reservation {reference} pour {title} est confirmee.",
        "تم تأكيد حجزك {reference} في {title}.", critical=True,
    ),
    "booking.declined": _k(
        "Booking declined", "Reservation refusee", "تم رفض الحجز",
        "The host declined your request {reference}.", "L'hote a refuse votre demande {reference}.",
        "رفض المضيف طلبك {reference}.", critical=True,
    ),
    "booking.expired": _k(
        "Request expired", "Demande expiree", "انتهت صلاحية الطلب",
        "Your request {reference} expired without an answer.", "Votre demande {reference} a expire sans reponse.",
        "انتهت صلاحية طلبك {reference} دون رد.", critical=True,
    ),
    "booking.cancelled": _k(
        "Booking cancelled", "Reservation annulee", "تم إلغاء الحجز",
        "Booking {reference} was cancelled.", "La reservation {reference} a ete annulee.", "تم إلغاء الحجز {reference}.",
        critical=True,
    ),
    "booking.completed": _k(
        "How was your stay?", "Comment s'est passe votre sejour ?", "كيف كانت إقامتك؟",
        "You can review {title} for 14 days.", "Vous pouvez evaluer {title} pendant 14 jours.",
        "يمكنك تقييم {title} خلال 14 يوما.",
    ),
    # Refunds (BR-CAN-06, BR-CAN-07)
    "refund.opened": _k(
        "Refund owed", "Remboursement du", "استرداد مستحق",
        "A refund of {amount} is owed for {reference}.", "Un remboursement de {amount} est du pour {reference}.",
        "استرداد بقيمة {amount} مستحق للحجز {reference}.",
    ),
    "refund.overdue": _k(
        "Refund overdue", "Remboursement en retard", "استرداد متأخر",
        "The refund for {reference} is overdue.", "Le remboursement de {reference} est en retard.",
        "استرداد الحجز {reference} متأخر.",
    ),
    "refund.settled": _k(
        "Refund settled", "Remboursement regle", "تمت تسوية الاسترداد",
        "The refund for {reference} is settled.", "Le remboursement de {reference} est regle.",
        "تمت تسوية استرداد الحجز {reference}.",
    ),
    # Reviews (BR-REV-02, BR-NTF-01)
    "review.received": _k(
        "New review", "Nouvel avis", "تقييم جديد",
        "A review about {reference} was submitted. It is published when both sides have reviewed or after 14 days.",
        "Un avis sur {reference} a ete envoye. Il sera publie quand les deux parties auront donne leur avis ou apres 14 jours.",
        "تم إرسال تقييم عن {reference}. سينشر عندما يقيم الطرفان أو بعد 14 يوما.",
    ),
    "review.published": _k(
        "Review published", "Avis publie", "تم نشر التقييم",
        "The reviews for {reference} are now public.", "Les avis de {reference} sont maintenant publics.",
        "أصبحت تقييمات {reference} منشورة.",
    ),
    # Messages (MSG-01)
    "message.received": _k(
        "New message", "Nouveau message", "رسالة جديدة",
        "{sender_name} sent you a message about {title}.", "{sender_name} vous a envoye un message a propos de {title}.",
        "أرسل لك {sender_name} رسالة بخصوص {title}.", email=False,
    ),
    # Host verification and listings (BR-HST-02, BR-LST-02)
    "verification.approved": _k(
        "Host account approved", "Compte hote approuve", "تمت الموافقة على حساب المضيف",
        "You can now publish your offers.", "Vous pouvez maintenant publier vos offres.", "يمكنك الآن نشر عروضك.",
        critical=True,
    ),
    "verification.changes_requested": _k(
        "Changes requested", "Modifications demandees", "مطلوب تعديلات",
        "Please update your host file: {reason}", "Merci de completer votre dossier hote : {reason}",
        "يرجى تحديث ملف المضيف: {reason}", critical=True,
    ),
    "verification.rejected": _k(
        "Host account rejected", "Compte hote refuse", "تم رفض حساب المضيف",
        "Your host application was rejected: {reason}", "Votre demande d'hote a ete refusee : {reason}",
        "تم رفض طلبك كمضيف: {reason}", critical=True,
    ),
    "listing.published": _k(
        "Listing published", "Annonce publiee", "تم نشر الإعلان",
        "{title} is now visible to guests.", "{title} est maintenant visible.", "{title} أصبح مرئيا للضيوف.",
    ),
    "listing.changes_requested": _k(
        "Listing needs changes", "Annonce a corriger", "الإعلان يحتاج تعديلات",
        "{title}: {reason}", "{title} : {reason}", "{title}: {reason}",
    ),
    "listing.rejected": _k(
        "Listing rejected", "Annonce refusee", "تم رفض الإعلان",
        "{title}: {reason}", "{title} : {reason}", "{title}: {reason}", critical=True,
    ),
    # Wallet (BR-PAY-10, BR-NTF-01)
    "wallet.below_zero": _k(
        "Wallet below zero", "Portefeuille negatif", "الرصيد سالب",
        "Your commission wallet is at {balance}. Top it up to keep receiving bookings.",
        "Votre portefeuille de commission est a {balance}. Rechargez-le pour continuer a recevoir des reservations.",
        "رصيد العمولة لديك {balance}. اشحنه لمواصلة تلقي الحجوزات.", sms=True,
    ),
    "wallet.topup_posted": _k(
        "Top-up received", "Recharge recue", "تم استلام الشحن",
        "{amount} was added to your wallet.", "{amount} a ete ajoute a votre portefeuille.", "تمت إضافة {amount} إلى رصيدك.",
    ),
}


class _Blank(dict):
    """Mapping that renders unknown placeholders as an empty string."""

    def __missing__(self, key):
        """Missing parameter: render nothing instead of failing."""
        return ""


def render(kind: str, params: dict | None, locale: str) -> tuple[str, str]:
    """
    Localized ``(title, body)`` of a notification.

    Unknown locale falls back to French (the default user locale), unknown
    kind falls back to the kind name, so an old row never breaks the list.
    """
    entry = KINDS.get(kind)
    if entry is None:
        return kind, ""
    locale = locale if locale in LOCALES else "fr"
    values = _Blank({key: "" if value is None else value for key, value in (params or {}).items()})
    formatter = string.Formatter()
    return formatter.vformat(entry.title[locale], (), values), formatter.vformat(entry.body[locale], (), values)
