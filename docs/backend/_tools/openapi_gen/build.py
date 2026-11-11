"""Builds docs/backend/openapi.yaml from schemas.py and ops.py. Run: python build.py"""
import os
import json
import re
import sys

import yaml

from schemas import build_schemas, ref, obj, STR, UUID, INT, I64
from ops import OPS

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = f"{ROOT}/openapi.yaml"


class NoAlias(yaml.SafeDumper):
    def ignore_aliases(self, data):
        return True


def str_presenter(dumper, data):
    if "\n" in data:
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")
    return dumper.represent_scalar("tag:yaml.org,2002:str", data)


NoAlias.add_representer(str, str_presenter)

# --------------------------------------------------------------------------
# Known IDs (traceability check)
# --------------------------------------------------------------------------
req_text = open(f"{ROOT}/03-requirements.md", encoding="utf-8").read()
rule_text = open(f"{ROOT}/04-business-rules.md", encoding="utf-8").read()
REQ_IDS = set(re.findall(r"^\| ([A-Z]{3}-\d{2}) \|", req_text, re.M))
RULE_IDS = set(re.findall(r"^\| (BR-[A-Z]{3}-\d{2}) \|", rule_text, re.M))
REQ_RELEASE = {m[0]: m[1] for m in re.findall(r"^\| ([A-Z]{3}-\d{2}) \|[^|]*\|[^|]*\|[^|]*\| (MVP|R2|Later) \|", req_text, re.M)}
assert len(REQ_IDS) >= 147, len(REQ_IDS)

PATH_PARAMS = {
    "listing_id": (STR, "Listing UUID or its reference (LST-XXXXXX)."),
    "room_type_id": (UUID, "Room type id."),
    "slot_id": (UUID, "Experience slot id."),
    "trip_id": (STR, "Trip UUID or its reference."),
    "departure_id": (UUID, "Departure id."),
    "booking_id": (STR, "Booking UUID or its reference (BLD-YYYY-XXXXXX)."),
    "review_id": (UUID, "Review id."),
    "conversation_id": (UUID, "Conversation id."),
    "notification_id": (I64, "Notification id."),
    "media_id": (UUID, "Media asset id."),
    "membership_id": (UUID, "Membership id."),
    "invitation_id": (UUID, "Invitation id."),
    "document_id": (UUID, "Host document id."),
    "payout_account_id": (UUID, "Payout account id."),
    "integration_id": (UUID, "Hotel system connection id."),
    "host_type": (ref("HostType"), "Host type."),
    "host_account_id": (UUID, "Host account id."),
    "case_id": (UUID, "Moderation case id."),
    "user_id": (UUID, "User id."),
    "topup_id": (UUID, "Wallet top-up id."),
    "staff_id": (UUID, "Staff member user id."),
    "category_id": (UUID, "Category id."),
    "amenity_id": (UUID, "Amenity id."),
    "property_type_id": (UUID, "Property type id."),
    "coupon_id": (UUID, "Coupon id."),
    "export_id": (UUID, "Export job id."),
    "version": ({"type": "integer", "minimum": 1}, "Version number."),
    "provider": ({"type": "string", "enum": ["chargily", "slickpay"]}, "Gateway name."),
    "wilaya_code": ({"type": "integer", "minimum": 1, "maximum": 69}, "Wilaya code."),
    "org_slug": (STR, "Organisation slug."),
    "target_type": ({"type": "string", "enum": ["listing", "trip"]}, "What is favourited."),
    "target_id": (UUID, "Listing or trip id."),
    "quote_id": (UUID, "Quote id."),
    "data_request_id": (UUID, "Data subject request id."),
    "payout_id": (UUID, "Payout id."),
}


def problem_response(desc):
    return {"description": desc, "content": {"application/problem+json": {"schema": ref("Problem")}}}


