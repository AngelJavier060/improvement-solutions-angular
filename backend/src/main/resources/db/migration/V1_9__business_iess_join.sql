-- Ensure IESS catalog table exists (matches JPA: table `iess`, column `name` stores the code)
CREATE TABLE IF NOT EXISTS iess (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description VARCHAR(1024),
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

-- Join table for Business <-> Iess
CREATE TABLE IF NOT EXISTS business_iess (
  business_id BIGINT NOT NULL,
  iess_id BIGINT NOT NULL,
  PRIMARY KEY (business_id, iess_id),
  CONSTRAINT fk_bi_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_bi_iess FOREIGN KEY (iess_id) REFERENCES iess(id) ON DELETE CASCADE
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_business_iess_business ON business_iess(business_id);
CREATE INDEX IF NOT EXISTS idx_business_iess_iess ON business_iess(iess_id);
