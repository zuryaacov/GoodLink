-- Add traffic_source column to clicks table.
-- Values: 'meta' (fbclid in URL), 'tiktok' (ttclid in URL), NULL (neither).
ALTER TABLE clicks
  ADD COLUMN IF NOT EXISTS traffic_source TEXT
  CHECK (traffic_source IN ('meta', 'tiktok'));