RESPONSES = {
    "BadRequest": problem_response("Malformed request (bad JSON, bad query value). Code e.g. `bad_request`, `invalid_credentials`, `invalid_code`."),
    "Unauthorized": problem_response("No valid session token, or the session was revoked. Code `not_authenticated`."),
    "Forbidden": problem_response("Signed in but not allowed. Codes: `permission_denied` (has `required_permission`), `mfa_required`, `phone_verification_required`, `host_offer_not_allowed`, `four_eyes_same_user`, `account_suspended`."),
    "NotFound": problem_response("Not found, or not visible to the caller (other host accounts look like 404 on purpose), or a dormant feature that is switched off. Code `not_found` or `feature_disabled`."),
    "Conflict": problem_response("The request conflicts with the current state: lost a race, wrong status, duplicate, idempotency key still running. Codes e.g. `dates_unavailable`, `invalid_transition`, `price_changed`, `idempotency_in_progress`."),
    "PreconditionFailed": problem_response("If-Match did not match the current ETag: someone else saved first. Reload and try again. Code `stale_version`."),
    "Unprocessable": problem_response("Validation failed. `errors` lists each field. Also `idempotency_key_reused` (same key, different body)."),
    "TooManyRequests": {"description": "Rate limit reached. Wait for Retry-After seconds. Code `rate_limited` or `login_locked`.",
                        "headers": {"Retry-After": {"$ref": "#/components/headers/RetryAfter"}},
                        "content": {"application/problem+json": {"schema": ref("Problem")}}},
    "NotModified": {"description": "Not modified since the ETag sent in If-None-Match."},
}

PARAMETERS = {
    "AcceptLanguage": {"name": "Accept-Language", "in": "header", "required": False,
                       "description": "Language of labels and error messages: en, fr or ar (default fr). The BFF forwards the user's locale.",
                       "schema": {"type": "string", "default": "fr", "examples": ["ar", "fr-DZ"]}},
    "IdempotencyKey": {"name": "Idempotency-Key", "in": "header", "required": True,
                       "description": "Unique value per user action (UUIDv4 or v7) made by the app. Same key + same body returns the stored response (with header Idempotency-Replayed: true); same key + different body returns 422; while the first call still runs, 409. Kept 24 h (BR-SYS-01).",
                       "schema": {"type": "string", "minLength": 8, "maxLength": 80}},
    "IdempotencyKeyOptional": {"name": "Idempotency-Key", "in": "header", "required": False,
                               "description": "Optional. Same behaviour as on create endpoints; recommended for buttons a user may click twice.",
                               "schema": {"type": "string", "minLength": 8, "maxLength": 80}},
    "XHostAccount": {"name": "X-Host-Account", "in": "header", "required": False,
                     "description": "Host account the request acts for. If missing, the active host account stored in the session (PUT /me/workspaces/active) is used. Checked against the caller's memberships on every request; unknown or not held gives 404 (BR-ORG-01).",
                     "schema": {"type": "string", "format": "uuid"}},
    "IfMatch": {"name": "If-Match", "in": "header", "required": True, "description": "ETag from the last GET. Prevents lost updates (412 when stale).",
                "schema": {"type": "string"}},
    "IfNoneMatch": {"name": "If-None-Match", "in": "header", "required": False, "description": "ETag from a previous response; 304 when nothing changed.",
                    "schema": {"type": "string"}},
    "Cursor": {"name": "cursor", "in": "query", "required": False, "description": "Opaque cursor from `next_cursor` of the previous page.", "schema": {"type": "string"}},
    "Limit": {"name": "limit", "in": "query", "required": False, "description": "Items per page (max 50, SRC-05).",
              "schema": {"type": "integer", "minimum": 1, "maximum": 50, "default": 20}},
    "Page": {"name": "page", "in": "query", "required": False, "description": "Page number, from 1.", "schema": {"type": "integer", "minimum": 1, "default": 1}},
    "PageSize": {"name": "page_size", "in": "query", "required": False, "description": "Rows per page (max 100).",
                 "schema": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20}},
}
for name, (schema, desc) in PATH_PARAMS.items():
    PARAMETERS[f"path_{name}"] = {"name": name, "in": "path", "required": True, "description": desc, "schema": schema}

HEADERS = {
    "RetryAfter": {"description": "Seconds to wait.", "schema": {"type": "integer"}},
    "ETag": {"description": "Version of the representation, for If-None-Match or If-Match.", "schema": {"type": "string"}},
    "IdempotencyReplayed": {"description": "true when this is a stored response replayed for a repeated Idempotency-Key.", "schema": {"type": "string", "enum": ["true"]}},
    "RequestId": {"description": "Correlation id, also in error bodies and logs.", "schema": {"type": "string"}},
}

