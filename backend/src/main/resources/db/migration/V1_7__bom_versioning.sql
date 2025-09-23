-- Versioning for Business Obligation Matrix and Files

-- Add current_version to matrices (if not exists)
ALTER TABLE business_obligation_matrices
    ADD COLUMN IF NOT EXISTS current_version INT NOT NULL DEFAULT 1;

-- Add version to files (if not exists)
ALTER TABLE business_obligation_matrix_files
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- Create versions table to keep immutable history snapshots
CREATE TABLE IF NOT EXISTS business_obligation_matrix_versions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    business_obligation_matrix_id BIGINT NOT NULL,
    version INT NOT NULL,
    name VARCHAR(255),
    description TEXT,
    observations TEXT,
    due_date DATE,
    status VARCHAR(50),
    priority VARCHAR(50),
    responsible_person VARCHAR(255),
    completed BOOLEAN DEFAULT FALSE,
    completion_date TIMESTAMP NULL,
    entry_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bomv_bom FOREIGN KEY (business_obligation_matrix_id) REFERENCES business_obligation_matrices(id)
);

CREATE INDEX IF NOT EXISTS idx_bomv_bom ON business_obligation_matrix_versions(business_obligation_matrix_id);
CREATE INDEX IF NOT EXISTS idx_bomv_bom_ver ON business_obligation_matrix_versions(business_obligation_matrix_id, version);
