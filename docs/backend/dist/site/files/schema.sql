-- Generated from schema.dbml with @dbml/cli (dbml2sql --postgres) by _tools/build_schema_sql.py.
-- Documentation artifact, not a migration. The extra SQL (exclusion constraint, checks, triggers,
-- role split, trigram indexes) from 05-database-schema.md section 6 is appended after the marker line.
-- SQL dump generated using DBML (dbml.dbdiagram.io)
-- Database: PostgreSQL

CREATE TYPE "user_status" AS ENUM (
  'active',
  'suspended',
  'banned',
  'deleted'
);

CREATE TYPE "staff_role_code" AS ENUM (
  'admin'
);

CREATE TYPE "staff_status" AS ENUM (
  'invited',
  'active',
  'deactivated'
);

CREATE TYPE "host_account_kind" AS ENUM (
  'individual',
  'organization'
);

CREATE TYPE "business_category" AS ENUM (
  'agency',
  'hotel',
  'hostel'
);

CREATE TYPE "verification_status" AS ENUM (
  'applied',
  'under_review',
  'changes_requested',
  'approved',
  'rejected',
  'suspended',
  'banned'
);

CREATE TYPE "membership_role" AS ENUM (
  'owner',
  'admin',
  'manager',
  'agent',
  'guide'
);

CREATE TYPE "invitation_status" AS ENUM (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

CREATE TYPE "document_type" AS ENUM (
  'national_id',
  'passport',
  'property_proof',
  'lease_authorisation',
  'apc_declaration',
  'insurance',
  'auto_entrepreneur_card',
  'commercial_register',
  'tax_card_nif',
  'statistics_nis',
  'tourism_licence',
  'hotel_classification',
  'operating_authorisation',
  'vehicle_registration',
  'vehicle_insurance',
  'technical_inspection',
  'driving_licence'
);

CREATE TYPE "document_status" AS ENUM (
  'pending',
  'approved',
  'rejected',
  'expired'
);

CREATE TYPE "approval_mode" AS ENUM (
  'instant',
  'request'
);

CREATE TYPE "vertical" AS ENUM (
  'home',
  'hotel',
  'hostel',
  'experience',
  'vehicle'
);

CREATE TYPE "experience_type" AS ENUM (
  'excursion',
  'guided_tour',
  'nature_adventure',
  'desert',
  'sport',
  'culture_workshop',
  'gastronomy',
  'wellness'
);

CREATE TYPE "trip_type" AS ENUM (
  'group_tour',
  'private_trip',
  'adventure',
  'desert_expedition',
  'cultural',
  'hiking',
  'relaxation',
  'religious'
);

CREATE TYPE "listing_status" AS ENUM (
  'draft',
  'pending_review',
  'changes_requested',
  'published',
  'paused',
  'rejected',
  'suspended',
  'archived',
  'deleted'
);

CREATE TYPE "booking_unit" AS ENUM (
  'room',
  'bed'
);

CREATE TYPE "inventory_kind" AS ENUM (
  'single',
  'room_pool',
  'slot',
  'departure'
);

CREATE TYPE "booking_status" AS ENUM (
  'awaiting_payment',
  'pending',
  'confirmed',
  'declined',
  'expired',
  'cancelled',
  'completed',
  'disputed'
);

CREATE TYPE "payment_status" AS ENUM (
  'not_collected',
  'awaiting',
  'paid',
  'partially_refunded',
  'refunded',
  'failed'
);

CREATE TYPE "actor_role" AS ENUM (
  'guest',
  'host',
  'staff',
  'system'
);

CREATE TYPE "departure_status" AS ENUM (
  'scheduled',
  'guaranteed',
  'cancelled',
  'completed'
);

CREATE TYPE "ledger_account_kind" AS ENUM (
  'host_wallet',
  'platform_cash',
  'commission_revenue',
  'vat_payable',
  'guest_receivable',
  'escrow',
  'host_payable',
  'payout_clearing',
  'adjustments',
  'host_refund_payable',
  'guest_refund_clearing'
);

CREATE TYPE "ledger_tx_kind" AS ENUM (
  'wallet_topup',
  'commission',
  'commission_reversal',
  'adjustment',
  'refund_due',
  'refund_settled',
  'guest_payment',
  'refund',
  'payout'
);

CREATE TYPE "adjustment_status" AS ENUM (
  'pending_approval',
  'approved',
  'rejected'
);

CREATE TYPE "refund_obligation_status" AS ENUM (
  'open',
  'declared',
  'settled',
  'disputed'
);

CREATE TYPE "stay_confirmed_via" AS ENUM (
  'host_code',
  'guest'
);

CREATE TYPE "inventory_conflict_status" AS ENUM (
  'open',
  'resolved'
);

CREATE TYPE "topup_method" AS ENUM (
  'ccp_transfer',
  'bank_transfer',
  'baridimob',
  'cash_office',
  'gateway'
);

CREATE TYPE "topup_status" AS ENUM (
  'pending_approval',
  'approved',
  'rejected'
);

CREATE TYPE "review_status" AS ENUM (
  'submitted',
  'published',
  'flagged',
  'hidden',
  'removed'
);

CREATE TYPE "conversation_kind" AS ENUM (
  'inquiry',
  'booking',
  'support'
);

CREATE TYPE "media_status" AS ENUM (
  'quarantined',
  'ready',
  'rejected',
  'deleted'
);

CREATE TYPE "media_bucket" AS ENUM (
  'public',
  'private'
);

CREATE TYPE "case_kind" AS ENUM (
  'host_verification',
  'listing_review',
  'listing_revision',
  'trip_review',
  'document',
  'review_report',
  'dispute',
  'risk_flag',
  'legal_change',
  'host_cancellations'
);

CREATE TYPE "case_status" AS ENUM (
  'open',
  'in_progress',
  'resolved'
);

CREATE TYPE "case_priority" AS ENUM (
  'low',
  'normal',
  'high'
);

CREATE TYPE "flow_status" AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE "outbox_status" AS ENUM (
  'pending',
  'sent',
  'dead'
);

CREATE TYPE "dsr_kind" AS ENUM (
  'access',
  'rectification',
  'deletion',
  'opposition'
);

CREATE TABLE "user" (
  "id" uuid PRIMARY KEY,
  "email" varchar(254),
  "email_verified_at" timestamptz,
  "phone_e164" varchar(16),
  "phone_verified_at" timestamptz,
  "password" varchar(255),
  "first_name_latin" varchar(80),
  "last_name_latin" varchar(80),
  "full_name_ar" varchar(160),
  "avatar_media_id" uuid,
  "bio" text,
  "spoken_languages" varchar(2)[],
  "home_commune_id" int,
  "address_line" varchar(255),
  "preferred_locale" varchar(2) NOT NULL DEFAULT 'fr',
  "nationality_iso2" char(2),
  "status" user_status NOT NULL DEFAULT 'active',
  "is_staff" boolean NOT NULL DEFAULT false,
  "date_joined" timestamptz NOT NULL,
  "last_login_at" timestamptz,
  "deleted_at" timestamptz,
  "anonymised_at" timestamptz
);

CREATE TABLE "staff_profile" (
  "user_id" uuid PRIMARY KEY,
  "role" staff_role_code NOT NULL,
  "status" staff_status NOT NULL DEFAULT 'invited',
  "invited_by_id" uuid,
  "invited_at" timestamptz,
  "activated_at" timestamptz,
  "deactivated_at" timestamptz
);

CREATE TABLE "staff_permission" (
  "code" varchar(64) PRIMARY KEY,
  "description" text
);

CREATE TABLE "staff_role_permission" (
  "role" staff_role_code,
  "permission_code" varchar(64),
  PRIMARY KEY ("role", "permission_code")
);

CREATE TABLE "consent_record" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "document" varchar(32) NOT NULL,
  "version" varchar(32) NOT NULL,
  "accepted" boolean NOT NULL,
  "ip" inet,
  "user_agent" text,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "favorite" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "listing_id" uuid,
  "trip_id" uuid,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "wilaya" (
  "code" smallint PRIMARY KEY,
  "name_fr" varchar(80) NOT NULL,
  "name_ar" varchar(80) NOT NULL,
  "name_en" varchar(80) NOT NULL,
  "legacy_code_58" smallint,
  "region" varchar(16),
  "boundary" "geometry(MultiPolygon,4326)",
  "centroid" "geography(Point,4326)",
  "source" varchar(64) NOT NULL,
  "valid_from" date NOT NULL
);

CREATE TABLE "daira" (
  "id" int PRIMARY KEY,
  "wilaya_code" smallint NOT NULL,
  "name_fr" varchar(80) NOT NULL,
  "name_ar" varchar(80) NOT NULL
);

CREATE TABLE "commune" (
  "id" int PRIMARY KEY,
  "wilaya_code" smallint NOT NULL,
  "daira_id" int,
  "name_fr" varchar(100) NOT NULL,
  "name_ar" varchar(100) NOT NULL,
  "name_en" varchar(100) NOT NULL,
  "postal_code" varchar(5),
  "centroid" "geography(Point,4326)",
  "source" varchar(64) NOT NULL,
  "valid_from" date NOT NULL
);

CREATE TABLE "host_account" (
  "id" uuid PRIMARY KEY,
  "kind" host_account_kind NOT NULL,
  "user_id" uuid UNIQUE,
  "organization_id" uuid UNIQUE,
  "verification_status" verification_status NOT NULL DEFAULT 'applied',
  "status_before_delete" verification_status,
  "default_approval_mode" approval_mode NOT NULL DEFAULT 'request',
  "commission_rate_override_bp" int,
  "credit_limit_override_minor" bigint,
  "host_cancellations_12m" int NOT NULL DEFAULT 0,
  "rating_avg" numeric(3,2),
  "review_count" int NOT NULL DEFAULT 0,
  "submitted_at" timestamptz,
  "approved_at" timestamptz,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz
);

CREATE TABLE "organization" (
  "id" uuid PRIMARY KEY,
  "business_category" business_category NOT NULL,
  "display_name" varchar(120) NOT NULL,
  "legal_name" varchar(160),
  "slug" varchar(140) UNIQUE NOT NULL,
  "description" text,
  "source_language" varchar(2) NOT NULL DEFAULT 'fr',
  "logo_media_id" uuid,
  "cover_media_id" uuid,
  "business_email" varchar(254),
  "business_phone_e164" varchar(16),
  "commune_id" int,
  "address_line" varchar(255),
  "rc_number" varchar(32),
  "nif" varchar(20),
  "nis" varchar(20),
  "article_imposition" varchar(20),
  "tourism_licence_number" varchar(40),
  "star_rating" smallint,
  "check_in_time" time,
  "check_out_time" time,
  "policies" jsonb,
  "team_size_range" varchar(16),
  "created_by_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz
);

CREATE TABLE "membership" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" membership_role NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "joined_at" timestamptz NOT NULL,
  "removed_at" timestamptz
);

CREATE TABLE "invitation" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid NOT NULL,
  "email" varchar(254),
  "phone_e164" varchar(16),
  "role" membership_role NOT NULL,
  "token_hash" char(64) UNIQUE NOT NULL,
  "status" invitation_status NOT NULL DEFAULT 'pending',
  "invited_by_id" uuid NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "accepted_by_id" uuid,
  "accepted_at" timestamptz,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "host_document" (
  "id" uuid PRIMARY KEY,
  "host_account_id" uuid NOT NULL,
  "listing_id" uuid,
  "doc_type" document_type NOT NULL,
  "media_id" uuid NOT NULL,
  "status" document_status NOT NULL DEFAULT 'pending',
  "number_hash" char(64),
  "expires_on" date,
  "reviewed_by_id" uuid,
  "reviewed_at" timestamptz,
  "rejection_reason_id" uuid,
  "created_at" timestamptz NOT NULL,
  "deleted_at" timestamptz
);

CREATE TABLE "payout_account" (
  "id" uuid PRIMARY KEY,
  "host_account_id" uuid NOT NULL,
  "kind" varchar(16) NOT NULL,
  "holder_name" varchar(160) NOT NULL,
  "number_encrypted" bytea NOT NULL,
  "number_last4" char(4) NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "hold_until" timestamptz,
  "created_at" timestamptz NOT NULL,
  "deleted_at" timestamptz
);