SECURITY_SCHEMES = {
    "sessionToken": {"type": "apiKey", "in": "header", "name": "X-Session-Token",
                     "description": "django-allauth headless session token of a website user. Only the website BFF (Next.js server) holds it; the browser only has an httpOnly cookie that points to it. Revocable server-side; 30 days sliding (BR-ACC-03)."},
    "staffSession": {"type": "apiKey", "in": "header", "name": "X-Session-Token",
                     "description": "Session token from the staff login (/api/v1/admin/auth). Only the admin BFF holds it. Valid only for staff users with second factor verified; 8 h absolute, 30 min idle. Website tokens are refused on /api/v1/admin/* and staff tokens on host endpoints (STF-05)."},
    "gatewaySignature": {"type": "apiKey", "in": "header", "name": "signature",
                         "description": "HMAC-SHA256 of the raw body computed with the gateway secret (Chargily header `signature`). Checked after the raw body is stored."},
}

TAGS = [
    ("auth", "Sign up, sign in (password or phone code), sessions, second factor. Thin summary of django-allauth headless."),
    ("public.geo", "Wilayas and communes."),
    ("public.reference", "Shared lists: experience and trip types, amenities, policies, reasons, onboarding flows."),
    ("public.catalog", "Search, facets, map, listing pages, availability and quotes."),
    ("public.trips", "Agency trips and departures."),
    ("public.profiles", "Public organisation and user pages."),
    ("me.profile", "The signed-in user: profile, consents, data protection requests."),
    ("me.favorites", "Favourites."),
    ("me.notifications", "In-app notifications and preferences."),
    ("me.bookings", "Bookings as a guest: create, cancel, review, dispute; invitation acceptance."),
    ("messaging", "Conversations between guests and hosts, with cursor sync."),
    ("media", "Presigned uploads and private file links."),
    ("host.workspace", "Workspace switcher and the active host account."),
    ("host.onboarding", "Become-a-host drafts and submission."),
    ("host.verification", "Documents, verification submission, change requests, payout details."),
    ("host.organization", "Organisation profile, team and invitations."),
    ("host.listings", "Listings, room types, experience slots."),
    ("host.calendar", "Blocks and per-day prices."),
    ("host.trips", "Agency trips and departures."),
    ("host.bookings", "Requests and bookings of the active host account."),
    ("host.reviews", "Reviews received and replies."),
    ("host.wallet", "Commission wallet, history, earnings, invoices, payouts (dormant)."),
    ("webhooks", "Incoming gateway callbacks (dormant)."),
    ("admin.auth", "Staff sign in with mandatory second factor."),
    ("admin.moderation", "Queues, cases and decisions."),
    ("admin.hosts", "Host accounts, verification, documents, commission overrides."),
    ("admin.catalog", "Listings and trips as staff."),
    ("admin.bookings", "Bookings, cancellations, refunds, disputes."),
    ("admin.users", "Users and data protection requests."),
    ("admin.reviews", "Review moderation."),
    ("admin.finance", "Wallets, ledger, top-ups with four-eyes, commission rates, payouts (dormant)."),
    ("admin.settings", "Platform settings with versions."),
    ("admin.onboarding", "Versioned onboarding flows."),
    ("admin.taxonomy", "Categories, amenities, property types."),
    ("admin.promotions", "Coupons (R2)."),
    ("admin.staff", "Staff, roles, invitations."),
    ("admin.audit", "Audit log and exports."),
    ("admin.analytics", "KPIs, charts, global search."),
]
TAG_GROUPS = [
    ("Auth", ["auth"]),
    ("Public", ["public.geo", "public.reference", "public.catalog", "public.trips", "public.profiles"]),
    ("Me (guest)", ["me.profile", "me.favorites", "me.notifications", "me.bookings"]),
    ("Shared", ["messaging", "media"]),
    ("Host (active host account)", ["host.workspace", "host.onboarding", "host.verification", "host.organization", "host.listings", "host.calendar", "host.trips",
                                    "host.bookings", "host.reviews", "host.wallet"]),
    ("Admin (staff only, MFA)", [t for t, _ in TAGS if t.startswith("admin.")]),
    ("Webhooks", ["webhooks"]),
]

