"""
Django settings for the BLADUS backend.

Every value that changes between a developer laptop, staging and production is
read from the environment (or from a local ``.env`` file, see ``.env.example``).
Nothing secret is written in this file.

Design references (docs/backend):
- 07-architecture.md: apps and layers.
- 08-security-privacy.md: sessions, password hashing, rate limits.
- 04-business-rules.md: business defaults (commission, request window).
"""

from pathlib import Path

import environ

# Folder that contains manage.py.
BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
# ``env`` reads typed values from environment variables. The second element of
# each tuple is the default used on a developer machine.
env = environ.Env(
    DJANGO_DEBUG=(bool, True),
    DJANGO_SECRET_KEY=(str, "dev-only-insecure-key-change-me"),
    DJANGO_ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1", "testserver"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:3000", "http://localhost:3001"]),
    SESSION_TOKEN_TTL_DAYS=(int, 30),
    STAFF_SESSION_TTL_HOURS=(int, 8),
    OTP_TTL_MINUTES=(int, 10),
    OTP_MAX_ATTEMPTS=(int, 5),
    OTP_MAX_SENDS_PER_HOUR=(int, 3),
    SMS_BACKEND=(str, "apps.accounts.sms.ConsoleSmsBackend"),
)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")

if not DEBUG and SECRET_KEY == "dev-only-insecure-key-change-me":
    # Refuse to start in production with the development key.
    raise RuntimeError("Set DJANGO_SECRET_KEY before running with DJANGO_DEBUG=False.")

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "django_filters",
    "drf_spectacular",
    "corsheaders",
]

# BLADUS apps, listed from the lowest layer to the highest
# (an app may only import apps listed before it, see 07-architecture.md).
LOCAL_APPS = [
    "apps.core",        # L0: ids, money, errors, shared base models
    "apps.geo",         # L1: wilayas, dairas, communes
    "apps.config",      # L1: platform settings (commission rates, switches)
    "apps.audit",       # L1: who did what (append-only log)
    "apps.accounts",    # L2: users, sign-in, one-time codes, staff
    "apps.hosts",       # L2: host accounts, organisations, teams
    "apps.catalog",     # L3: listings, room types, taxonomy
    "apps.inventory",   # L3: calendar and availability
    "apps.trips",       # L3: agency trips and departures
    "apps.pricing",     # L4: quotes
    "apps.ledger",      # L4: host deposit wallet and commission
    "apps.bookings",    # L4: bookings and cancellations
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
# Production and staging use PostgreSQL (set DATABASE_URL, for example
# ``postgres://user:pass@localhost:5432/bladus``). Without DATABASE_URL the
# project falls back to SQLite so it runs on any laptop. PostgreSQL-only
# guarantees (exclusion constraint against double booking) are added by
# migrations that do nothing on SQLite; the same rules are also checked in
# the service layer, so behaviour is identical on both.
DATABASES = {
    "default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
}
DATABASES["default"]["ATOMIC_REQUESTS"] = False
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Users and passwords
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"

# Argon2 first (recommended by OWASP); PBKDF2 kept so old hashes still verify.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Languages and time
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "fr"
LANGUAGES = [("en", "English"), ("fr", "Français"), ("ar", "العربية")]
USE_I18N = True

# Timestamps are stored in UTC. Stay dates are plain dates in Algerian time
# (BR-SYS-05); use ``apps.core.timeutils`` to get "today" for business rules.
TIME_ZONE = "UTC"
USE_TZ = True
BUSINESS_TIME_ZONE = "Africa/Algiers"

STATIC_URL = "static/"

# ---------------------------------------------------------------------------
# API (Django REST Framework)
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    # Opaque, revocable session tokens (ACC-03). See apps/accounts/authentication.py.
    "DEFAULT_AUTHENTICATION_CLASSES": ["apps.accounts.authentication.SessionTokenAuthentication"],
    # Deny by default: every view must say who may call it.
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    # One error shape for the whole API (stable code + message + field errors).
    "EXCEPTION_HANDLER": "apps.core.errors.api_exception_handler",
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.PageNumberPagination",
    "PAGE_SIZE": 24,
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "120/min",
        "user": "300/min",
        "auth": "10/min",      # sign-up, sign-in
        "otp": "5/min",        # one-time code requests
        "booking": "20/min",   # booking creation
    },
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "BLADUS / DARNA API",
    "DESCRIPTION": (
        "Backend REST API for the BLADUS travel marketplace (homes, hotels, hostels, experiences, vehicles, agency trips).\n\n"
        "### Interactive Documentation\n"
        "- **Swagger UI**: `/api/docs/` or `/swagger/`\n"
        "- **ReDoc**: `/api/redoc/`\n"
        "- **OpenAPI Schema**: `/api/schema/`\n\n"
        "### Authentication\n"
        "Authentication uses opaque Bearer session tokens. To test protected endpoints:\n"
        "1. Send `POST /api/v1/auth/login` or `POST /api/v1/auth/signup` to receive your token.\n"
        "2. Click the **Authorize** button (top right) in Swagger UI and paste your token.\n"
        "3. Protected endpoints will automatically include `Authorization: Bearer <token>`.\n\n"
        "### Workspace / Host Context\n"
        "Host endpoints accept the `X-Host-Account` header to target a specific host account or organization."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorization": True,
        "displayOperationId": False,
        "filter": True,
        "defaultModelsExpandDepth": 1,
        "defaultModelExpandDepth": 1,
        "syntaxHighlight": {
            "theme": "monokai"
        },
    },
    "REDOC_UI_SETTINGS": {
        "expandResponses": "200,201",
        "hideDownloadButton": False,
    },
}

CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_HEADERS = [
    "accept", "authorization", "content-type", "accept-language",
    "idempotency-key", "x-host-account",
]

# ---------------------------------------------------------------------------
# Sessions and one-time codes (08-security-privacy.md)
# ---------------------------------------------------------------------------
SESSION_TOKEN_TTL_DAYS = env("SESSION_TOKEN_TTL_DAYS")      # guests and hosts
STAFF_SESSION_TTL_HOURS = env("STAFF_SESSION_TTL_HOURS")    # admins
OTP_TTL_MINUTES = env("OTP_TTL_MINUTES")                    # BR-ACC-02
OTP_MAX_ATTEMPTS = env("OTP_MAX_ATTEMPTS")                  # BR-ACC-02
OTP_MAX_SENDS_PER_HOUR = env("OTP_MAX_SENDS_PER_HOUR")      # BR-ACC-02
SMS_BACKEND = env("SMS_BACKEND")                            # dotted path of the SMS sender

# ---------------------------------------------------------------------------
# Business defaults (used when platform settings have no value yet)
# ---------------------------------------------------------------------------
# Rates are in basis points: 1200 = 12 % (BR-PAY-06).
DEFAULT_COMMISSION_BP = {"individual": 1200, "agency": 1500, "hotel": 1800, "hostel": 1000}
DEFAULT_REQUEST_TTL_HOURS = 24            # BR-BKG-04
DEFAULT_CREDIT_LIMIT_MINOR = 20_000 * 100  # 20,000 DZD in centimes (BR-PAY-10)
TOPUP_FOUR_EYES_MINOR = 500_000 * 100      # second admin above 500,000 DZD (BR-PAY-07)
QUOTE_TTL_MINUTES = 30                     # BR-PRC-01
DEFAULT_CURRENCY = "DZD"
