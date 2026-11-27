ALTER TABLE capster ADD COLUMN IF NOT EXISTS slug varchar(180);

UPDATE capster
SET slug = coalesce(nullif(trim(both '-' from regexp_replace(lower(nama_capster), '[^a-z0-9]+', '-', 'g')), ''), 'capster') || '-' || id_capster::text
WHERE slug IS NULL OR slug = '';

ALTER TABLE capster ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS capster_slug_unique ON capster(slug);
