ALTER TABLE laporan ADD COLUMN IF NOT EXISTS granularitas varchar(16) NOT NULL DEFAULT 'custom';
ALTER TABLE laporan ADD COLUMN IF NOT EXISTS parameter_filter jsonb NOT NULL DEFAULT '{}'::jsonb;
