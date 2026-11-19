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

import base64
import sys
import hashlib
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
    DJANGO_DEBUG=(bool, False),
    DJANGO_SECRET_KEY=(str, "dev-only-insecure-key-change-me"),
    DJANGO_ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1", "testserver"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:3000", "http://localhost:3001"]),
    SESSION_TOKEN_TTL_DAYS=(int, 30),
    STAFF_SESSION_TTL_HOURS=(int, 8),
    OTP_TTL_MINUTES=(int, 10),
    OTP_MAX_ATTEMPTS=(int, 5),
    OTP_MAX_SENDS_PER_HOUR=(int, 3),
    OTP_MAX_SENDS_PER_DAY=(int, 10),
    OTP_MAX_SENDS_PER_IP_PER_HOUR=(int, 10),
    SMS_DAILY_BUDGET=(int, 5000),
    SMS_BACKEND=(str, "apps.accounts.sms.ConsoleSmsBackend"),
    HASH_PEPPER=(str, "dev-only-insecure-pepper-change-me"),
    INTEGRATION_KEYS=(list, []),
)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")

if not DEBUG and SECRET_KEY == "dev-only-insecure-key-change-me":
    # Refuse to start in production with the development key.
    raise RuntimeError("Set DJANGO_SECRET_KEY before running with DJANGO_DEBUG=False.")

# R9: server secret for HMAC-SHA256 of session tokens, one-time codes and
# lookup hashes (apps.accounts.models.hash_secret). Changing it invalidates
# every stored hash (sessions, unused codes, invitations).
HASH_PEPPER = env("HASH_PEPPER")
if not DEBUG and HASH_PEPPER == "dev-only-insecure-pepper-change-me":
    raise RuntimeError("Set HASH_PEPPER before running with DJANGO_DEBUG=False.")

# R9, DEC-017: Fernet keys that encrypt hotel system credentials
# (apps.hosts.crypto). Comma list; the first key encrypts, every key decrypts,
# so a new key is added in front and the old one removed after re-encryption.
INTEGRATION_KEYS = [key.strip() for key in env("INTEGRATION_KEYS") if key.strip()]
if not INTEGRATION_KEYS:
    if not DEBUG:
        raise RuntimeError("Set INTEGRATION_KEYS before running with DJANGO_DEBUG=False.")
    # Development only: a stable key derived from the dev SECRET_KEY, so local
    # data stays readable between restarts. Never used when DEBUG is False.
    INTEGRATION_KEYS = [
        base64.urlsafe_b64encode(hashlib.sha256(f"bladus-dev-integration-key:{SECRET_KEY}".encode()).digest()).decode()
    ]

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
    "apps.media",       # L1: uploads and signed file URLs
    "apps.notifications",  # L1: in-app notifications and preferences
    "apps.accounts",    # L2: users, sign-in, one-time codes, staff
    "apps.hosts",       # L2: host accounts, organisations, teams
    "apps.catalog",     # L3: listings, room types, taxonomy
    "apps.inventory",   # L3: calendar and availability
    "apps.trips",       # L3: agency trips and departures
    "apps.pricing",     # L4: quotes
    "apps.ledger",      # L4: host deposit wallet and commission
    "apps.bookings",    # L4: bookings and cancellations
    "apps.reviews",     # L5: reviews, replies, reports
    "apps.messaging",   # L5: guest and host conversations
    "apps.trust",       # L6: moderation cases and reason codes
    "apps.search",      # L6: search facets and map pins
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Serves the Django admin and Swagger static files from gunicorn (no separate file server).
    "whitenoise.middleware.WhiteNoiseMiddleware",
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
# Neon (managed PostgreSQL) gives two connection strings:
# - DATABASE_URL: the pooled one (host contains "-pooler"), used by the
#   running app; many short connections share a few real ones.
# - DATABASE_DIRECT_URL: the direct one, used for migrations, tests and the
#   demo seed, which need a plain session (Neon's own advice).
_DIRECT_COMMANDS = {"migrate", "makemigrations", "showmigrations", "sqlmigrate", "test", "flush", "dbshell", "seed_demo"}
_wants_direct = bool(_DIRECT_COMMANDS.intersection(sys.argv[1:2])) or "pytest" in sys.modules
_database_url = env.str("DATABASE_URL", default="")
_direct_url = env.str("DATABASE_DIRECT_URL", default="")
if _direct_url and (_wants_direct or not _database_url):
    _database_url = _direct_url
# Tests run on a local SQLite file by default (fast, nothing shared). Run them
# on PostgreSQL (Neon) on purpose with TESTS_USE_DATABASE_URL=1: they then use
# a separate test database there, one run at a time.
if "pytest" in sys.modules and not env.bool("TESTS_USE_DATABASE_URL", default=False):
    _database_url = ""
