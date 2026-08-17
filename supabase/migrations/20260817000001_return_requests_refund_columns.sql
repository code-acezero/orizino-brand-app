-- Migration: 20260817000001_return_requests_refund_columns.sql
-- Description: Add complete refund tracking, delivery charge refund flag, and return tracking columns to return_requests

ALTER TABLE IF EXISTS public.return_requests
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_delivery_charge BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS refund_method TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refund_reference TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS return_tracking TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS resolution TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS decided_by UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ DEFAULT NULL;

-- Comment on columns for clarity
COMMENT ON COLUMN public.return_requests.refund_delivery_charge IS 'If TRUE, delivery fee is refunded to customer and recorded as business shipping loss. If FALSE, delivery fee was retained and is NOT a loss.';
COMMENT ON COLUMN public.return_requests.refund_status IS 'Lifecycle: pending | approved | processing | refunded | rejected | not_required';
COMMENT ON COLUMN public.return_requests.refund_reference IS 'Transaction reference / ID for the refund payment (e.g. bKash TrxID)';
COMMENT ON COLUMN public.return_requests.return_tracking IS 'Courier tracking number for the returning parcel back to warehouse';