INFO_DESC = """BLADUS marketplace API (homes, hotels, hostels, experiences, vehicles, agency trips).

**Read 06-api-design.md first.** In short:

* Base path `/api/v1`. JSON in snake_case. Money is `{amount_minor, currency}` in centimes (1 DZD = 100). IDs are UUIDv7, plus human references (BLD-2026-7K2M9Q, LST-7K2M9Q).
* Callers are the two Next.js servers (BFF), never the browser directly. They send the allauth session token in `X-Session-Token`.
* Host endpoints act for the **active host account** (a user or an organisation): header `X-Host-Account` or the one stored in the session.
* `/api/v1/admin/*` is only for staff sessions with a verified second factor.
* Errors use `application/problem+json` with a stable `code` and a localized `message` (en, fr, ar).
* Money model M1 (DEC-001): guests pay hosts directly; BLADUS deducts commission from a prepaid host wallet. Guest payments, escrow and payouts exist here only as **dormant** operations (`x-dormant: true`), returning 404 until a feature flag is switched on.

Vendor extensions on every operation:
`x-requirements` (IDs in 03-requirements.md), `x-rules` (IDs in 04-business-rules.md), `x-release` (MVP, R2, Later), `x-dormant`, `x-host-permission` (organisation permission, BR-ORG-05), `x-staff-permission` (staff permission, BR-STF-01).
"""

from examples import EXAMPLES


