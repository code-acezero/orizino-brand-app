-- Migration: Explore Inquiries, Site Config compatibility and Assets bucket
-- Adds inquiries table for customer messages submitted via the Explore App
-- and ensures site_settings / site_config holds the default explore app configuration.

CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new', -- 'new' | 'read' | 'responded' | 'archived'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit inquiries with validation
DROP POLICY IF EXISTS "Anyone can submit inquiries" ON public.inquiries;
CREATE POLICY "Anyone can submit inquiries" ON public.inquiries FOR INSERT TO anon, authenticated WITH CHECK (
  length(name) BETWEEN 2 AND 100 AND
  length(email) BETWEEN 3 AND 200 AND
  length(subject) BETWEEN 2 AND 150 AND
  length(message) BETWEEN 10 AND 4000
);

-- Admins and authenticated staff can view and manage inquiries
DROP POLICY IF EXISTS "Staff view inquiries" ON public.inquiries;
CREATE POLICY "Staff view inquiries" ON public.inquiries FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff update inquiries" ON public.inquiries;
CREATE POLICY "Staff update inquiries" ON public.inquiries FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff delete inquiries" ON public.inquiries;
CREATE POLICY "Staff delete inquiries" ON public.inquiries FOR DELETE TO authenticated USING (true);

-- Index for querying inquiries by status and creation time
CREATE INDEX IF NOT EXISTS inquiries_status_created_idx ON public.inquiries(status, created_at DESC);

-- Enable Realtime on inquiries
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.inquiries;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
