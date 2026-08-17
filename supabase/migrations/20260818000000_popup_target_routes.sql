-- Migration: 20260818000000_popup_target_routes.sql
-- Description: Add target_routes to popups and user_promos tables for route-specific display targeting

ALTER TABLE IF EXISTS public.popups
  ADD COLUMN IF NOT EXISTS target_routes TEXT[] DEFAULT '{"/"}'::text[];

COMMENT ON COLUMN public.popups.target_routes IS 'Array of URL route patterns where this popup is allowed to trigger (e.g. {"/"}, {"/products", "/product/*"}, {"*"}). Defaults to {"/"} (home page only).';

ALTER TABLE IF EXISTS public.user_promos
  ADD COLUMN IF NOT EXISTS target_routes TEXT[] DEFAULT '{"/"}'::text[];

COMMENT ON COLUMN public.user_promos.target_routes IS 'Array of URL route patterns where this promo popup is allowed to trigger. Defaults to {"/"} (home page only).';
