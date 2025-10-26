-- Add issued size column to inventory_output_details for EPP tracking
ALTER TABLE inventory_output_details
    ADD COLUMN IF NOT EXISTS issued_size VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS department_id BIGINT NULL;

-- Optional index for faster stats by size
CREATE INDEX IF NOT EXISTS idx_output_detail_issued_size ON inventory_output_details(issued_size);
CREATE INDEX IF NOT EXISTS idx_output_detail_department ON inventory_output_details(department_id);