DATABASES = {
    "default": env.db_url_config(_database_url) if _database_url else env.db_url_config(f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
}
DATABASES["default"]["ATOMIC_REQUESTS"] = False
if "postgresql" in DATABASES["default"]["ENGINE"]:
    _db = DATABASES["default"]
    _options = _db.setdefault("OPTIONS", {})
    _local = _db.get("HOST") in ("localhost", "127.0.0.1", "")
    # Neon only accepts encrypted connections; local PostgreSQL may not have SSL.
    _options.setdefault("sslmode", env.str("DATABASE_SSLMODE", default="disable" if _local else "require"))
    _options.setdefault("connect_timeout", 10)
    # Keep connections for a minute and check them before use (Neon may
    # suspend an idle database and close them).
    _db["CONN_MAX_AGE"] = env.int("DATABASE_CONN_MAX_AGE", default=60)
    _db["CONN_HEALTH_CHECKS"] = True
    if "-pooler" in (_db.get("HOST") or ""):
        # The pooler (PgBouncer, transaction mode) cannot keep server-side cursors.
        _db["DISABLE_SERVER_SIDE_CURSORS"] = True

# R15: trigram search lookups (``trigram_word_similar``) come from
# django.contrib.postgres. It is added only on PostgreSQL, so SQLite laptops do
# not need a PostgreSQL driver.
if "postgresql" in DATABASES["default"]["ENGINE"]:
    INSTALLED_APPS.insert(INSTALLED_APPS.index("django.contrib.staticfiles") + 1, "django.contrib.postgres")
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
# ``collectstatic`` gathers the admin and Swagger assets here at build time;
# whitenoise serves them compressed, with long cache headers on hashed names.
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
        if not DEBUG
        else "django.contrib.staticfiles.storage.StaticFilesStorage"
    },
}

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
        "messages": "30/min",  # sending a message (BR-MSG-01)
        "reports": "10/hour",  # reporting a review (BR-REV-03)
        "media_uploads": "120/hour",  # upload slots (BR-MED-01)
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
OTP_MAX_SENDS_PER_HOUR = env("OTP_MAX_SENDS_PER_HOUR")      # BR-ACC-02, R9: per destination
OTP_MAX_SENDS_PER_DAY = env("OTP_MAX_SENDS_PER_DAY")        # R9: per destination
OTP_MAX_SENDS_PER_IP_PER_HOUR = env("OTP_MAX_SENDS_PER_IP_PER_HOUR")  # R9: per client IP
SMS_DAILY_BUDGET = env("SMS_DAILY_BUDGET")                  # R9: SMS per business day, all users
SMS_BACKEND = env("SMS_BACKEND")                            # dotted path of the SMS sender
# Phone check by SMS code (BR-ACC-02, DEC-012). Off for now by decision of the
# owner (2026-11-19): a phone number given by the person counts as enough to
# book, host and finish the profile, and no code is sent. Turn it on
# (PHONE_OTP_REQUIRED=True) once a real SMS provider is set up.
PHONE_OTP_REQUIRED = env.bool("PHONE_OTP_REQUIRED", default=False)

# SMS providers (apps.accounts.sms). Only the one named in SMS_BACKEND is used.
TWILIO_ACCOUNT_SID = env.str("TWILIO_ACCOUNT_SID", default="")
TWILIO_AUTH_TOKEN = env.str("TWILIO_AUTH_TOKEN", default="")
TWILIO_FROM = env.str("TWILIO_FROM", default="")  # a Twilio number (+1...) or an approved sender name
TWILIO_MESSAGING_SERVICE_SID = env.str("TWILIO_MESSAGING_SERVICE_SID", default="")
INFOBIP_BASE_URL = env.str("INFOBIP_BASE_URL", default="")
INFOBIP_API_KEY = env.str("INFOBIP_API_KEY", default="")
INFOBIP_SENDER = env.str("INFOBIP_SENDER", default="BLADUS")
if not DEBUG and SMS_BACKEND.endswith("ConsoleSmsBackend"):
    # Codes would only reach the server logs: nobody could verify a phone.
    import logging as _logging

    _logging.getLogger("bladus.sms").critical(
        "SMS_BACKEND is the console backend in production: phone codes are NOT sent. "
        "Set SMS_BACKEND to apps.accounts.sms.TwilioSmsBackend or apps.accounts.sms.InfobipSmsBackend."
    )

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

