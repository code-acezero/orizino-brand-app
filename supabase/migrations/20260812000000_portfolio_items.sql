-- Create the portfolio_items table
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  description text,
  image_url text,
  year text,
  tags text[],
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
DROP POLICY IF EXISTS "Allow public read access" ON public.portfolio_items;
CREATE POLICY "Allow public read access" ON public.portfolio_items FOR SELECT USING (true);

-- Ensure table is clean for new brand launch
DELETE FROM public.portfolio_items;