CREATE TABLE "category" (
  "id" uuid PRIMARY KEY,
  "vertical" vertical NOT NULL,
  "slug" varchar(60) NOT NULL,
  "name_en" varchar(80) NOT NULL,
  "name_fr" varchar(80) NOT NULL,
  "name_ar" varchar(80) NOT NULL,
  "icon" varchar(40),
  "sort_order" int NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true
);

CREATE TABLE "property_type" (
  "id" uuid PRIMARY KEY,
  "vertical" vertical NOT NULL,
  "slug" varchar(60) NOT NULL,
  "name_en" varchar(80) NOT NULL,
  "name_fr" varchar(80) NOT NULL,
  "name_ar" varchar(80) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true
);

CREATE TABLE "amenity" (
  "id" uuid PRIMARY KEY,
  "slug" varchar(60) UNIQUE NOT NULL,
  "group_code" varchar(20) NOT NULL,
  "name_en" varchar(80) NOT NULL,
  "name_fr" varchar(80) NOT NULL,
  "name_ar" varchar(80) NOT NULL,
  "icon" varchar(40),
  "applies_to" vertical[] NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true
);

CREATE TABLE "cancellation_policy" (
  "id" uuid PRIMARY KEY,
  "code" varchar(20) NOT NULL,
  "version" int NOT NULL,
  "name_en" varchar(60) NOT NULL,
  "name_fr" varchar(60) NOT NULL,
  "name_ar" varchar(60) NOT NULL,
  "windows" jsonb NOT NULL,
  "is_current" boolean NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "listing" (
  "id" uuid PRIMARY KEY,
  "reference" varchar(16) UNIQUE NOT NULL,
  "host_account_id" uuid NOT NULL,
  "vertical" vertical NOT NULL,
  "status" listing_status NOT NULL DEFAULT 'draft',
  "status_before_delete" listing_status,
  "inventory_kind" inventory_kind NOT NULL,
  "experience_type" experience_type,
  "title" varchar(120) NOT NULL,
  "description" text NOT NULL,
  "source_language" varchar(2) NOT NULL,
  "category_id" uuid,
  "property_type_id" uuid,
  "commune_id" int NOT NULL,
  "address_line" varchar(255),
  "location_exact" "geography(Point,4326)" NOT NULL,
  "location_public" "geography(Point,4326)" NOT NULL,
  "capacity_guests" smallint NOT NULL,
  "bedrooms" smallint,
  "beds" smallint,
  "bathrooms" numeric(3,1),
  "surface_m2" int,
  "currency" char(3) NOT NULL DEFAULT 'DZD',
  "base_price_minor" bigint NOT NULL,
  "cleaning_fee_minor" bigint NOT NULL DEFAULT 0,
  "weekly_discount_bp" int NOT NULL DEFAULT 0,
  "monthly_discount_bp" int NOT NULL DEFAULT 0,
  "min_nights" smallint NOT NULL DEFAULT 1,
  "max_nights" smallint NOT NULL DEFAULT 90,
  "advance_notice_days" smallint NOT NULL DEFAULT 0,
  "available_from" date,
  "available_until" date,
  "check_in_time" time,
  "check_out_time" time,
  "approval_mode" approval_mode,
  "cancellation_policy_id" uuid NOT NULL,
  "house_rules" jsonb,
  "rating_avg" numeric(3,2),
  "review_count" int NOT NULL DEFAULT 0,
  "submitted_at" timestamptz,
  "published_at" timestamptz,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz
);

CREATE TABLE "listing_revision" (
  "id" uuid PRIMARY KEY,
  "listing_id" uuid NOT NULL,
  "payload" jsonb NOT NULL,
  "status" varchar(16) NOT NULL,
  "submitted_by_id" uuid NOT NULL,
  "submitted_at" timestamptz NOT NULL,
  "decided_by_id" uuid,
  "decided_at" timestamptz
);

CREATE TABLE "vehicle_detail" (
  "listing_id" uuid PRIMARY KEY,
  "make" varchar(40) NOT NULL,
  "model" varchar(60) NOT NULL,
  "year" smallint NOT NULL,
  "seats" smallint NOT NULL,
  "transmission" varchar(12) NOT NULL,
  "fuel" varchar(12) NOT NULL,
  "daily_km_limit" int,
  "driver_min_age" smallint NOT NULL DEFAULT 25,
  "licence_min_years" smallint NOT NULL DEFAULT 2,
  "security_deposit_minor" bigint
);

CREATE TABLE "experience_detail" (
  "listing_id" uuid PRIMARY KEY,
  "duration_minutes" int NOT NULL,
  "languages" varchar(2)[] NOT NULL,
  "meeting_point" "geography(Point,4326)",
  "meeting_point_text" varchar(255),
  "max_group" smallint NOT NULL,
  "includes" jsonb
);

CREATE TABLE "room_type" (
  "id" uuid PRIMARY KEY,
  "listing_id" uuid NOT NULL,
  "name" varchar(80) NOT NULL,
  "description" text,
  "booking_unit" booking_unit NOT NULL,
  "unit_count" smallint NOT NULL,
  "capacity_per_unit" smallint NOT NULL,
  "base_price_minor" bigint NOT NULL,
  "beds_description" varchar(120),
  "external_id" varchar(80),
  "integration_id" uuid,
  "sort_order" int NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL,
  "deleted_at" timestamptz
);

CREATE TABLE "listing_amenity" (
  "listing_id" uuid,
  "amenity_id" uuid,
  PRIMARY KEY ("listing_id", "amenity_id")
);

CREATE TABLE "room_type_amenity" (
  "room_type_id" uuid,
  "amenity_id" uuid,
  PRIMARY KEY ("room_type_id", "amenity_id")
);

CREATE TABLE "listing_photo" (
  "id" uuid PRIMARY KEY,
  "listing_id" uuid,
  "room_type_id" uuid,
  "trip_id" uuid,
  "media_id" uuid NOT NULL,
  "sort_order" int NOT NULL,
  "caption" varchar(160),
  "is_cover" boolean NOT NULL DEFAULT false
);

CREATE TABLE "featured_placement" (
  "id" uuid PRIMARY KEY,
  "listing_id" uuid,
  "trip_id" uuid,
  "placement" varchar(24) NOT NULL,
  "position" smallint NOT NULL DEFAULT 0,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz,
  "created_by_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "listing_day" (
  "listing_id" uuid,
  "day" date,
  "is_blocked" boolean NOT NULL DEFAULT false,
  "price_override_minor" bigint,
  "note" varchar(120),
  PRIMARY KEY ("listing_id", "day")
);

CREATE TABLE "room_type_night" (
  "room_type_id" uuid,
  "night" date,
  "total" smallint NOT NULL,
  "held" smallint NOT NULL DEFAULT 0,
  "booked" smallint NOT NULL DEFAULT 0,
  "price_override_minor" bigint,
  PRIMARY KEY ("room_type_id", "night")
);

CREATE TABLE "experience_slot" (
  "id" uuid PRIMARY KEY,
  "listing_id" uuid NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "seats_total" smallint NOT NULL,
  "seats_held" smallint NOT NULL DEFAULT 0,
  "seats_booked" smallint NOT NULL DEFAULT 0,
  "price_override_minor" bigint,
  "is_cancelled" boolean NOT NULL DEFAULT false
);

CREATE TABLE "trip" (
  "id" uuid PRIMARY KEY,
  "reference" varchar(16) UNIQUE NOT NULL,
  "slug" varchar(160) UNIQUE NOT NULL,
  "host_account_id" uuid NOT NULL,
  "status" listing_status NOT NULL DEFAULT 'draft',
  "status_before_delete" listing_status,
  "trip_type" trip_type NOT NULL,
  "title" varchar(140) NOT NULL,
  "description" text NOT NULL,
  "source_language" varchar(2) NOT NULL,
  "duration_days" smallint NOT NULL,
  "group_min" smallint NOT NULL DEFAULT 1,
  "group_max" smallint NOT NULL,
  "currency" char(3) NOT NULL DEFAULT 'DZD',
  "price_per_person_minor" bigint NOT NULL,
  "inclusions" jsonb NOT NULL,
  "exclusions" jsonb NOT NULL,
  "start_commune_id" int NOT NULL,
  "meeting_point" "geography(Point,4326)",
  "meeting_point_text" varchar(255),
  "cancellation_policy_id" uuid NOT NULL,
  "approval_mode" approval_mode,
  "rating_avg" numeric(3,2),
  "review_count" int NOT NULL DEFAULT 0,
  "submitted_at" timestamptz,
  "published_at" timestamptz,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz
);

CREATE TABLE "trip_itinerary_day" (
  "id" uuid PRIMARY KEY,
  "trip_id" uuid NOT NULL,
  "day_number" smallint NOT NULL,
  "title" varchar(120) NOT NULL,
  "description" text,
  "overnight_commune_id" int
);

CREATE TABLE "trip_departure" (
  "id" uuid PRIMARY KEY,
  "trip_id" uuid NOT NULL,
  "starts_on" date NOT NULL,
  "ends_on" date NOT NULL,
  "seats_total" smallint NOT NULL,
  "seats_held" smallint NOT NULL DEFAULT 0,
  "seats_booked" smallint NOT NULL DEFAULT 0,
  "price_per_person_minor" bigint,
  "status" departure_status NOT NULL DEFAULT 'scheduled',
  "guide_membership_id" uuid,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "quote" (
  "id" uuid PRIMARY KEY,
  "guest_id" uuid,
  "listing_id" uuid,
  "room_type_id" uuid,
  "experience_slot_id" uuid,
  "trip_departure_id" uuid,
  "stay" daterange,
  "guests" smallint NOT NULL,
  "units" smallint NOT NULL DEFAULT 1,
  "currency" char(3) NOT NULL,
  "lines" jsonb NOT NULL,
  "subtotal_minor" bigint NOT NULL,
  "discount_minor" bigint NOT NULL DEFAULT 0,
  "cleaning_fee_minor" bigint NOT NULL DEFAULT 0,
  "taxes_minor" bigint NOT NULL DEFAULT 0,
  "total_minor" bigint NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "tax_rate" (
  "id" uuid PRIMARY KEY,
  "kind" varchar(16) NOT NULL,
  "star_rating" smallint,
  "rate_bp" int,
  "amount_per_person_night_minor" bigint,
  "valid_from" date NOT NULL,
  "valid_to" date
);

CREATE TABLE "booking" (
  "id" uuid PRIMARY KEY,
  "reference" varchar(20) UNIQUE NOT NULL,
  "guest_id" uuid NOT NULL,
  "host_account_id" uuid NOT NULL,
  "inventory_kind" inventory_kind NOT NULL,
  "listing_id" uuid,
  "room_type_id" uuid,
  "experience_slot_id" uuid,
  "trip_departure_id" uuid,
  "stay" daterange NOT NULL,
  "check_in_at" timestamptz NOT NULL,
  "check_out_at" timestamptz NOT NULL,
  "guests_adults" smallint NOT NULL,
  "guests_children" smallint NOT NULL DEFAULT 0,
  "units" smallint NOT NULL DEFAULT 1,
  "status" booking_status NOT NULL,
  "payment_status" payment_status NOT NULL DEFAULT 'not_collected',
  "approval_mode_applied" approval_mode NOT NULL,
  "request_expires_at" timestamptz,
  "confirmed_at" timestamptz,
  "completed_at" timestamptz,
  "cancelled_at" timestamptz,
  "cancelled_by_role" actor_role,
  "cancelled_by_id" uuid,
  "cancel_reason_id" uuid,
  "decline_reason_id" uuid,
  "currency" char(3) NOT NULL,
  "subtotal_minor" bigint NOT NULL,
  "discount_minor" bigint NOT NULL DEFAULT 0,
  "cleaning_fee_minor" bigint NOT NULL DEFAULT 0,
  "taxes_minor" bigint NOT NULL DEFAULT 0,
  "total_minor" bigint NOT NULL,
  "commission_base_minor" bigint NOT NULL,
  "commission_rate_bp" int NOT NULL,
  "commission_minor" bigint NOT NULL,
  "refund_due_minor" bigint NOT NULL DEFAULT 0,
  "check_in_code" char(6),
  "stay_confirmed_at" timestamptz,
  "stay_confirmed_via" stay_confirmed_via,
  "price_lines" jsonb NOT NULL,
  "cancellation_windows" jsonb NOT NULL,
  "listing_snapshot" jsonb NOT NULL,
  "quote_id" uuid,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);

CREATE TABLE "booking_event" (
  "id" uuid PRIMARY KEY,
  "booking_id" uuid NOT NULL,
  "from_status" booking_status,
  "to_status" booking_status NOT NULL,
  "actor_role" actor_role NOT NULL,
  "actor_id" uuid,
  "reason_id" uuid,
  "note" text,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "refund" (
  "id" uuid PRIMARY KEY,
  "booking_id" uuid NOT NULL,
  "amount_minor" bigint NOT NULL,
  "kind" varchar(20) NOT NULL,
  "settlement" varchar(20) NOT NULL DEFAULT 'owed_by_host',
  "reason" text,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "refund_obligation" (
  "id" uuid PRIMARY KEY,
  "refund_id" uuid UNIQUE NOT NULL,
  "booking_id" uuid NOT NULL,
  "host_account_id" uuid NOT NULL,
  "guest_id" uuid NOT NULL,
  "amount_minor" bigint NOT NULL,
  "currency" char(3) NOT NULL,
  "status" refund_obligation_status NOT NULL DEFAULT 'open',
  "due_at" timestamptz NOT NULL,
  "declared_at" timestamptz,
  "declared_reference" varchar(120),
  "declared_by_id" uuid,
  "settled_at" timestamptz,
  "settled_via" varchar(12),
  "settled_by_id" uuid,
  "settlement_proof_id" uuid,
  "dispute_note" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);

CREATE TABLE "dispute" (
  "id" uuid PRIMARY KEY,
  "booking_id" uuid UNIQUE NOT NULL,
  "opened_by_id" uuid NOT NULL,
  "opened_by_role" actor_role NOT NULL,
  "reason_id" uuid,
  "guest_statement" text,
  "host_statement" text,
  "outcome" varchar(16),
  "refund_minor" bigint,
  "resolution_note" text,
  "resolved_by_id" uuid,
  "resolved_at" timestamptz,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "ledger_account" (
  "id" uuid PRIMARY KEY,
  "code" varchar(80) UNIQUE NOT NULL,
  "kind" ledger_account_kind NOT NULL,
  "host_account_id" uuid,
  "currency" char(3) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "ledger_transaction" (
  "id" uuid PRIMARY KEY,
  "kind" ledger_tx_kind NOT NULL,
  "booking_id" uuid,
  "topup_id" uuid,
  "reverses_id" uuid,
  "description" varchar(255) NOT NULL,
  "created_by_id" uuid,
  "occurred_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "ledger_entry" (
  "id" uuid PRIMARY KEY,
  "transaction_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "amount_minor" bigint NOT NULL,
  "currency" char(3) NOT NULL
);

CREATE TABLE "account_balance" (
  "account_id" uuid PRIMARY KEY,
  "balance_minor" bigint NOT NULL,
  "last_entry_id" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL
);

CREATE TABLE "wallet_topup" (
  "id" uuid PRIMARY KEY,
  "host_account_id" uuid NOT NULL,
  "method" topup_method NOT NULL,
  "amount_minor" bigint NOT NULL,
  "receipt_reference" varchar(200) NOT NULL,
  "status" topup_status NOT NULL,
  "requested_by_id" uuid NOT NULL,
  "approved_by_id" uuid,
  "approved_at" timestamptz,
  "rejection_reason" text,
  "gateway_event_id" uuid,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "wallet_adjustment" (
  "id" uuid PRIMARY KEY,
  "host_account_id" uuid NOT NULL,
  "amount_minor" bigint NOT NULL,
  "currency" char(3) NOT NULL,
  "reason" text NOT NULL,
  "status" adjustment_status NOT NULL DEFAULT 'pending_approval',
  "requested_by_id" uuid NOT NULL,
  "approved_by_id" uuid,
  "approved_at" timestamptz,
  "rejection_reason" text,
  "ledger_transaction_id" uuid,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "gateway_event" (
  "id" uuid PRIMARY KEY,
  "provider" varchar(20) NOT NULL,
  "event_id" varchar(100) NOT NULL,
  "signature_valid" boolean NOT NULL,
  "payload" jsonb NOT NULL,
  "received_at" timestamptz NOT NULL,
  "processed_at" timestamptz,
  "error" text
);

CREATE TABLE "payment" (
  "id" uuid PRIMARY KEY,
  "booking_id" uuid,
  "provider" varchar(20) NOT NULL,
  "provider_checkout_id" varchar(100) NOT NULL,
  "amount_minor" bigint NOT NULL,
  "currency" char(3) NOT NULL,
  "status" varchar(16) NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "payout" (
  "id" uuid PRIMARY KEY,
  "host_account_id" uuid NOT NULL,
  "payout_account_id" uuid NOT NULL,
  "amount_minor" bigint NOT NULL,
  "status" varchar(16) NOT NULL,
  "approved_by_id" uuid,
  "ledger_transaction_id" uuid,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "invoice" (
  "id" uuid PRIMARY KEY,
  "host_account_id" uuid NOT NULL,
  "year" smallint NOT NULL,
  "number" int NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "amount_ht_minor" bigint NOT NULL,
  "vat_minor" bigint NOT NULL,
  "amount_ttc_minor" bigint NOT NULL,
  "status" varchar(12) NOT NULL,
  "pdf_media_id" uuid,
  "credit_note_of_id" uuid,
  "issued_at" timestamptz NOT NULL
);

CREATE TABLE "review" (
  "id" uuid PRIMARY KEY,
  "booking_id" uuid NOT NULL,
  "author_id" uuid NOT NULL,
  "author_role" actor_role NOT NULL,
  "listing_id" uuid,
  "trip_id" uuid,
  "host_account_id" uuid NOT NULL,
  "rating_overall" smallint NOT NULL,
  "rating_cleanliness" smallint,
  "rating_accuracy" smallint,
  "rating_communication" smallint,
  "rating_location" smallint,
  "rating_value" smallint,
  "comment" text NOT NULL,
  "language" varchar(2) NOT NULL,
  "status" review_status NOT NULL DEFAULT 'submitted',
  "submitted_at" timestamptz NOT NULL,
  "published_at" timestamptz
);

CREATE TABLE "review_reply" (
  "review_id" uuid PRIMARY KEY,
  "author_id" uuid NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "editable_until" timestamptz NOT NULL
);

CREATE TABLE "review_report" (
  "id" uuid PRIMARY KEY,
  "review_id" uuid NOT NULL,
  "reporter_id" uuid NOT NULL,
  "reason_id" uuid NOT NULL,
  "note" text,
  "status" varchar(12) NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "conversation" (
  "id" uuid PRIMARY KEY,
  "kind" conversation_kind NOT NULL,
  "guest_id" uuid,
  "host_account_id" uuid,
  "listing_id" uuid,
  "trip_id" uuid,
  "booking_id" uuid,
  "last_message_at" timestamptz,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "conversation_participant" (
  "conversation_id" uuid,
  "user_id" uuid,
  "role" varchar(12) NOT NULL,
  "last_read_message_id" uuid,
  "muted" boolean NOT NULL DEFAULT false,
  "joined_at" timestamptz NOT NULL,
  PRIMARY KEY ("conversation_id", "user_id")
);

CREATE TABLE "message" (
  "id" uuid PRIMARY KEY,
  "conversation_id" uuid NOT NULL,
  "sender_id" uuid,
  "kind" varchar(12) NOT NULL,
  "body" text NOT NULL,
  "body_masked" text,
  "contains_contact_info" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL,
  "deleted_at" timestamptz
);

CREATE TABLE "notification" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "kind" varchar(48) NOT NULL,
  "params" jsonb NOT NULL,
  "link" varchar(255),
  "read_at" timestamptz,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "notification_preference" (
  "user_id" uuid,
  "kind" varchar(48),
  "channel" varchar(8),
  "enabled" boolean NOT NULL,
  PRIMARY KEY ("user_id", "kind", "channel")
);

CREATE TABLE "outbox_message" (
  "id" uuid PRIMARY KEY,
  "topic" varchar(64) NOT NULL,
  "aggregate_type" varchar(32) NOT NULL,
  "aggregate_id" uuid NOT NULL,
  "payload" jsonb NOT NULL,
  "status" outbox_status NOT NULL DEFAULT 'pending',
  "attempts" smallint NOT NULL DEFAULT 0,
  "next_attempt_at" timestamptz NOT NULL,
  "last_error" text,
  "created_at" timestamptz NOT NULL,
  "sent_at" timestamptz
);

CREATE TABLE "delivery_log" (
  "id" uuid PRIMARY KEY,
  "outbox_message_id" uuid,
  "channel" varchar(8) NOT NULL,
  "provider" varchar(20) NOT NULL,
  "recipient_hash" char(64) NOT NULL,
  "status" varchar(12) NOT NULL,
  "provider_message_id" varchar(100),
  "cost_minor" bigint,
  "error" text,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "media_asset" (
  "id" uuid PRIMARY KEY,
  "owner_user_id" uuid,
  "host_account_id" uuid,
  "purpose" varchar(20) NOT NULL,
  "bucket" media_bucket NOT NULL,
  "storage_key" varchar(255) UNIQUE NOT NULL,
  "mime_type" varchar(64) NOT NULL,
  "size_bytes" bigint NOT NULL,
  "width" int,
  "height" int,
  "sha256" char(64) NOT NULL,
  "phash" bigint,
  "status" media_status NOT NULL DEFAULT 'quarantined',
  "scan_result" varchar(32),
  "created_at" timestamptz NOT NULL,
  "deleted_at" timestamptz
);

CREATE TABLE "reason_code" (
  "id" uuid PRIMARY KEY,
  "action" varchar(32) NOT NULL,
  "code" varchar(48) NOT NULL,
  "label_en" varchar(120) NOT NULL,
  "label_fr" varchar(120) NOT NULL,
  "label_ar" varchar(120) NOT NULL,
  "host_text_en" text,
  "host_text_fr" text,
  "host_text_ar" text,
  "is_active" boolean NOT NULL DEFAULT true
);

CREATE TABLE "moderation_case" (
  "id" uuid PRIMARY KEY,
  "kind" case_kind NOT NULL,
  "subject_type" varchar(24) NOT NULL,
  "subject_id" uuid NOT NULL,
  "status" case_status NOT NULL DEFAULT 'open',
  "priority" case_priority NOT NULL DEFAULT 'normal',
  "submitted_at" timestamptz NOT NULL,
  "assigned_to_id" uuid,
  "resolved_by_id" uuid,
  "resolved_at" timestamptz,
  "outcome" varchar(24),
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "moderation_decision" (
  "id" uuid PRIMARY KEY,
  "case_id" uuid NOT NULL,
  "decision" varchar(24) NOT NULL,
  "reason_id" uuid,
  "note" text,
  "actor_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "change_request_item" (
  "id" uuid PRIMARY KEY,
  "case_id" uuid NOT NULL,
  "checklist_code" varchar(48) NOT NULL,
  "message" text,
  "resolved_at" timestamptz
);

CREATE TABLE "platform_settings" (
  "id" uuid PRIMARY KEY,
  "version" int UNIQUE NOT NULL,
  "data" jsonb NOT NULL,
  "is_current" boolean NOT NULL,
  "created_by_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "onboarding_flow_version" (
  "id" uuid PRIMARY KEY,
  "host_type" varchar(12) NOT NULL,
  "version" int NOT NULL,
  "status" flow_status NOT NULL,
  "schema" jsonb NOT NULL,
  "published_by_id" uuid,
  "published_at" timestamptz,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "onboarding_draft" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "host_type" varchar(12) NOT NULL,
  "flow_version_id" uuid NOT NULL,
  "current_step" varchar(48) NOT NULL,
  "answers" jsonb NOT NULL,
  "status" varchar(12) NOT NULL,
  "host_account_id" uuid,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);

CREATE TABLE "coupon" (
  "id" uuid PRIMARY KEY,
  "code" varchar(32) NOT NULL,
  "discount_type" varchar(12) NOT NULL,
  "discount_value" bigint NOT NULL,
  "min_spend_minor" bigint NOT NULL DEFAULT 0,
  "funded_by" varchar(8) NOT NULL,
  "host_account_id" uuid,
  "scope_verticals" vertical[],
  "usage_limit" int,
  "per_user_limit" int NOT NULL DEFAULT 1,
  "valid_from" timestamptz NOT NULL,
  "valid_to" timestamptz,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "coupon_redemption" (
  "id" uuid PRIMARY KEY,
  "coupon_id" uuid NOT NULL,
  "booking_id" uuid UNIQUE NOT NULL,
  "user_id" uuid NOT NULL,
  "amount_minor" bigint NOT NULL,
  "released_at" timestamptz,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "audit_event" (
  "id" uuid PRIMARY KEY,
  "occurred_at" timestamptz NOT NULL,
  "actor_id" uuid,
  "actor_kind" varchar(8) NOT NULL,
  "actor_role" varchar(16),
  "action" varchar(48) NOT NULL,
  "object_type" varchar(24) NOT NULL,
  "object_id" varchar(64) NOT NULL,
  "host_account_id" uuid,
  "before" jsonb,
  "after" jsonb,
  "ip" inet,
  "user_agent" varchar(255),
  "request_id" varchar(36),
  "prev_hash" char(64) NOT NULL,
  "hash" char(64) NOT NULL
);

CREATE TABLE "export_job" (
  "id" uuid PRIMARY KEY,
  "requested_by_id" uuid NOT NULL,
  "dataset" varchar(32) NOT NULL,
  "filters" jsonb NOT NULL,
  "row_count" int,
  "status" varchar(12) NOT NULL,
  "media_id" uuid,
  "created_at" timestamptz NOT NULL,
  "completed_at" timestamptz
);

CREATE TABLE "data_subject_request" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "kind" dsr_kind NOT NULL,
  "status" varchar(12) NOT NULL,
  "due_at" timestamptz NOT NULL,
  "handled_by_id" uuid,
  "completed_at" timestamptz,
  "notes" text,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "idempotency_record" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "endpoint" varchar(80) NOT NULL,
  "key" varchar(80) NOT NULL,
  "request_hash" char(64) NOT NULL,
  "status" varchar(12) NOT NULL,
  "response_code" smallint,
  "response_body" jsonb,
  "locked_until" timestamptz,
  "created_at" timestamptz NOT NULL,
  "expires_at" timestamptz NOT NULL
);

CREATE TABLE "incident_record" (
  "id" uuid PRIMARY KEY,
  "kind" varchar(24) NOT NULL,
  "severity" varchar(8) NOT NULL,
  "detected_at" timestamptz NOT NULL,
  "personal_data_involved" boolean NOT NULL,
  "anpdp_deadline_at" timestamptz,
  "anpdp_notified_at" timestamptz,
  "users_notified_at" timestamptz,
  "summary" text NOT NULL,
  "actions_taken" text,
  "owner_id" uuid NOT NULL,
  "closed_at" timestamptz,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "calendar_feed" (
  "id" uuid PRIMARY KEY,
  "listing_id" uuid NOT NULL,
  "room_type_id" uuid,
  "direction" varchar(8) NOT NULL,
  "url_encrypted" bytea,
  "export_token_hash" char(64),
  "last_synced_at" timestamptz,
  "last_error" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "otp_send_log" (
  "id" uuid PRIMARY KEY,
  "phone_hash" char(64) NOT NULL,
  "ip" inet,
  "purpose" varchar(16) NOT NULL,
  "provider" varchar(20) NOT NULL,
  "status" varchar(12) NOT NULL,
  "cost_minor" bigint,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "property_integration" (
  "id" uuid PRIMARY KEY,
  "organization_id" uuid NOT NULL,
  "listing_id" uuid,
  "kind" varchar(20) NOT NULL,
  "system_name" varchar(60) NOT NULL,
  "base_url" varchar(255),
  "credentials_encrypted" bytea,
  "credentials_key_id" varchar(16),
  "status" varchar(12) NOT NULL DEFAULT 'pending',
  "sync_rooms" boolean NOT NULL DEFAULT true,
  "sync_availability" boolean NOT NULL DEFAULT true,
  "sync_services" boolean NOT NULL DEFAULT true,
  "last_synced_at" timestamptz,
  "last_error" text,
  "created_by_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "integration_sync_log" (
  "id" uuid PRIMARY KEY,
  "integration_id" uuid NOT NULL,
  "started_at" timestamptz NOT NULL,
  "finished_at" timestamptz,
  "status" varchar(12) NOT NULL,
  "rooms_changed" int NOT NULL DEFAULT 0,
  "nights_changed" int NOT NULL DEFAULT 0,
  "services_changed" int NOT NULL DEFAULT 0,
  "error" text
);

CREATE TABLE "inventory_conflict" (
  "id" uuid PRIMARY KEY,
  "integration_id" uuid NOT NULL,
  "room_type_id" uuid NOT NULL,
  "night" date NOT NULL,
  "requested_total" smallint NOT NULL,
  "applied_total" smallint NOT NULL,
  "held" smallint NOT NULL,
  "booked" smallint NOT NULL,
  "status" inventory_conflict_status NOT NULL DEFAULT 'open',
  "resolution" varchar(24),
  "resolution_note" text,
  "resolved_by_id" uuid,
  "resolved_at" timestamptz,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "property_service" (
  "id" uuid PRIMARY KEY,
  "listing_id" uuid NOT NULL,
  "kind" varchar(24) NOT NULL,
  "name" varchar(120) NOT NULL,
  "description" text,
  "opening_hours" jsonb,
  "price_minor" bigint,
  "external_id" varchar(80),
  "source" varchar(12) NOT NULL DEFAULT 'manual',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "listing_search_doc" (
  "listing_id" uuid PRIMARY KEY,
  "vertical" vertical NOT NULL,
  "wilaya_code" smallint NOT NULL,
  "commune_id" int NOT NULL,
  "location_public" "geography(Point,4326)" NOT NULL,
  "price_from_minor" bigint NOT NULL,
  "capacity_guests" smallint NOT NULL,
  "rating_avg" numeric(3,2),
  "review_count" int NOT NULL,
  "instant_bookable" boolean NOT NULL,
  "host_type" varchar(12) NOT NULL,
  "experience_type" experience_type,
  "property_type_id" uuid,
  "amenity_ids" uuid[] NOT NULL,
  "search_text" text NOT NULL,
  "published_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);

CREATE UNIQUE INDEX ON "category" ("vertical", "slug");

CREATE UNIQUE INDEX ON "property_type" ("vertical", "slug");

CREATE UNIQUE INDEX ON "cancellation_policy" ("code", "version");

CREATE UNIQUE INDEX ON "experience_slot" ("listing_id", "starts_at");

CREATE UNIQUE INDEX ON "trip_itinerary_day" ("trip_id", "day_number");

CREATE UNIQUE INDEX ON "trip_departure" ("trip_id", "starts_on");

CREATE INDEX ON "booking" ("host_account_id", "status", "check_in_at");

CREATE INDEX ON "booking" ("guest_id", "created_at");

CREATE INDEX ON "booking" ("request_expires_at");

CREATE INDEX ON "booking" ("check_out_at");

CREATE INDEX ON "refund_obligation" ("host_account_id", "status", "due_at");

CREATE INDEX ON "refund_obligation" ("guest_id", "status");

CREATE INDEX ON "refund_obligation" ("due_at");

CREATE UNIQUE INDEX ON "wallet_topup" ("method", "receipt_reference");

CREATE INDEX ON "wallet_adjustment" ("status", "created_at");

CREATE UNIQUE INDEX ON "gateway_event" ("provider", "event_id");

CREATE UNIQUE INDEX ON "invoice" ("year", "number");

CREATE UNIQUE INDEX ON "review" ("booking_id", "author_role");

CREATE UNIQUE INDEX ON "review_report" ("review_id", "reporter_id");

CREATE INDEX ON "message" ("conversation_id", "id");

CREATE INDEX ON "notification" ("user_id", "read_at", "id");

CREATE INDEX ON "outbox_message" ("status", "next_attempt_at");

CREATE INDEX ON "media_asset" ("phash");

CREATE UNIQUE INDEX ON "reason_code" ("action", "code");

CREATE INDEX ON "moderation_case" ("status", "kind", "submitted_at");

CREATE UNIQUE INDEX ON "onboarding_flow_version" ("host_type", "version");

CREATE INDEX ON "audit_event" ("object_type", "object_id", "occurred_at");

CREATE INDEX ON "audit_event" ("actor_id", "occurred_at");

CREATE UNIQUE INDEX ON "idempotency_record" ("user_id", "endpoint", "key");

CREATE INDEX ON "otp_send_log" ("phone_hash", "created_at");

CREATE INDEX ON "otp_send_log" ("ip", "created_at");

CREATE INDEX ON "inventory_conflict" ("status", "created_at");

CREATE INDEX ON "inventory_conflict" ("room_type_id", "night");

COMMENT ON TABLE "user" IS 'Every person: guest, host, organisation member, staff. Constraints: unique lower(email), unique phone_e164, check (email is not null or phone_e164 is not null). Auth tables (emails, MFA authenticators, sessions) come from django-allauth and are not repeated here.';

COMMENT ON COLUMN "user"."email" IS 'Login email. Unique on lower(email) when not null.';

COMMENT ON COLUMN "user"."phone_e164" IS 'E.164 phone, Algerian mobiles match ^\+213[5-7][0-9]{8}$. Unique when not null.';

COMMENT ON COLUMN "user"."phone_verified_at" IS 'Required before the first booking (DEC-012).';

COMMENT ON COLUMN "user"."password" IS 'Django password hash (argon2). Empty for phone-only accounts.';

COMMENT ON COLUMN "user"."full_name_ar" IS 'Name in Arabic script, stored separately from the Latin form.';

COMMENT ON COLUMN "user"."bio" IS 'Short public introduction (max 500 characters).';

COMMENT ON COLUMN "user"."spoken_languages" IS 'Languages the person speaks, ISO 639-1 codes, shown on host profiles.';

COMMENT ON COLUMN "user"."home_commune_id" IS 'Where the person lives (optional, private).';

COMMENT ON COLUMN "user"."address_line" IS 'Private postal address (optional); never shown publicly.';

COMMENT ON COLUMN "user"."preferred_locale" IS 'en, fr or ar.';

COMMENT ON COLUMN "user"."nationality_iso2" IS 'Only when legally needed (foreign guest declaration, VERIFY).';

COMMENT ON COLUMN "user"."deleted_at" IS 'Soft delete.';

COMMENT ON COLUMN "user"."anonymised_at" IS 'Set when personal data was erased after a deletion request (BR-PRV-02).';

COMMENT ON TABLE "staff_profile" IS 'Staff-only data. Permission checks read staff_role_permission for role. MFA must be enrolled before status can be active (BR-ACC-04).';

COMMENT ON COLUMN "staff_permission"."code" IS 'e.g. hosts.approve, bookings.refund (34 codes today).';

COMMENT ON TABLE "staff_role_permission" IS 'One staff role today: admin, with every permission (DEC-016). The table stays so more roles can be added later without a redesign.';

COMMENT ON TABLE "consent_record" IS 'Append-only history of consents (BR-PRV-01). Latest row per (user, document) is current.';

COMMENT ON COLUMN "consent_record"."document" IS 'terms, privacy, marketing.';

COMMENT ON TABLE "favorite" IS 'Check exactly one of listing_id, trip_id. Unique (user_id, listing_id) and (user_id, trip_id).';

COMMENT ON COLUMN "wilaya"."code" IS 'Official code 1 to 69 (codes 59 to 69 to confirm with the JO and ONS).';

COMMENT ON COLUMN "wilaya"."legacy_code_58" IS 'Code of the parent wilaya in the 58-wilaya system, for old data.';

COMMENT ON COLUMN "wilaya"."region" IS 'north, high_plateaus, south.';

COMMENT ON COLUMN "wilaya"."source" IS 'Dataset name and commit, e.g. el-amin-dev@sha.';

COMMENT ON COLUMN "wilaya"."valid_from" IS '2026-04-05 for Loi 26-06 wilayas.';

COMMENT ON COLUMN "daira"."id" IS 'Official daira code from the state list (reference data, not an app id).';

COMMENT ON TABLE "commune" IS '1,541 rows. GIN trigram indexes (pg_trgm, gin_trgm_ops) on unaccent(name_fr), name_en and the normalised name_ar for search and autocomplete (BR-SRC-05).';

COMMENT ON COLUMN "commune"."id" IS 'Official commune code.';

COMMENT ON TABLE "host_account" IS 'The single thing that hosts: either one user (individual) or one organisation. Owns listings, trips, wallet and commission (resolves disagreement D-1). The active host account of a request comes from the session and is re-checked against membership on every call (workspace switcher, ORG-02). Check: (kind = individual and user_id not null and organization_id is null) or (kind = organization and organization_id not null and user_id is null).';

COMMENT ON COLUMN "host_account"."user_id" IS 'Set when kind = individual.';

COMMENT ON COLUMN "host_account"."organization_id" IS 'Set when kind = organization.';

COMMENT ON COLUMN "host_account"."default_approval_mode" IS 'Default for new listings (BR-BKG-02).';

COMMENT ON COLUMN "host_account"."commission_rate_override_bp" IS 'Null = use host-type default from settings. 0 to 10000.';

COMMENT ON COLUMN "host_account"."credit_limit_override_minor" IS 'Null = settings default for the host type (BR-PAY-10).';

COMMENT ON COLUMN "host_account"."host_cancellations_12m" IS 'Cache recomputed by job.';

COMMENT ON COLUMN "host_account"."rating_avg" IS 'Cache from published reviews (BR-REV-04).';

COMMENT ON COLUMN "host_account"."submitted_at" IS 'Last submission for review; drives queue waiting time.';

COMMENT ON COLUMN "organization"."business_category" IS 'Never changes after creation (BR-ORG-02).';

COMMENT ON COLUMN "organization"."rc_number" IS 'Registre du commerce. Legal field (BR-ORG-06).';

COMMENT ON COLUMN "organization"."nif" IS 'Tax id. Legal field.';

COMMENT ON COLUMN "organization"."nis" IS 'Statistical id. Legal field.';

COMMENT ON COLUMN "organization"."tourism_licence_number" IS 'Agencies. Legal field.';

COMMENT ON COLUMN "organization"."star_rating" IS 'Hotels 1 to 5; drives tourist tax.';

COMMENT ON COLUMN "organization"."policies" IS 'Hostel age limits, curfew, other house policies.';

COMMENT ON TABLE "membership" IS 'Unique (organization_id, user_id) where is_active. Partial unique (organization_id) where role = owner and is_active: exactly one owner (BR-ORG-04).';

COMMENT ON TABLE "invitation" IS 'Check email or phone present. Partial unique (organization_id, lower(email)) where status = pending.';

COMMENT ON COLUMN "invitation"."role" IS 'Cannot be owner.';

COMMENT ON COLUMN "invitation"."token_hash" IS 'SHA-256 of the one-time token; the token itself is only sent.';

COMMENT ON COLUMN "invitation"."expires_at" IS 'Created + 7 days.';

COMMENT ON COLUMN "host_document"."listing_id" IS 'For per-vehicle or per-property documents.';

COMMENT ON COLUMN "host_document"."media_id" IS 'Private bucket only.';

COMMENT ON COLUMN "host_document"."number_hash" IS 'HMAC of the document number, kept after the image is deleted (BR-PRV-05).';

COMMENT ON TABLE "payout_account" IS 'Used for refunds of deposit and, later, payouts (M4).';

COMMENT ON COLUMN "payout_account"."kind" IS 'ccp_rip, bank_rib, baridimob.';

COMMENT ON COLUMN "payout_account"."number_encrypted" IS 'Encrypted with a key outside the database.';

COMMENT ON COLUMN "payout_account"."hold_until" IS 'Changes block payouts for 72 h (BR-PAY-09).';

COMMENT ON TABLE "amenity" IS 'One vocabulary replacing the three in the apps today.';

COMMENT ON COLUMN "amenity"."group_code" IS 'essentials, features, location, safety.';

COMMENT ON COLUMN "amenity"."applies_to" IS 'Which verticals may use it.';

COMMENT ON TABLE "cancellation_policy" IS 'Partial unique (code) where is_current. Bookings copy the windows (snapshot).';

COMMENT ON COLUMN "cancellation_policy"."code" IS 'flexible, moderate, strict (DEC-011).';

COMMENT ON COLUMN "cancellation_policy"."windows" IS 'Ordered [{min_days_before, refund_bp}], see BR-CAN-01.';

COMMENT ON TABLE "listing" IS 'Checks: capacity_guests > 0; base_price_minor > 0; min_nights <= max_nights; discount bp between 0 and 9000; inventory_kind matches vertical (home/vehicle single, hotel/hostel room_pool, experience slot); (vertical = experience) = (experience_type is not null). Host offer rule (DEC-014, BR-HST-05): individual host accounts publish home and vehicle, agencies experience, hotels and hostels hotel/hostel; enforced by service and a trigger that reads host_account.kind and organization.business_category.';

COMMENT ON COLUMN "listing"."reference" IS 'Human id, e.g. LST-7K2M9Q.';

COMMENT ON COLUMN "listing"."inventory_kind" IS 'single (home, vehicle), room_pool (hotel, hostel), slot (experience).';

COMMENT ON COLUMN "listing"."experience_type" IS 'Required when vertical = experience, null otherwise (DEC-015, BR-LST-05).';

COMMENT ON COLUMN "listing"."title" IS 'GIN trigram index (gin_trgm_ops) on the normalised title (BR-SRC-05).';

COMMENT ON COLUMN "listing"."address_line" IS 'Private until a booking is confirmed (BR-SRC-03).';

COMMENT ON COLUMN "listing"."location_public" IS 'Offset up to 500 m, fixed.';

COMMENT ON COLUMN "listing"."base_price_minor" IS 'Per night (stays), per day (vehicles), per person (experiences).';

COMMENT ON COLUMN "listing"."approval_mode" IS 'Null = inherit from host account (BR-BKG-02).';

COMMENT ON COLUMN "listing"."house_rules" IS 'List of rule codes plus free text.';

COMMENT ON TABLE "listing_revision" IS 'Partial unique (listing_id) where status = pending_review.';

COMMENT ON COLUMN "listing_revision"."payload" IS 'Proposed values of reviewed fields (BR-LST-02).';

COMMENT ON COLUMN "listing_revision"."status" IS 'pending_review, approved, rejected, superseded.';

COMMENT ON COLUMN "vehicle_detail"."transmission" IS 'manual, automatic.';

COMMENT ON TABLE "room_type" IS 'Checks: unit_count > 0, capacity_per_unit > 0, base_price_minor > 0.';

COMMENT ON COLUMN "room_type"."booking_unit" IS 'room or bed (hostel dorms).';

COMMENT ON COLUMN "room_type"."unit_count" IS 'Physical rooms or beds of this type (inventory total).';

COMMENT ON COLUMN "room_type"."external_id" IS 'Id of this room type in the hotel system (DEC-017).';

COMMENT ON COLUMN "room_type"."integration_id" IS 'Set when the room type is managed by a hotel system connection.';

COMMENT ON TABLE "listing_photo" IS 'Check exactly one of listing_id, trip_id (room photos also carry listing_id). Partial unique cover per listing and per trip.';

COMMENT ON COLUMN "featured_placement"."placement" IS 'home_weekend, home_hero, search_top.';

COMMENT ON TABLE "listing_day" IS 'Host calendar for single-unit listings (homes, vehicles). Only rows that differ from defaults are stored.
Trigger listing_day_block_guard (BR-AVL-07 a): refuses is_blocked = true on a day covered by a single-unit booking in a blocking status.';

COMMENT ON TABLE "room_type_night" IS 'Pooled inventory (BR-AVL-02). Check: held >= 0 and booked >= 0 and held + booked <= total (no exclusion constraint on pools). A hotel sync never sets total below held + booked (BR-HST-07). Rows created 18 months ahead by job.';

COMMENT ON COLUMN "room_type_night"."total" IS 'Units sellable that night (unit_count minus host blocks).';

COMMENT ON TABLE "experience_slot" IS 'Check: seats_held + seats_booked <= seats_total, all >= 0.';

COMMENT ON COLUMN "trip"."slug" IS 'Public URL name, e.g. 5-day-grand-tassili (the website links trips by slug).';

COMMENT ON COLUMN "trip"."host_account_id" IS 'Must be an approved agency (BR-TRP-01).';

COMMENT ON COLUMN "trip"."trip_type" IS 'DEC-015.';

COMMENT ON TABLE "trip_departure" IS 'Check: ends_on >= starts_on; seats_held + seats_booked <= seats_total (BR-TRP-02).';

COMMENT ON COLUMN "trip_departure"."price_per_person_minor" IS 'Null = trip price.';

COMMENT ON TABLE "quote" IS 'Short-lived; purged after 7 days by job.';

COMMENT ON COLUMN "quote"."stay" IS '[check-in, check-out).';

COMMENT ON COLUMN "quote"."lines" IS 'Per-night prices, discount, cleaning, taxes.';

COMMENT ON COLUMN "quote"."expires_at" IS 'Created + 30 min (BR-PRC-01).';

COMMENT ON TABLE "tax_rate" IS 'R2. Values VERIFY WITH A PROFESSIONAL.';

COMMENT ON COLUMN "tax_rate"."kind" IS 'taxe_sejour, vat.';

COMMENT ON COLUMN "tax_rate"."star_rating" IS 'Taxe de sejour by hotel stars; null = unclassified.';

COMMENT ON COLUMN "tax_rate"."rate_bp" IS 'VAT.';

COMMENT ON COLUMN "tax_rate"."amount_per_person_night_minor" IS 'Taxe de sejour.';

COMMENT ON TABLE "booking" IS 'Checks: exactly the target columns matching inventory_kind are set; total_minor = subtotal - discount + cleaning + taxes; 0 <= refund_due_minor <= total_minor; guests_adults >= 1.
Exclusion (BR-AVL-01): EXCLUDE USING gist (listing_id WITH =, stay WITH &&) WHERE (inventory_kind = ''single'' AND status IN (''awaiting_payment'',''pending'',''confirmed'',''completed'',''disputed'')).
Trigger booking_blocked_day_guard (BR-AVL-07 b): refuses a single-unit booking in a blocking status whose range contains a blocked listing_day.
Check: stay_confirmed_at is null or status in (confirmed, completed, disputed).';

COMMENT ON COLUMN "booking"."reference" IS 'BLD-YYYY-XXXXXX.';

COMMENT ON COLUMN "booking"."stay" IS 'Half-open [check-in, check-out). For slots and departures: their dates.';

COMMENT ON COLUMN "booking"."units" IS 'Rooms, beds or seats.';

COMMENT ON COLUMN "booking"."request_expires_at" IS 'Set for pending (BR-BKG-04).';

COMMENT ON COLUMN "booking"."commission_base_minor" IS 'DEC-002.';

COMMENT ON COLUMN "booking"."commission_rate_bp" IS 'Snapshot at creation.';

COMMENT ON COLUMN "booking"."refund_due_minor" IS 'Cumulative amount owed back to the guest.';

COMMENT ON COLUMN "booking"."check_in_code" IS '6 digits shown only to the guest once confirmed; the host enters it on arrival (BR-BKG-09). Stored as given, compared in constant time.';

COMMENT ON COLUMN "booking"."stay_confirmed_at" IS 'Set by host code entry or guest confirmation; needed for a review (BR-REV-01).';

COMMENT ON COLUMN "booking"."cancellation_windows" IS 'Snapshot of policy windows.';

COMMENT ON COLUMN "booking"."listing_snapshot" IS 'Title, photo, address at booking time.';

COMMENT ON TABLE "booking_event" IS 'Append-only history of every status change.';

COMMENT ON TABLE "refund" IS 'Check amount_minor > 0. Sum per booking equals booking.refund_due_minor. In M1 each row opens one refund_obligation (BR-CAN-06).';

COMMENT ON COLUMN "refund"."kind" IS 'policy, host_cancel, staff, dispute.';

COMMENT ON COLUMN "refund"."settlement" IS 'M1: owed_by_host, settled_confirmed. M4: via gateway.';

COMMENT ON TABLE "refund_obligation" IS 'Debt of the host to the guest after a cancellation (DEC-024, BR-CAN-06). Check amount_minor > 0. Ledger memo: refund_due when opened, refund_settled when settled.';

COMMENT ON COLUMN "refund_obligation"."due_at" IS 'cancelled_at + refund_due_days (setting, default 7).';

COMMENT ON COLUMN "refund_obligation"."declared_reference" IS 'Transfer or receipt reference given by the host.';

COMMENT ON COLUMN "refund_obligation"."settled_via" IS 'guest_confirm or admin.';

COMMENT ON COLUMN "refund_obligation"."settlement_proof_id" IS 'Proof uploaded by the admin when settling.';

COMMENT ON TABLE "dispute" IS 'R2.';

COMMENT ON COLUMN "dispute"."outcome" IS 'refund_full, refund_partial, declined.';

COMMENT ON TABLE "ledger_account" IS 'Partial unique (host_account_id, kind) where host_account_id is not null.';

COMMENT ON COLUMN "ledger_account"."code" IS 'e.g. host_wallet:<host_account_id>, platform_cash:ccp_transfer.';

COMMENT ON TABLE "ledger_transaction" IS 'Insert-only: trigger refuses UPDATE and DELETE; app role has SELECT and INSERT only (DEC-026). Partial unique (booking_id) where kind = commission (BR-PAY-04).';

COMMENT ON COLUMN "ledger_transaction"."reverses_id" IS 'For reversals and corrections.';

COMMENT ON COLUMN "ledger_transaction"."created_by_id" IS 'Null = system.';

COMMENT ON TABLE "ledger_entry" IS 'Insert-only: trigger refuses UPDATE and DELETE; app role has SELECT and INSERT only (DEC-026). Deferred constraint trigger: per transaction and currency, sum(amount_minor) = 0 (BR-PAY-02).';

COMMENT ON COLUMN "ledger_entry"."amount_minor" IS 'Positive = debit, negative = credit. Never 0.';

COMMENT ON TABLE "account_balance" IS 'Cache for host wallets, updated in the same transaction as entries. Locked first on the booking path (SELECT ... FOR UPDATE, BR-PAY-14). No platform account row is updated on the booking path: revenue is a SUM over ledger_entry. Nightly reconcile_balances checks it equals the sum (BR-PAY-15).';

COMMENT ON COLUMN "wallet_topup"."amount_minor" IS '1 to 10,000,000 DZD in centimes.';

COMMENT ON COLUMN "wallet_topup"."approved_by_id" IS 'Second admin when the host rolling 24-hour total passes 500,000 DZD; never the requester (BR-PAY-07).';

COMMENT ON TABLE "wallet_adjustment" IS 'Manual correction of a host wallet (DEC-022, BR-PAY-13). Always needs a second admin; audited.';

COMMENT ON COLUMN "wallet_adjustment"."amount_minor" IS 'Signed: positive credits the host wallet, negative debits it. Check amount_minor <> 0 and abs(amount_minor) <= 100,000,000 (1,000,000 DZD).';

COMMENT ON COLUMN "wallet_adjustment"."approved_by_id" IS 'Check approved_by_id <> requested_by_id (four-eyes).';

COMMENT ON COLUMN "wallet_adjustment"."ledger_transaction_id" IS 'Set when posted (kind adjustment).';

COMMENT ON TABLE "gateway_event" IS 'R2. Raw webhooks (BR-SYS-02).';

COMMENT ON COLUMN "gateway_event"."provider" IS 'chargily, slickpay.';

COMMENT ON TABLE "payment" IS 'DORMANT until money model M2 to M4 is approved (BR-PAY-11).';

COMMENT ON TABLE "payout" IS 'DORMANT (M4). Also used for deposit withdrawals in M1 if the product allows them.';

COMMENT ON COLUMN "payout"."status" IS 'requested, approved, sent, confirmed, rejected.';

COMMENT ON TABLE "invoice" IS 'R2. Commission invoices (BR-PAY-12). VERIFY WITH A PROFESSIONAL.';

COMMENT ON COLUMN "invoice"."status" IS 'issued, cancelled.';

COMMENT ON TABLE "review" IS 'Ratings between 1 and 5. Window: 14 days after check-out (BR-REV-01).';

COMMENT ON COLUMN "review"."author_role" IS 'guest or host.';

COMMENT ON COLUMN "review_report"."status" IS 'open, dismissed, actioned.';

COMMENT ON TABLE "conversation" IS 'Partial unique (booking_id) where not null; partial unique (guest_id, listing_id) where kind = inquiry.';

COMMENT ON COLUMN "conversation_participant"."role" IS 'guest, host_member, staff.';

COMMENT ON COLUMN "message"."id" IS 'UUIDv7, ordered by time, used as sync cursor (MSG-02).';

COMMENT ON COLUMN "message"."sender_id" IS 'Null for system messages.';

COMMENT ON COLUMN "message"."kind" IS 'text, system.';

COMMENT ON COLUMN "message"."body_masked" IS 'Shown to the other side before confirmation (BR-MSG-01).';

COMMENT ON COLUMN "notification"."params" IS 'Values for the localized template.';

COMMENT ON COLUMN "notification_preference"."channel" IS 'email, sms, push.';

COMMENT ON TABLE "outbox_message" IS 'Written in the same transaction as the change (BR-SYS-03, DEC-029). Dead messages raise an admin alert and are listed in GET admin/outbox. Handlers are idempotent. Replaces outbox_event (renamed 2026-11-13).';

COMMENT ON COLUMN "outbox_message"."topic" IS 'e.g. notification.send, sms.send, search.refresh, inventory.push.';

COMMENT ON COLUMN "outbox_message"."attempts" IS 'Max 8, then dead.';

COMMENT ON COLUMN "outbox_message"."next_attempt_at" IS 'Retries after 1 min, 5 min, 15 min, 1 h, 6 h, 24 h.';

COMMENT ON COLUMN "media_asset"."purpose" IS 'listing_photo, document, avatar, logo, invoice, export.';

COMMENT ON COLUMN "media_asset"."phash" IS 'Perceptual hash for duplicate photos (BR-MED-01).';

COMMENT ON COLUMN "reason_code"."action" IS 'reject_listing, decline_booking, cancel_booking, report_review ...';

COMMENT ON TABLE "moderation_case" IS 'Partial unique (kind, subject_id) where status <> resolved.';

COMMENT ON COLUMN "moderation_case"."submitted_at" IS 'Waiting time counts from here (BR-MOD-01).';

COMMENT ON TABLE "platform_settings" IS 'Partial unique (is_current) where is_current. New row per change (BR-CFG-01).';

COMMENT ON COLUMN "platform_settings"."data" IS 'Validated whitelist: commission defaults (bp), credit limits, request_ttl_hours, instant_booking_enabled, maintenance_mode, staff session timeouts, locales, feature flags.';

COMMENT ON TABLE "onboarding_flow_version" IS 'Partial unique (host_type) where status = draft; partial unique (host_type) where status = published.';

COMMENT ON COLUMN "onboarding_flow_version"."host_type" IS 'individual, agency, hotel, hostel.';

COMMENT ON COLUMN "onboarding_flow_version"."schema" IS 'Steps and fields with canonical types (BR-CFG-03).';

COMMENT ON TABLE "onboarding_draft" IS 'Partial unique (user_id, host_type) where status = in_progress.';

COMMENT ON COLUMN "onboarding_draft"."status" IS 'in_progress, submitted, abandoned.';

COMMENT ON TABLE "coupon" IS 'R2. Unique lower(code).';

COMMENT ON COLUMN "coupon"."discount_type" IS 'percentage, fixed.';

COMMENT ON COLUMN "coupon"."discount_value" IS 'bp or centimes.';

COMMENT ON COLUMN "coupon"."funded_by" IS 'platform, host (BR-PRM-02).';

COMMENT ON TABLE "audit_event" IS 'Insert-only: trigger refuses UPDATE and DELETE, app role has SELECT and INSERT only (DEC-026); hash chain (BR-STF-02); daily export to write-once storage. Partitioned by month.';

COMMENT ON COLUMN "audit_event"."actor_kind" IS 'staff, user, system.';

COMMENT ON COLUMN "audit_event"."action" IS 'e.g. LISTING_APPROVE, WALLET_TOPUP (53 kinds today).';

COMMENT ON COLUMN "idempotency_record"."request_hash" IS 'SHA-256 of the request body. Same key with a different hash: 422 idempotency_key_reused.';

COMMENT ON COLUMN "idempotency_record"."status" IS 'in_progress, completed.';

COMMENT ON COLUMN "idempotency_record"."expires_at" IS 'Created + 24 h (BR-SYS-01).';

COMMENT ON TABLE "incident_record" IS 'Incident register and breach clock (PRV-05). Staff-only, audited.';

COMMENT ON COLUMN "incident_record"."kind" IS 'security_breach, data_leak, outage, fraud.';

COMMENT ON COLUMN "incident_record"."severity" IS 'low, medium, high, critical.';

COMMENT ON COLUMN "incident_record"."anpdp_deadline_at" IS 'detected_at + 5 days when personal data is involved (Law 18-07 as amended, VERIFY WITH A PROFESSIONAL).';

COMMENT ON TABLE "calendar_feed" IS 'Later release (AVL-06): iCal import and export.';

COMMENT ON COLUMN "calendar_feed"."direction" IS 'import or export.';

COMMENT ON COLUMN "calendar_feed"."url_encrypted" IS 'Import URL (other platform), encrypted; fetched through the egress proxy with private-IP blocking (SSRF control).';

COMMENT ON COLUMN "calendar_feed"."export_token_hash" IS 'Hash of the secret token in the export URL.';

COMMENT ON TABLE "otp_send_log" IS 'Record of every one-time code sent (codes themselves stay in Redis as an HMAC, never stored in clear). Feeds the limits per destination and per IP, the global daily SMS budget (sms_budget_exceeded) and pumping-fraud detection (ACC-02, BR-ACC-02). Kept 90 days.';

COMMENT ON COLUMN "otp_send_log"."phone_hash" IS 'HMAC-SHA256 of the destination with HASH_PEPPER (BR-SYS-07).';

COMMENT ON COLUMN "otp_send_log"."purpose" IS 'signup, login, phone_change, payout_change.';

COMMENT ON COLUMN "otp_send_log"."status" IS 'sent, failed, blocked_rate_limit.';

COMMENT ON TABLE "property_integration" IS 'Direct connection to a hotel system (DEC-017, HST-08). Room types, per-night availability, prices and services are pulled from it. BLADUS stays the source of truth for bookings made on BLADUS and pushes them back when the system allows it.';

COMMENT ON COLUMN "property_integration"."listing_id" IS 'The hotel or hostel property this connection feeds.';

COMMENT ON COLUMN "property_integration"."kind" IS 'channel_manager, pms, ical, csv_import.';

COMMENT ON COLUMN "property_integration"."system_name" IS 'Name of the hotel system as the hotel gave it.';

COMMENT ON COLUMN "property_integration"."base_url" IS 'https only; passes the outgoing URL check at save and fetch time (BR-SYS-06).';

COMMENT ON COLUMN "property_integration"."credentials_encrypted" IS 'API key or login of the hotel system, AES-GCM (Fernet acceptable) under INTEGRATION_KEYS, outside the database.';

COMMENT ON COLUMN "property_integration"."credentials_key_id" IS 'Which INTEGRATION_KEYS key encrypted this record (yearly rotation).';

COMMENT ON COLUMN "property_integration"."status" IS 'pending, active, error, disabled.';

COMMENT ON TABLE "integration_sync_log" IS 'One row per sync run, so the hotel and the admin can see what was imported and why a sync failed.';

COMMENT ON COLUMN "integration_sync_log"."status" IS 'ok, partial, failed.';

COMMENT ON TABLE "inventory_conflict" IS 'Opened when a hotel sync asks for fewer rooms than BLADUS already holds or sold (DEC-021, BR-HST-07).';

COMMENT ON COLUMN "inventory_conflict"."requested_total" IS 'Total sent by the hotel system.';

COMMENT ON COLUMN "inventory_conflict"."applied_total" IS 'Clamped to held + booked.';

COMMENT ON COLUMN "inventory_conflict"."resolution" IS 'accepted_clamp, booking_moved, booking_cancelled.';

COMMENT ON TABLE "property_service" IS 'Services of a hotel or hostel (restaurants, spa, parking...), typed by the host or imported from the hotel system.';

COMMENT ON COLUMN "property_service"."kind" IS 'restaurant, cafe, spa, pool, gym, parking, conference_room, airport_transfer, other.';

COMMENT ON COLUMN "property_service"."price_minor" IS 'Null = included or price on request.';

COMMENT ON COLUMN "property_service"."external_id" IS 'Id of the service in the hotel system.';

COMMENT ON COLUMN "property_service"."source" IS 'manual or integration.';

COMMENT ON TABLE "listing_search_doc" IS 'Denormalised row per published listing, refreshed by outbox job. GiST on location_public, GIN on amenity_ids, GIN (search_text gin_trgm_ops). No tsvector: PostgreSQL has no Arabic stemmer (DEC-030).';

COMMENT ON COLUMN "listing_search_doc"."experience_type" IS 'For the experience type filter and facet counts.';

COMMENT ON COLUMN "listing_search_doc"."search_text" IS 'Title and place names (fr, ar, en), unaccented and with Arabic normalisation, for pg_trgm trigram search (BR-SRC-05).';

ALTER TABLE "user" ADD FOREIGN KEY ("avatar_media_id") REFERENCES "media_asset" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user" ADD FOREIGN KEY ("home_commune_id") REFERENCES "commune" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "staff_profile" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "staff_profile" ADD FOREIGN KEY ("invited_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "staff_role_permission" ADD FOREIGN KEY ("permission_code") REFERENCES "staff_permission" ("code") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "consent_record" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "favorite" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "favorite" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "favorite" ADD FOREIGN KEY ("trip_id") REFERENCES "trip" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "daira" ADD FOREIGN KEY ("wilaya_code") REFERENCES "wilaya" ("code") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "commune" ADD FOREIGN KEY ("wilaya_code") REFERENCES "wilaya" ("code") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "commune" ADD FOREIGN KEY ("daira_id") REFERENCES "daira" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "host_account" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "host_account" ADD FOREIGN KEY ("organization_id") REFERENCES "organization" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "organization" ADD FOREIGN KEY ("logo_media_id") REFERENCES "media_asset" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "organization" ADD FOREIGN KEY ("cover_media_id") REFERENCES "media_asset" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "organization" ADD FOREIGN KEY ("commune_id") REFERENCES "commune" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "organization" ADD FOREIGN KEY ("created_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "membership" ADD FOREIGN KEY ("organization_id") REFERENCES "organization" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "membership" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invitation" ADD FOREIGN KEY ("organization_id") REFERENCES "organization" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invitation" ADD FOREIGN KEY ("invited_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invitation" ADD FOREIGN KEY ("accepted_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "host_document" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "host_document" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "host_document" ADD FOREIGN KEY ("media_id") REFERENCES "media_asset" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "host_document" ADD FOREIGN KEY ("reviewed_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "host_document" ADD FOREIGN KEY ("rejection_reason_id") REFERENCES "reason_code" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payout_account" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing" ADD FOREIGN KEY ("category_id") REFERENCES "category" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing" ADD FOREIGN KEY ("property_type_id") REFERENCES "property_type" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing" ADD FOREIGN KEY ("commune_id") REFERENCES "commune" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing" ADD FOREIGN KEY ("cancellation_policy_id") REFERENCES "cancellation_policy" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing_revision" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing_revision" ADD FOREIGN KEY ("submitted_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing_revision" ADD FOREIGN KEY ("decided_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "vehicle_detail" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "experience_detail" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "room_type" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "room_type" ADD FOREIGN KEY ("integration_id") REFERENCES "property_integration" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing_amenity" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing_amenity" ADD FOREIGN KEY ("amenity_id") REFERENCES "amenity" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "room_type_amenity" ADD FOREIGN KEY ("room_type_id") REFERENCES "room_type" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "room_type_amenity" ADD FOREIGN KEY ("amenity_id") REFERENCES "amenity" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing_photo" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing_photo" ADD FOREIGN KEY ("room_type_id") REFERENCES "room_type" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing_photo" ADD FOREIGN KEY ("trip_id") REFERENCES "trip" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing_photo" ADD FOREIGN KEY ("media_id") REFERENCES "media_asset" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "featured_placement" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "featured_placement" ADD FOREIGN KEY ("trip_id") REFERENCES "trip" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "featured_placement" ADD FOREIGN KEY ("created_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing_day" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "room_type_night" ADD FOREIGN KEY ("room_type_id") REFERENCES "room_type" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "experience_slot" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "trip" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "trip" ADD FOREIGN KEY ("start_commune_id") REFERENCES "commune" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "trip" ADD FOREIGN KEY ("cancellation_policy_id") REFERENCES "cancellation_policy" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "trip_itinerary_day" ADD FOREIGN KEY ("trip_id") REFERENCES "trip" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "trip_itinerary_day" ADD FOREIGN KEY ("overnight_commune_id") REFERENCES "commune" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "trip_departure" ADD FOREIGN KEY ("trip_id") REFERENCES "trip" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "trip_departure" ADD FOREIGN KEY ("guide_membership_id") REFERENCES "membership" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "quote" ADD FOREIGN KEY ("guest_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "quote" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "quote" ADD FOREIGN KEY ("room_type_id") REFERENCES "room_type" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "quote" ADD FOREIGN KEY ("experience_slot_id") REFERENCES "experience_slot" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "quote" ADD FOREIGN KEY ("trip_departure_id") REFERENCES "trip_departure" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking" ADD FOREIGN KEY ("guest_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking" ADD FOREIGN KEY ("room_type_id") REFERENCES "room_type" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking" ADD FOREIGN KEY ("experience_slot_id") REFERENCES "experience_slot" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking" ADD FOREIGN KEY ("trip_departure_id") REFERENCES "trip_departure" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking" ADD FOREIGN KEY ("cancelled_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking" ADD FOREIGN KEY ("cancel_reason_id") REFERENCES "reason_code" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking" ADD FOREIGN KEY ("decline_reason_id") REFERENCES "reason_code" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking" ADD FOREIGN KEY ("quote_id") REFERENCES "quote" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking_event" ADD FOREIGN KEY ("booking_id") REFERENCES "booking" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking_event" ADD FOREIGN KEY ("actor_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking_event" ADD FOREIGN KEY ("reason_id") REFERENCES "reason_code" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "refund" ADD FOREIGN KEY ("booking_id") REFERENCES "booking" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "refund" ADD FOREIGN KEY ("created_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "refund_obligation" ADD FOREIGN KEY ("refund_id") REFERENCES "refund" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "refund_obligation" ADD FOREIGN KEY ("booking_id") REFERENCES "booking" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "refund_obligation" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "refund_obligation" ADD FOREIGN KEY ("guest_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "refund_obligation" ADD FOREIGN KEY ("declared_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "refund_obligation" ADD FOREIGN KEY ("settled_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "refund_obligation" ADD FOREIGN KEY ("settlement_proof_id") REFERENCES "media_asset" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "dispute" ADD FOREIGN KEY ("booking_id") REFERENCES "booking" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "dispute" ADD FOREIGN KEY ("opened_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "dispute" ADD FOREIGN KEY ("reason_id") REFERENCES "reason_code" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "dispute" ADD FOREIGN KEY ("resolved_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ledger_account" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ledger_transaction" ADD FOREIGN KEY ("booking_id") REFERENCES "booking" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ledger_transaction" ADD FOREIGN KEY ("topup_id") REFERENCES "wallet_topup" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ledger_transaction" ADD FOREIGN KEY ("reverses_id") REFERENCES "ledger_transaction" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ledger_transaction" ADD FOREIGN KEY ("created_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ledger_entry" ADD FOREIGN KEY ("transaction_id") REFERENCES "ledger_transaction" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ledger_entry" ADD FOREIGN KEY ("account_id") REFERENCES "ledger_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "account_balance" ADD FOREIGN KEY ("account_id") REFERENCES "ledger_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "wallet_topup" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "wallet_topup" ADD FOREIGN KEY ("requested_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "wallet_topup" ADD FOREIGN KEY ("approved_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "wallet_topup" ADD FOREIGN KEY ("gateway_event_id") REFERENCES "gateway_event" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "wallet_adjustment" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "wallet_adjustment" ADD FOREIGN KEY ("requested_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "wallet_adjustment" ADD FOREIGN KEY ("approved_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "wallet_adjustment" ADD FOREIGN KEY ("ledger_transaction_id") REFERENCES "ledger_transaction" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payment" ADD FOREIGN KEY ("booking_id") REFERENCES "booking" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payout" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payout" ADD FOREIGN KEY ("payout_account_id") REFERENCES "payout_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payout" ADD FOREIGN KEY ("approved_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payout" ADD FOREIGN KEY ("ledger_transaction_id") REFERENCES "ledger_transaction" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invoice" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invoice" ADD FOREIGN KEY ("pdf_media_id") REFERENCES "media_asset" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invoice" ADD FOREIGN KEY ("credit_note_of_id") REFERENCES "invoice" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "review" ADD FOREIGN KEY ("booking_id") REFERENCES "booking" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "review" ADD FOREIGN KEY ("author_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "review" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "review" ADD FOREIGN KEY ("trip_id") REFERENCES "trip" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "review" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "review_reply" ADD FOREIGN KEY ("review_id") REFERENCES "review" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "review_reply" ADD FOREIGN KEY ("author_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "review_report" ADD FOREIGN KEY ("review_id") REFERENCES "review" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "review_report" ADD FOREIGN KEY ("reporter_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "review_report" ADD FOREIGN KEY ("reason_id") REFERENCES "reason_code" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "conversation" ADD FOREIGN KEY ("guest_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "conversation" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "conversation" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "conversation" ADD FOREIGN KEY ("trip_id") REFERENCES "trip" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "conversation" ADD FOREIGN KEY ("booking_id") REFERENCES "booking" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "conversation_participant" ADD FOREIGN KEY ("conversation_id") REFERENCES "conversation" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "conversation_participant" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "message" ADD FOREIGN KEY ("conversation_id") REFERENCES "conversation" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "message" ADD FOREIGN KEY ("sender_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification_preference" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery_log" ADD FOREIGN KEY ("outbox_message_id") REFERENCES "outbox_message" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "media_asset" ADD FOREIGN KEY ("owner_user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "media_asset" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "moderation_case" ADD FOREIGN KEY ("assigned_to_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "moderation_case" ADD FOREIGN KEY ("resolved_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "moderation_decision" ADD FOREIGN KEY ("case_id") REFERENCES "moderation_case" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "moderation_decision" ADD FOREIGN KEY ("reason_id") REFERENCES "reason_code" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "moderation_decision" ADD FOREIGN KEY ("actor_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "change_request_item" ADD FOREIGN KEY ("case_id") REFERENCES "moderation_case" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "platform_settings" ADD FOREIGN KEY ("created_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "onboarding_flow_version" ADD FOREIGN KEY ("published_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "onboarding_draft" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "onboarding_draft" ADD FOREIGN KEY ("flow_version_id") REFERENCES "onboarding_flow_version" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "onboarding_draft" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "coupon" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "coupon" ADD FOREIGN KEY ("created_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "coupon_redemption" ADD FOREIGN KEY ("coupon_id") REFERENCES "coupon" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "coupon_redemption" ADD FOREIGN KEY ("booking_id") REFERENCES "booking" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "coupon_redemption" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "audit_event" ADD FOREIGN KEY ("actor_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "audit_event" ADD FOREIGN KEY ("host_account_id") REFERENCES "host_account" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "export_job" ADD FOREIGN KEY ("requested_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "export_job" ADD FOREIGN KEY ("media_id") REFERENCES "media_asset" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "data_subject_request" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "data_subject_request" ADD FOREIGN KEY ("handled_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "idempotency_record" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "incident_record" ADD FOREIGN KEY ("owner_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "calendar_feed" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "calendar_feed" ADD FOREIGN KEY ("room_type_id") REFERENCES "room_type" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "property_integration" ADD FOREIGN KEY ("organization_id") REFERENCES "organization" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "property_integration" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "property_integration" ADD FOREIGN KEY ("created_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "integration_sync_log" ADD FOREIGN KEY ("integration_id") REFERENCES "property_integration" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "inventory_conflict" ADD FOREIGN KEY ("integration_id") REFERENCES "property_integration" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "inventory_conflict" ADD FOREIGN KEY ("room_type_id") REFERENCES "room_type" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "inventory_conflict" ADD FOREIGN KEY ("resolved_by_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "property_service" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "listing_search_doc" ADD FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") DEFERRABLE INITIALLY IMMEDIATE;

-- ==== EXTRA SQL FROM 05-database-schema.md SECTION 6 (not expressible in DBML) ====

-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- equality inside exclusion constraints
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- BR-AVL-01: no overlapping stays on a single unit
ALTER TABLE booking ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (listing_id WITH =, stay WITH &&)
  WHERE (inventory_kind = 'single'
         AND status IN ('awaiting_payment','pending','confirmed','completed','disputed'));

-- ADR-003: targets match the inventory kind
ALTER TABLE booking ADD CONSTRAINT booking_target_matches_kind CHECK (
  (inventory_kind = 'single'    AND listing_id IS NOT NULL AND room_type_id IS NULL AND experience_slot_id IS NULL AND trip_departure_id IS NULL) OR
  (inventory_kind = 'room_pool' AND listing_id IS NOT NULL AND room_type_id IS NOT NULL AND experience_slot_id IS NULL AND trip_departure_id IS NULL) OR
  (inventory_kind = 'slot'      AND listing_id IS NOT NULL AND experience_slot_id IS NOT NULL AND room_type_id IS NULL AND trip_departure_id IS NULL) OR
  (inventory_kind = 'departure' AND trip_departure_id IS NOT NULL AND listing_id IS NULL AND room_type_id IS NULL AND experience_slot_id IS NULL));

ALTER TABLE booking ADD CONSTRAINT booking_money_ok CHECK (
  subtotal_minor >= 0 AND discount_minor >= 0 AND cleaning_fee_minor >= 0 AND taxes_minor >= 0
  AND total_minor = subtotal_minor - discount_minor + cleaning_fee_minor + taxes_minor
  AND refund_due_minor BETWEEN 0 AND total_minor
  AND commission_rate_bp BETWEEN 0 AND 10000 AND commission_minor >= 0
  AND NOT isempty(stay) AND lower_inc(stay) AND NOT upper_inc(stay));

-- BR-AVL-02: pooled inventory never oversold
ALTER TABLE room_type_night ADD CONSTRAINT rtn_capacity
  CHECK (held >= 0 AND booked >= 0 AND total >= 0 AND held + booked <= total);
ALTER TABLE trip_departure ADD CONSTRAINT dep_capacity
  CHECK (seats_held >= 0 AND seats_booked >= 0 AND seats_held + seats_booked <= seats_total AND ends_on >= starts_on);
ALTER TABLE experience_slot ADD CONSTRAINT slot_capacity
  CHECK (seats_held >= 0 AND seats_booked >= 0 AND seats_held + seats_booked <= seats_total AND ends_at > starts_at);

-- Reserving 2 rooms for nights [2026-12-10, 2026-12-13): one statement, all nights or nothing
UPDATE room_type_night SET booked = booked + 2
 WHERE room_type_id = :rt AND night >= '2026-12-10' AND night < '2026-12-13'
   AND held + booked + 2 <= total;
-- the service checks that the updated row count = number of nights, else rolls back (409)

-- ADR-001: host account is exactly one of user or organisation
ALTER TABLE host_account ADD CONSTRAINT host_account_one_owner CHECK (
  (kind = 'individual'   AND user_id IS NOT NULL AND organization_id IS NULL) OR
  (kind = 'organization' AND organization_id IS NOT NULL AND user_id IS NULL));

-- BR-ORG-04: exactly one active owner
CREATE UNIQUE INDEX membership_one_owner ON membership (organization_id)
  WHERE role = 'owner' AND is_active;
CREATE UNIQUE INDEX membership_active_unique ON membership (organization_id, user_id) WHERE is_active;

-- BR-ACC-01
CREATE UNIQUE INDEX user_email_ci ON "user" (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX user_phone ON "user" (phone_e164) WHERE phone_e164 IS NOT NULL;

-- BR-PAY-02: balanced, insert-only ledger
CREATE FUNCTION ledger_tx_balanced() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_entry WHERE transaction_id = NEW.transaction_id
             GROUP BY currency HAVING sum(amount_minor) <> 0) THEN
    RAISE EXCEPTION 'ledger transaction % is not balanced', NEW.transaction_id;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER ledger_entry_balanced AFTER INSERT ON ledger_entry
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger_tx_balanced();
ALTER TABLE ledger_entry ADD CONSTRAINT ledger_entry_nonzero CHECK (amount_minor <> 0);

-- DEC-026: insert-only tables, refused for every role (also the table owner)
CREATE FUNCTION refuse_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed (insert-only table)', TG_OP, TG_TABLE_NAME;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER ledger_transaction_insert_only BEFORE UPDATE OR DELETE ON ledger_transaction
  FOR EACH ROW EXECUTE FUNCTION refuse_change();
CREATE TRIGGER ledger_entry_insert_only BEFORE UPDATE OR DELETE ON ledger_entry
  FOR EACH ROW EXECUTE FUNCTION refuse_change();
CREATE TRIGGER audit_event_insert_only BEFORE UPDATE OR DELETE ON audit_event
  FOR EACH ROW EXECUTE FUNCTION refuse_change();
CREATE TRIGGER booking_event_insert_only BEFORE UPDATE OR DELETE ON booking_event
  FOR EACH ROW EXECUTE FUNCTION refuse_change();

-- DEC-026: role split. The owner runs migrations; the app cannot change ledger or audit rows.
CREATE ROLE bladus_migrator LOGIN;            -- owns every table, used only by migrations
CREATE ROLE bladus_app LOGIN;                 -- the Django app at run time
-- (every table is created by bladus_migrator, so bladus_app is never an owner)
GRANT USAGE ON SCHEMA public TO bladus_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bladus_app;
REVOKE UPDATE, DELETE, TRUNCATE ON ledger_transaction, ledger_entry, audit_event, booking_event FROM bladus_app;
GRANT SELECT, INSERT ON ledger_transaction, ledger_entry, audit_event, booking_event TO bladus_app;

-- BR-AVL-07 (a): never block a day that a single-unit booking holds
CREATE FUNCTION listing_day_block_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.is_blocked AND EXISTS (
       SELECT 1 FROM booking b
        WHERE b.listing_id = NEW.listing_id AND b.inventory_kind = 'single'
          AND b.status IN ('awaiting_payment','pending','confirmed','completed','disputed')
          AND b.stay @> NEW.day) THEN
    RAISE EXCEPTION 'dates_booked' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER listing_day_block_guard BEFORE INSERT OR UPDATE OF is_blocked ON listing_day
  FOR EACH ROW EXECUTE FUNCTION listing_day_block_guard();

-- BR-AVL-07 (b): never place or move a single-unit booking onto a blocked day
CREATE FUNCTION booking_blocked_day_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.inventory_kind = 'single'
     AND NEW.status IN ('awaiting_payment','pending','confirmed','completed','disputed')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.stay IS DISTINCT FROM NEW.stay)
     AND EXISTS (SELECT 1 FROM listing_day d
                  WHERE d.listing_id = NEW.listing_id AND d.is_blocked AND NEW.stay @> d.day) THEN
    RAISE EXCEPTION 'dates_unavailable' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER booking_blocked_day_guard BEFORE INSERT OR UPDATE OF status, stay ON booking
  FOR EACH ROW EXECUTE FUNCTION booking_blocked_day_guard();
-- Both services lock the listing row first (SELECT ... FOR UPDATE), so the two triggers never race.

-- BR-BKG-09: stay confirmation only on a confirmed or finished booking
ALTER TABLE booking ADD CONSTRAINT booking_stay_confirmed_ok CHECK (
  stay_confirmed_at IS NULL OR status IN ('confirmed','completed','disputed'));

-- BR-PAY-13: manual adjustments, capped and four-eyes
ALTER TABLE wallet_adjustment ADD CONSTRAINT adjustment_amount_ok
  CHECK (amount_minor <> 0 AND abs(amount_minor) <= 100000000);
ALTER TABLE wallet_adjustment ADD CONSTRAINT adjustment_four_eyes
  CHECK (approved_by_id IS NULL OR approved_by_id <> requested_by_id);
ALTER TABLE wallet_topup ADD CONSTRAINT topup_four_eyes
  CHECK (approved_by_id IS NULL OR approved_by_id <> requested_by_id);

-- BR-CAN-06: refund obligations
ALTER TABLE refund_obligation ADD CONSTRAINT refund_obligation_amount_ok CHECK (amount_minor > 0);
CREATE INDEX refund_obligation_overdue ON refund_obligation (due_at) WHERE status IN ('open','disputed');

-- BR-HST-07: one open conflict per room-night
CREATE UNIQUE INDEX inventory_conflict_one_open ON inventory_conflict (room_type_id, night) WHERE status = 'open';

-- BR-SYS-03: outbox
ALTER TABLE outbox_message ADD CONSTRAINT outbox_attempts_ok CHECK (attempts BETWEEN 0 AND 8);

-- BR-SRC-05: trigram search (no tsvector; PostgreSQL has no Arabic stemmer)
CREATE INDEX listing_title_trgm ON listing USING gin (lower(unaccent_immutable(title)) gin_trgm_ops);
CREATE INDEX search_doc_text_trgm ON listing_search_doc USING gin (search_text gin_trgm_ops);
CREATE INDEX commune_name_fr_trgm ON commune USING gin (lower(unaccent_immutable(name_fr)) gin_trgm_ops);
CREATE INDEX commune_name_en_trgm ON commune USING gin (lower(name_en) gin_trgm_ops);
CREATE INDEX commune_name_ar_trgm ON commune USING gin (name_ar gin_trgm_ops);
-- unaccent_immutable: an IMMUTABLE SQL wrapper around unaccent('unaccent', text), needed to index it

-- BR-PAY-04: commission posted once per booking
CREATE UNIQUE INDEX ledger_one_commission ON ledger_transaction (booking_id) WHERE kind = 'commission';

-- BR-LST-02, BR-CFG-02, BR-MOD: one open item at a time
CREATE UNIQUE INDEX listing_one_pending_revision ON listing_revision (listing_id) WHERE status = 'pending_review';
CREATE UNIQUE INDEX flow_one_draft ON onboarding_flow_version (host_type) WHERE status = 'draft';
CREATE UNIQUE INDEX flow_one_published ON onboarding_flow_version (host_type) WHERE status = 'published';
CREATE UNIQUE INDEX case_one_open ON moderation_case (kind, subject_id) WHERE status <> 'resolved';
CREATE UNIQUE INDEX settings_one_current ON platform_settings (is_current) WHERE is_current;
