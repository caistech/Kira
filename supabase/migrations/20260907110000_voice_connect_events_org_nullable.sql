-- Migration: 20260907110000_voice_connect_events_org_nullable.sql
-- Purpose: Allow voice-connect telemetry rows with no organisation.
--
-- /api/voice/telemetry is DELIBERATELY UNAUTHENTICATED: the landing and valuation widgets run
-- before sign-in, and an anonymous visitor who cannot connect is exactly the person worth hearing
-- about. There is no organisation to attach to an anonymous caller — passing null is correct, not a
-- fallback, and never an invented id. The NOT NULL constraint added in
-- 20260828001718 (phase1_b) predates that design decision and turned every anonymous
-- telemetry write into a silent failure (the route always answers 204).

ALTER TABLE public.voice_connect_events
    ALTER COLUMN organisation_id DROP NOT NULL;