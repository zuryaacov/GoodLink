-- Create clicks tracking table
-- This table tracks every click/visit to a shortened link

CREATE TABLE IF NOT EXISTS clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Request information
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT, -- mobile, desktop, tablet, bot
  browser TEXT,
  os TEXT,
  
  -- URL information
  slug TEXT NOT NULL,
  domain TEXT NOT NULL,
  target_url TEXT NOT NULL,
  query_params TEXT, -- JSON string of query parameters
  
  -- Timestamp
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  is_bot BOOLEAN DEFAULT false,
  is_unique BOOLEAN DEFAULT true, -- Can be updated later for duplicate detection
  session_id TEXT -- For tracking unique sessions
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_clicks_user_id ON clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_slug_domain ON clicks(slug, domain);
CREATE INDEX IF NOT EXISTS idx_clicks_domain_clicked_at ON clicks(domain, clicked_at DESC);

-- Enable Row Level Security
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own clicks
CREATE POLICY "Users can view their own clicks"
  ON clicks FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can insert clicks (for the worker)
-- This is needed because the worker uses service_role key
CREATE POLICY "Service role can insert clicks"
  ON clicks FOR INSERT
  WITH CHECK (true);

-- Note: The worker uses service_role key which bypasses RLS,
-- but having explicit policies is good practice.

