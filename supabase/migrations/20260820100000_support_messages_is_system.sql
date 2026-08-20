-- Migration: add is_system flag to support_messages
-- Applied: 2026-08-20
-- Purpose: Allows admin/auto-assign system to mark internal audit notes as hidden
--          from both admin chat view and customer widget, while professional
--          customer-facing messages remain visible.

ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;

COMMENT ON COLUMN public.support_messages.is_system IS
  'True for internal system/audit notes (auto-assign events, handoff logs). Hidden from both admin chat UI and customer widget.';
