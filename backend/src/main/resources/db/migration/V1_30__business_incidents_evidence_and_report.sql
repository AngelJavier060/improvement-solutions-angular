-- Columnas faltantes: evidencias gráficas y generación del informe
ALTER TABLE business_incidents ADD COLUMN IF NOT EXISTS evidence_paths TEXT;
ALTER TABLE business_incidents ADD COLUMN IF NOT EXISTS reported_by VARCHAR(150);
ALTER TABLE business_incidents ADD COLUMN IF NOT EXISTS report_date DATE;
ALTER TABLE business_incidents ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(150);
ALTER TABLE business_incidents ADD COLUMN IF NOT EXISTS approved_by VARCHAR(150);
