-- Migration: Add missing columns to sticker_settings
-- These columns are used by the StickerSetupTab UI but were absent from the
-- original table definition, causing silent DB errors on save.

-- QR Error Correction Level (L / M / Q / H)
ALTER TABLE sticker_settings
  ADD COLUMN IF NOT EXISTS qr_ecl text DEFAULT 'M';

-- QR payload mode (url = verification link, raw = serial string)
ALTER TABLE sticker_settings
  ADD COLUMN IF NOT EXISTS qr_data_mode text DEFAULT 'url';

-- Serial prefix used for test/sample sticker generation
ALTER TABLE sticker_settings
  ADD COLUMN IF NOT EXISTS serial_prefix text DEFAULT 'ORZ';

-- Watermark overlay settings
ALTER TABLE sticker_settings
  ADD COLUMN IF NOT EXISTS show_watermark boolean DEFAULT true;

ALTER TABLE sticker_settings
  ADD COLUMN IF NOT EXISTS watermark_opacity numeric DEFAULT 0.08;

ALTER TABLE sticker_settings
  ADD COLUMN IF NOT EXISTS watermark_url text DEFAULT '';

-- Google Sheets sync for serial export
ALTER TABLE sticker_settings
  ADD COLUMN IF NOT EXISTS sync_enabled boolean DEFAULT false;

ALTER TABLE sticker_settings
  ADD COLUMN IF NOT EXISTS google_sheet_id text;

ALTER TABLE sticker_settings
  ADD COLUMN IF NOT EXISTS google_sheet_tab text DEFAULT 'Serials';

-- Preset kind (product_serial vs order)
ALTER TABLE sticker_settings
  ADD COLUMN IF NOT EXISTS sticker_kind text DEFAULT 'product_serial';

-- Fix barcode_format column default: was 'code128', must be 'qrcode' to match
-- STICKER_DEFAULTS in Sticker.tsx. Mismatched defaults cause preview/export skew.
ALTER TABLE sticker_settings
  ALTER COLUMN barcode_format SET DEFAULT 'qrcode';

-- Index for fast active-preset lookup per kind
CREATE INDEX IF NOT EXISTS sticker_settings_active_kind_idx
  ON sticker_settings (sticker_kind, is_active)
  WHERE is_active = true;


-- Border frame options (added alongside border_radius_pt / border_style in Sticker.tsx)
ALTER TABLE sticker_settings
  ADD COLUMN IF NOT EXISTS border_radius_pt numeric DEFAULT 0;
ALTER TABLE sticker_settings
  ADD COLUMN IF NOT EXISTS border_style text DEFAULT 'solid';