# ---------------------------------------------------------------------------
# Email, links, files and payment gateways (2026-11-15 endpoint push)
# ---------------------------------------------------------------------------
# Email: console in development; SMTP (EMAIL_HOST and friends from the
# environment) when DEBUG is False. Links in emails point to the website.
EMAIL_BACKEND = env.str(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend",
)
DEFAULT_FROM_EMAIL = env.str("DEFAULT_FROM_EMAIL", default="BLADUS <no-reply@bladus.dz>")
EMAIL_HOST = env.str("EMAIL_HOST", default="localhost")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env.str("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env.str("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
FRONTEND_URL = env.str("FRONTEND_URL", default="http://localhost:3000")

# Sign in with Google (ACC-10). The client secret stays on the backend; the
# website only sends the one-time code. GOOGLE_REDIRECT_URIS lists the exact
# callback addresses registered in Google Cloud Console (comma separated).
GOOGLE_CLIENT_ID = env.str("GOOGLE_CLIENT_ID", default="")
GOOGLE_CLIENT_SECRET = env.str("GOOGLE_CLIENT_SECRET", default="")
GOOGLE_REDIRECT_URIS = env.list(
    "GOOGLE_REDIRECT_URIS",
    default=["http://localhost:3000/api/auth/google/callback", "https://bladus.dz/api/auth/google/callback"],
)

# Staff (admin panel) second step with an authenticator app (BR-ACC-04).
# Off for now by decision of the owner (2026-11-17): the password alone opens
# the admin. Turn it on (STAFF_MFA_REQUIRED=True) before real staff use it.
STAFF_MFA_REQUIRED = env.bool("STAFF_MFA_REQUIRED", default=False)

# Proxies we run in front of Django that append to X-Forwarded-For (for
# example Caddy, then the website or admin server). 0 = trust no header and
# use the socket address (accounts.views.client_ip, BR-SYS-07).
TRUSTED_PROXY_HOPS = env.int("TRUSTED_PROXY_HOPS", default=0)

# CSV exports (apps.audit.exports) and uploads (apps.media.storage). Local
# folders are for development; production uses S3-compatible storage.
EXPORTS_ROOT = env.str("EXPORTS_ROOT", default=str(BASE_DIR / "var" / "exports"))
MEDIA_STORAGE_BACKEND = env.str("MEDIA_STORAGE_BACKEND", default="local")  # local or s3
MEDIA_LOCAL_ROOT = env.str("MEDIA_LOCAL_ROOT", default=str(BASE_DIR / "var" / "media"))
MEDIA_SCANNER = env.str("MEDIA_SCANNER", default="")  # dotted path; empty = development stub (BR-MED-02)
# File uploads (POST /media/uploads...) can be switched off: the first release
# adds photos by web address, so production may start before storage and a
# virus scanner exist. When they are on, both must be real (no local disk, no stub).
MEDIA_UPLOADS_ENABLED = env.bool("MEDIA_UPLOADS_ENABLED", default=True)
if not DEBUG and MEDIA_UPLOADS_ENABLED and MEDIA_STORAGE_BACKEND == "local":
    raise RuntimeError(
        "Set MEDIA_STORAGE_BACKEND=s3 (and the MEDIA_S3_* variables), or MEDIA_UPLOADS_ENABLED=False, "
        "before running with DJANGO_DEBUG=False."
    )
if not DEBUG and MEDIA_UPLOADS_ENABLED and not MEDIA_SCANNER:
    raise RuntimeError(
        "Set MEDIA_SCANNER to a real virus scanner, or MEDIA_UPLOADS_ENABLED=False, before running with DJANGO_DEBUG=False."
    )
# The MEDIA_S3_* values (endpoint, region, keys, buckets) are read from the
# environment by apps.media.storage.setting(); see .env.example.

# Payment gateway webhook secrets (apps.ledger.gateways). Online payment is
# off in the first release (DEC-019), so empty secrets refuse every webhook.
GATEWAY_WEBHOOK_SECRETS = {
    "chargily": env.str("CHARGILY_WEBHOOK_SECRET", default=""),
    "slickpay": env.str("SLICKPAY_WEBHOOK_SECRET", default=""),
}

# ---------------------------------------------------------------------------
# Production hardening (DJANGO_DEBUG=False): HTTPS, cookies, proxies, cache, logs
# ---------------------------------------------------------------------------
# Browser origins allowed to POST to Django's own forms (the Django admin).
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

if not DEBUG:
    # Render (and Caddy) end HTTPS and forward plain HTTP with this header.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
    # The health check is called by Render over plain HTTP inside its network.
    SECURE_REDIRECT_EXEMPT = [r"^api/v1/health$"]
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # Browsers remember to use HTTPS only (start with one day; raise to a year once all is stable).
    SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=86400)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=False)
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
    X_FRAME_OPTIONS = "DENY"

# Shared cache for rate limits, login lockouts and SMS counters (BR-ACC-05):
# with several server processes these counts must be shared, so production
# uses Redis (Render Key Value). Without REDIS_URL each process counts alone.
REDIS_URL = env.str("REDIS_URL", default="")
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
            "KEY_PREFIX": "bladus",
            "TIMEOUT": 300,
        }
    }

# Logs go to standard output, where Render (and Docker) collect them.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "plain"}},
    "root": {"handlers": ["console"], "level": env.str("LOG_LEVEL", default="INFO")},
    "loggers": {
        "django.request": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "django.security": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        # Bots probing with fake Host headers get a 400; no stack trace for each one.
        "django.security.DisallowedHost": {"handlers": [], "level": "CRITICAL", "propagate": False},
    },
}
