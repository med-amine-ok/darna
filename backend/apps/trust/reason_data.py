"""
Seed of the reason catalogue (MOD-03, 05-database-schema seed step 6).

Each row: ``(action, code, (label_en, label_fr, label_ar), (host_en, host_fr, host_ar) or None)``.
Public actions (``GET /reference/reasons``) come first, then the staff
actions used by moderation decisions, then the ``change_request`` checklist
of BR-MOD-02. Host texts must be reviewed by a native speaker per language
before release (10-testing-quality, plain language).
"""

# Actions a guest or host may ask reasons for on the public endpoint.
PUBLIC_ACTIONS = (
    "decline_booking", "cancel_booking_guest", "cancel_booking_host", "report_review", "report_listing", "dispute",
)

REASONS: list[tuple[str, str, tuple[str, str, str], tuple[str, str, str] | None]] = [
    # Host declines a booking request.
    ("decline_booking", "dates_unavailable", ("Dates no longer available", "Dates plus disponibles", "التواريخ لم تعد متاحة"), None),
    ("decline_booking", "guest_count", ("Too many guests for the place", "Trop de voyageurs pour le logement", "عدد الضيوف أكبر من سعة المكان"), None),
    ("decline_booking", "house_rules", ("Request does not fit the house rules", "La demande ne respecte pas le règlement", "الطلب لا يتوافق مع قواعد المكان"), None),
    ("decline_booking", "maintenance", ("Place under maintenance", "Logement en travaux", "المكان قيد الصيانة"), None),
    ("decline_booking", "other", ("Other reason", "Autre raison", "سبب آخر"), None),
    # Guest cancels.
    ("cancel_booking_guest", "change_of_plans", ("My plans changed", "Mes projets ont changé", "تغيرت خططي"), None),
    ("cancel_booking_guest", "found_alternative", ("I found another place", "J'ai trouvé un autre logement", "وجدت مكانا آخر"), None),
    ("cancel_booking_guest", "travel_problem", ("I can no longer travel", "Je ne peux plus voyager", "لم يعد بإمكاني السفر"), None),
    ("cancel_booking_guest", "host_asked", ("The host asked me to cancel", "L'hôte m'a demandé d'annuler", "طلب مني المضيف الإلغاء"), None),
    ("cancel_booking_guest", "other", ("Other reason", "Autre raison", "سبب آخر"), None),
    # Host cancels.
    ("cancel_booking_host", "place_unavailable", ("The place is no longer available", "Le logement n'est plus disponible", "المكان لم يعد متاحا"), None),
    ("cancel_booking_host", "emergency", ("Emergency", "Cas d'urgence", "حالة طارئة"), None),
    ("cancel_booking_host", "guest_conduct", ("Problem with the guest", "Problème avec le voyageur", "مشكلة مع الضيف"), None),
    ("cancel_booking_host", "double_booking", ("Booked twice by mistake", "Réservé deux fois par erreur", "حجز مزدوج عن طريق الخطأ"), None),
    ("cancel_booking_host", "other", ("Other reason", "Autre raison", "سبب آخر"), None),
    # Reporting a review.
    ("report_review", "offensive", ("Offensive or hateful", "Injurieux ou haineux", "مسيء أو يحض على الكراهية"), None),
    ("report_review", "false_information", ("False information", "Informations fausses", "معلومات خاطئة"), None),
    ("report_review", "personal_data", ("Shares personal information", "Contient des données personnelles", "يكشف معلومات شخصية"), None),
    ("report_review", "not_about_stay", ("Not about the stay", "Ne concerne pas le séjour", "لا يتعلق بالإقامة"), None),
    ("report_review", "spam", ("Spam or advertising", "Spam ou publicité", "رسائل مزعجة أو إعلان"), None),
    # Reporting a listing.
    ("report_listing", "misleading", ("Misleading description or photos", "Description ou photos trompeuses", "وصف أو صور مضللة"), None),
    ("report_listing", "scam", ("Looks like a scam", "Ressemble à une arnaque", "يبدو احتيالا"), None),
    ("report_listing", "illegal", ("Illegal offer", "Offre illégale", "عرض غير قانوني"), None),
    ("report_listing", "unsafe", ("Unsafe place", "Lieu dangereux", "مكان غير آمن"), None),
    ("report_listing", "duplicate", ("Duplicate listing", "Annonce en double", "إعلان مكرر"), None),
    # Disputes (R2).
    ("dispute", "not_as_described", ("Not as described", "Non conforme à l'annonce", "غير مطابق للوصف"), None),
    ("dispute", "no_access", ("Could not get in", "Accès impossible", "تعذر الدخول"), None),
    ("dispute", "cleanliness", ("Cleanliness problem", "Problème de propreté", "مشكلة في النظافة"), None),
    ("dispute", "refund_not_paid", ("Refund not received", "Remboursement non reçu", "لم يصل الاسترداد"), None),
    ("dispute", "other", ("Other problem", "Autre problème", "مشكلة أخرى"), None),
    # Staff: reject a host account (BR-HST-04).
    ("reject_host", "identity_unverified", ("Identity could not be verified", "Identité non vérifiable", "تعذر التحقق من الهوية"),
     ("We could not verify your identity with the documents sent.", "Nous n'avons pas pu vérifier votre identité avec les documents envoyés.", "لم نتمكن من التحقق من هويتك بالوثائق المرسلة.")),
    ("reject_host", "documents_invalid", ("Documents not valid", "Documents non valides", "وثائق غير صالحة"),
     ("Your documents are not valid for this kind of host.", "Vos documents ne sont pas valides pour ce type d'hôte.", "وثائقك غير صالحة لهذا النوع من المضيفين.")),
    ("reject_host", "ineligible_activity", ("Activity not allowed on BLADUS", "Activité non autorisée sur BLADUS", "نشاط غير مسموح به على BLADUS"),
     ("This activity cannot be offered on BLADUS.", "Cette activité ne peut pas être proposée sur BLADUS.", "لا يمكن عرض هذا النشاط على BLADUS.")),
    ("reject_host", "fraud_suspected", ("Fraud suspected", "Suspicion de fraude", "اشتباه في احتيال"),
     ("Your application did not pass our safety checks.", "Votre demande n'a pas passé nos contrôles de sécurité.", "لم يجتز طلبك فحوصات الأمان لدينا.")),
    ("reject_host", "duplicate_account", ("Duplicate host account", "Compte hôte en double", "حساب مضيف مكرر"),
     ("You already have a host account.", "Vous avez déjà un compte hôte.", "لديك حساب مضيف بالفعل.")),
    # Staff: ask a host to complete the application.
    ("request_changes_host", "missing_document", ("A required document is missing", "Un document obligatoire manque", "وثيقة مطلوبة ناقصة"),
     ("Please add the missing document and send again.", "Ajoutez le document manquant puis renvoyez votre demande.", "يرجى إضافة الوثيقة الناقصة ثم إعادة الإرسال.")),
    ("request_changes_host", "unreadable_document", ("A document is unreadable", "Un document est illisible", "وثيقة غير مقروءة"),
     ("Please send a clear, complete photo or scan.", "Envoyez une photo ou un scan net et complet.", "يرجى إرسال صورة أو مسح واضح وكامل.")),
    ("request_changes_host", "expired_document", ("A document has expired", "Un document a expiré", "وثيقة منتهية الصلاحية"),
     ("Please send a document that is still valid.", "Envoyez un document encore valide.", "يرجى إرسال وثيقة سارية المفعول.")),
    ("request_changes_host", "details_mismatch", ("Details do not match", "Les informations ne correspondent pas", "المعلومات غير متطابقة"),
     ("The name or numbers differ between your profile and your documents.", "Le nom ou les numéros diffèrent entre votre profil et vos documents.", "الاسم أو الأرقام مختلفة بين ملفك ووثائقك.")),
    # Staff: reject a listing (BR-LST-02).
    ("reject_listing", "prohibited_content", ("Prohibited content", "Contenu interdit", "محتوى محظور"),
     ("This listing contains content that is not allowed.", "Cette annonce contient un contenu interdit.", "يحتوي هذا الإعلان على محتوى غير مسموح به.")),
    ("reject_listing", "misleading", ("Misleading listing", "Annonce trompeuse", "إعلان مضلل"),
     ("The description or photos do not match the real place.", "La description ou les photos ne correspondent pas au lieu réel.", "الوصف أو الصور لا تطابق المكان الحقيقي.")),
    ("reject_listing", "duplicate", ("Duplicate listing", "Annonce en double", "إعلان مكرر"),
     ("This place is already listed.", "Ce lieu est déjà publié.", "هذا المكان معروض بالفعل.")),
    ("reject_listing", "not_eligible", ("Not eligible for BLADUS", "Non éligible sur BLADUS", "غير مؤهل على BLADUS"),
     ("This kind of offer cannot be published on BLADUS.", "Ce type d'offre ne peut pas être publié sur BLADUS.", "لا يمكن نشر هذا النوع من العروض على BLADUS.")),
    # Staff: reject a trip.
    ("reject_trip", "prohibited_content", ("Prohibited content", "Contenu interdit", "محتوى محظور"),
     ("This trip contains content that is not allowed.", "Ce circuit contient un contenu interdit.", "تحتوي هذه الرحلة على محتوى غير مسموح به.")),
    ("reject_trip", "misleading", ("Misleading trip", "Circuit trompeur", "رحلة مضللة"),
     ("The programme or photos do not match the real trip.", "Le programme ou les photos ne correspondent pas au circuit réel.", "البرنامج أو الصور لا تطابق الرحلة الحقيقية.")),
    ("reject_trip", "licence_missing", ("Tourism licence missing", "Licence de tourisme manquante", "رخصة السياحة ناقصة"),
     ("Trips need a valid tourism licence.", "Les circuits demandent une licence de tourisme valide.", "تتطلب الرحلات رخصة سياحة سارية.")),
    ("reject_trip", "duplicate", ("Duplicate trip", "Circuit en double", "رحلة مكررة"),
     ("This trip is already listed.", "Ce circuit est déjà publié.", "هذه الرحلة معروضة بالفعل.")),
    # Staff: ask for changes on a listing or a trip.
    ("request_changes_listing", "photos_quality", ("Photos need work", "Photos à améliorer", "الصور تحتاج إلى تحسين"),
     ("Please add clear, bright photos of every room.", "Ajoutez des photos nettes et lumineuses de chaque pièce.", "يرجى إضافة صور واضحة ومضيئة لكل غرفة.")),
    ("request_changes_listing", "description_incomplete", ("Description incomplete", "Description incomplète", "الوصف غير مكتمل"),
     ("Please describe the place, its rules and what is included.", "Décrivez le lieu, ses règles et ce qui est inclus.", "يرجى وصف المكان وقواعده وما هو مشمول.")),
    ("request_changes_listing", "price_unrealistic", ("Price looks wrong", "Le prix semble erroné", "السعر يبدو خاطئا"),
     ("Please check the price per night or per person.", "Vérifiez le prix par nuit ou par personne.", "يرجى التحقق من السعر لكل ليلة أو لكل شخص.")),
    ("request_changes_listing", "location_wrong", ("Location looks wrong", "Emplacement erroné", "الموقع يبدو خاطئا"),
     ("Please check the commune and the map pin.", "Vérifiez la commune et le point sur la carte.", "يرجى التحقق من البلدية والموقع على الخريطة.")),
    ("request_changes_listing", "missing_information", ("Information missing", "Informations manquantes", "معلومات ناقصة"),
     ("Please complete the items listed in the request.", "Complétez les points listés dans la demande.", "يرجى إكمال النقاط المذكورة في الطلب.")),
    # Staff: reject one verification document (BR-HST-03).
    ("reject_document", "unreadable", ("Unreadable", "Illisible", "غير مقروءة"),
     ("We cannot read this document. Please send a clearer copy.", "Nous ne pouvons pas lire ce document. Envoyez une copie plus nette.", "لا يمكننا قراءة هذه الوثيقة. يرجى إرسال نسخة أوضح.")),
    ("reject_document", "expired", ("Expired", "Expiré", "منتهية الصلاحية"),
     ("This document has expired.", "Ce document a expiré.", "انتهت صلاحية هذه الوثيقة.")),
    ("reject_document", "wrong_type", ("Wrong document", "Mauvais document", "وثيقة خاطئة"),
     ("This is not the document asked for.", "Ce n'est pas le document demandé.", "هذه ليست الوثيقة المطلوبة.")),
    ("reject_document", "name_mismatch", ("Name does not match", "Le nom ne correspond pas", "الاسم غير مطابق"),
     ("The name on the document differs from your account.", "Le nom sur le document diffère de votre compte.", "الاسم في الوثيقة يختلف عن حسابك.")),
    # Checklist of a change request (BR-MOD-02): ChangeRequestItem.checklist_code.
    ("change_request", "photos", ("Photos", "Photos", "الصور"), None),
    ("change_request", "title", ("Title", "Titre", "العنوان"), None),
    ("change_request", "description", ("Description", "Description", "الوصف"), None),
    ("change_request", "pricing", ("Prices and fees", "Prix et frais", "الأسعار والرسوم"), None),
    ("change_request", "location", ("Location", "Emplacement", "الموقع"), None),
    ("change_request", "amenities", ("Amenities", "Équipements", "المرافق"), None),
    ("change_request", "house_rules", ("House rules", "Règlement intérieur", "قواعد المكان"), None),
    ("change_request", "cancellation_policy", ("Cancellation policy", "Conditions d'annulation", "سياسة الإلغاء"), None),
    ("change_request", "itinerary", ("Trip programme", "Programme du circuit", "برنامج الرحلة"), None),
    ("change_request", "documents", ("Documents", "Documents", "الوثائق"), None),
    ("change_request", "identity", ("Identity details", "Informations d'identité", "معلومات الهوية"), None),
    ("change_request", "business_details", ("Business details", "Informations de l'entreprise", "معلومات المؤسسة"), None),
    ("change_request", "other", ("Other", "Autre", "أخرى"), None),
]


def seed(model) -> int:
    """
    Create or update every row of :data:`REASONS` with ``model`` (idempotent).

    Kept free of imports so the data migration can call it with its
    historical model. Returns the number of rows in the seed.
    """
    for order, (action, code, labels, host_texts) in enumerate(REASONS):
        host_texts = host_texts or ("", "", "")
        model.objects.update_or_create(
            action=action, code=code,
            defaults={
                "label_en": labels[0], "label_fr": labels[1], "label_ar": labels[2],
                "host_text_en": host_texts[0], "host_text_fr": host_texts[1], "host_text_ar": host_texts[2],
                "sort_order": order, "is_active": True,
            },
        )
    return len(REASONS)
