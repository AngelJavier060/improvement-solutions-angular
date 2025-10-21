-- Dynamic categories per business
CREATE TABLE IF NOT EXISTS inventory_categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT NOT NULL,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(200),
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_categories_business FOREIGN KEY (business_id) REFERENCES businesses(id),
  CONSTRAINT uq_inventory_categories_business_name UNIQUE (business_id, name)
);
CREATE INDEX idx_inventory_categories_business ON inventory_categories(business_id);

-- Widen product category column to support dynamic values up to 50 chars
ALTER TABLE inventory_products MODIFY category VARCHAR(50) NOT NULL;