def build():
    schemas = build_schemas(f"{ROOT}/schema.dbml")
    for unused in ("CursorMeta", "StatusChange"):
        schemas.pop(unused)
    paths = {}
    seen_ids = set()
    errors = []
    for o in OPS:
        if o["opid"] in seen_ids:
            errors.append(f"duplicate operationId {o['opid']}")
        seen_ids.add(o["opid"])
        for r in o["req"]:
            if r not in REQ_IDS:
                errors.append(f"{o['opid']}: unknown requirement {r}")
        for r in o["rules"]:
            if r not in RULE_IDS:
                errors.append(f"{o['opid']}: unknown rule {r}")
        method, path, auth = o["method"], o["path"], o["auth"]
        params = [{"$ref": "#/components/parameters/AcceptLanguage"}]
        for name in re.findall(r"\{(\w+)\}", path):
            if name not in PATH_PARAMS:
                errors.append(f"no path param def {name}")
            params.append({"$ref": f"#/components/parameters/path_{name}"})
        if auth == "host":
            params.append({"$ref": "#/components/parameters/XHostAccount"})
        if o["idem"] == "required":
            params.append({"$ref": "#/components/parameters/IdempotencyKey"})
        elif o["idem"] == "optional":
            params.append({"$ref": "#/components/parameters/IdempotencyKeyOptional"})
        if o["if_match"]:
            params.append({"$ref": "#/components/parameters/IfMatch"})
        if o["etag"]:
            params.append({"$ref": "#/components/parameters/IfNoneMatch"})
        for q in o["query"]:
            if q not in params:
                params.append(q)

        operation = {"operationId": o["opid"], "summary": o["summary"], "tags": [o["tag"]]}
        desc = o["desc"] or ""
        if o["dormant"] and "DORMANT" not in desc:
            desc = "DORMANT. " + desc
        if desc:
            operation["description"] = desc
        if auth in ("public",):
            operation["security"] = []
        elif auth == "optional":
            operation["security"] = [{}, {"sessionToken": []}]
        elif auth in ("user", "host"):
            operation["security"] = [{"sessionToken": []}]
        elif auth in ("staff", "staff_any"):
            operation["security"] = [{"staffSession": []}]
        elif auth == "webhook":
            operation["security"] = [{"gatewaySignature": []}]
        operation["parameters"] = params
        if o["body"] is not None:
            operation["requestBody"] = {"required": o["body_required"], "content": {"application/json": {"schema": o["body"]}}}
            if o["opid"] in EXAMPLES and "request" in EXAMPLES[o["opid"]]:
                operation["requestBody"]["content"]["application/json"]["example"] = EXAMPLES[o["opid"]]["request"]

        # success response
        status = o["status"] or (200 if o["resp"] is not None else 204)
        responses = {}
        if status == 204:
            responses["204"] = {"description": "Done. No body."}
        else:
            hdrs = {"X-Request-Id": {"$ref": "#/components/headers/RequestId"}}
            if o["etag"] or o["if_match"] or method == "get" and o["opid"] in ("adminGetSettings",):
                hdrs["ETag"] = {"$ref": "#/components/headers/ETag"}
            if o["idem"]:
                hdrs["Idempotency-Replayed"] = {"$ref": "#/components/headers/IdempotencyReplayed"}
            content = {"application/json": {"schema": o["resp"]}}
            if o["opid"] in EXAMPLES and "response" in EXAMPLES[o["opid"]]:
                content["application/json"]["example"] = EXAMPLES[o["opid"]]["response"]
            responses[str(status)] = {"description": o["resp_desc"] or {200: "OK", 201: "Created", 202: "Accepted, processing continues in the background"}[status],
                                      "headers": hdrs, "content": content}
            if o["opid"] == "startConversation":
                responses["200"] = {"description": "The conversation already existed.", "content": {"application/json": {"schema": o["resp"]}}}
        if o["etag"]:
            responses["304"] = {"$ref": "#/components/responses/NotModified"}
        err = {"400"}
        if auth in ("user", "host", "staff", "staff_any", "webhook"):
            err.add("401")
        if auth in ("user", "host", "staff", "staff_any"):
            err.add("403")
        if "{" in path or o["dormant"] or auth == "host":
            err.add("404")
        if o["conflict"] or o["idem"]:
            err.add("409")
        if o["if_match"]:
            err.add("412")
        if method in ("post", "put", "patch") and (o["body"] is not None or o["idem"]):
            err.add("422")
        if o["rate"] or o["tag"] == "auth":
            err.add("429")
        names = {"400": "BadRequest", "401": "Unauthorized", "403": "Forbidden", "404": "NotFound", "409": "Conflict", "412": "PreconditionFailed",
                 "422": "Unprocessable", "429": "TooManyRequests"}
        for code in sorted(err):
            responses[code] = {"$ref": f"#/components/responses/{names[code]}"}
        operation["responses"] = responses
        operation["x-requirements"] = o["req"]
        operation["x-rules"] = o["rules"]
        rel = o["release"]
        if rel is None:
            rels = {REQ_RELEASE.get(r) for r in o["req"]}
            rel = "MVP" if "MVP" in rels else ("R2" if "R2" in rels else "Later")
        operation["x-release"] = rel
        if o["dormant"]:
            operation["x-dormant"] = True
        if auth == "host":
            operation["x-host-permission"] = o["perm"] or "any active member"
        if auth in ("staff",):
            operation["x-staff-permission"] = o["perm"] or "any staff"
        paths.setdefault(path, {})[method] = operation

    if errors:
        print("\n".join(errors))
        sys.exit(1)

    doc = {
        "openapi": "3.1.0",
        "info": {"title": "BLADUS API", "version": "1.0.0-draft.1", "summary": "Backend contract for the BLADUS website and admin apps (documentation, not yet implemented).",
                 "description": INFO_DESC, "contact": {"name": "BLADUS backend team", "email": "dev@bladus.dz"},
                 "license": {"name": "Proprietary, all rights reserved", "url": "https://bladus.dz/legal"}},
        "servers": [{"url": "https://api.bladus.dz", "description": "Production"},
                    {"url": "https://api.staging.bladus.dz", "description": "Staging"}],
        "security": [{"sessionToken": []}],
        "tags": [{"name": t, "description": dsc} for t, dsc in TAGS],
        "x-tagGroups": [{"name": n, "tags": ts} for n, ts in TAG_GROUPS],
        "paths": paths,
        "components": {"schemas": schemas, "parameters": PARAMETERS, "responses": RESPONSES, "headers": HEADERS, "securitySchemes": SECURITY_SCHEMES},
    }
    text = yaml.dump(doc, Dumper=NoAlias, sort_keys=False, allow_unicode=True, width=140, default_flow_style=False)
    header = ("# BLADUS API, OpenAPI 3.1 contract (Phase 6 of the backend blueprint).\n"
              "# Documentation only: the Django code does not exist yet. Explained in 06-api-design.md.\n"
              "# Enums match schema.dbml exactly. Lint: npx @redocly/cli lint openapi.yaml\n")
    assert "\u2014" not in text, "em dash found"
    open(OUT, "w", encoding="utf-8", newline="\n").write(header + text)

    # stats for the design doc
    used_reqs = {r for o in OPS for r in o["req"]}
    used_rules = {r for o in OPS for r in o["rules"]}
    stats = {"operations": len(OPS), "paths": len(paths),
             "by_group": {}, "dormant": [o["opid"] for o in OPS if o["dormant"]],
             "reqs_not_cited": sorted(REQ_IDS - used_reqs), "rules_not_cited": sorted(RULE_IDS - used_rules)}
    for o in OPS:
        g = o["tag"].split(".")[0]
        stats["by_group"][g] = stats["by_group"].get(g, 0) + 1
    json.dump(stats, open("stats.json", "w"), indent=1)
    ops_list = [(o["method"].upper(), o["path"], o["opid"], o["tag"]) for o in OPS]
    json.dump(ops_list, open("ops.json", "w"), indent=0)
    print(json.dumps(stats, indent=1))


if __name__ == "__main__":
    build()
