-- Inventory module schema

-- Suppliers
CREATE TABLE IF NOT EXISTS inventory_suppliers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT NOT NULL,
  name VARCHAR(200) NOT NULL,
  ruc VARCHAR(20),
  phone VARCHAR(50),
  email VARCHAR(150),
  address VARCHAR(255),
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_suppliers_business FOREIGN KEY (business_id) REFERENCES businesses(id),
  CONSTRAINT uq_inventory_suppliers_business_ruc UNIQUE (business_id, ruc)
);
CREATE INDEX idx_inventory_suppliers_business ON inventory_suppliers(business_id);

-- Products (Padre)
CREATE TABLE IF NOT EXISTS inventory_products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT NOT NULL,
  code VARCHAR(100) NOT NULL,
  category VARCHAR(30) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  unit_of_measure VARCHAR(50),
  supplier_id BIGINT,
  image VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
  min_stock INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_products_business FOREIGN KEY (business_id) REFERENCES businesses(id),
  CONSTRAINT fk_inventory_products_supplier FOREIGN KEY (supplier_id) REFERENCES inventory_suppliers(id),
  CONSTRAINT uq_inventory_products_business_code UNIQUE (business_id, code)
);
CREATE INDEX idx_inventory_products_business ON inventory_products(business_id);
CREATE INDEX idx_inventory_products_category ON inventory_products(category);

-- Variants (Hijo)
CREATE TABLE IF NOT EXISTS inventory_variants (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  code VARCHAR(100) NOT NULL,
  description VARCHAR(200),
  current_qty INT NOT NULL DEFAULT 0,
  min_qty INT,
  unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  location VARCHAR(150),
  image VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
  version BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_variants_product FOREIGN KEY (product_id) REFERENCES inventory_products(id),
  CONSTRAINT uq_inventory_variants_product_code UNIQUE (product_id, code)
);
CREATE INDEX idx_inventory_variants_product ON inventory_variants(product_id);

-- Subdetails (Nieto / Lotes)
CREATE TABLE IF NOT EXISTS inventory_subdetails (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  variant_id BIGINT NOT NULL,
  lot VARCHAR(100),
  detail_location VARCHAR(150),
  qty INT NOT NULL DEFAULT 0,
  unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  purchase_date DATE,
  expiry_date DATE,
  supplier_id BIGINT,
  state VARCHAR(30) NOT NULL DEFAULT 'NUEVO',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_subdetails_variant FOREIGN KEY (variant_id) REFERENCES inventory_variants(id),
  CONSTRAINT fk_inventory_subdetails_supplier FOREIGN KEY (supplier_id) REFERENCES inventory_suppliers(id),
  CONSTRAINT uq_inventory_subdetails_variant_lot UNIQUE (variant_id, lot)
);
CREATE INDEX idx_inventory_subdetails_variant ON inventory_subdetails(variant_id);
CREATE INDEX idx_inventory_subdetails_expiry ON inventory_subdetails(expiry_date);

-- Movements
CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT NOT NULL,
  type VARCHAR(30) NOT NULL,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  product_id BIGINT,
  variant_id BIGINT NOT NULL,
  subdetail_id BIGINT,
  qty INT NOT NULL,
  unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  reason VARCHAR(200),
  responsible VARCHAR(150),
  document_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_movements_business FOREIGN KEY (business_id) REFERENCES businesses(id),
  CONSTRAINT fk_inventory_movements_product FOREIGN KEY (product_id) REFERENCES inventory_products(id),
  CONSTRAINT fk_inventory_movements_variant FOREIGN KEY (variant_id) REFERENCES inventory_variants(id),
  CONSTRAINT fk_inventory_movements_subdetail FOREIGN KEY (subdetail_id) REFERENCES inventory_subdetails(id)
);
CREATE INDEX idx_inventory_mov_business_date ON inventory_movements(business_id, date);
CREATE INDEX idx_inventory_mov_variant ON inventory_movements(variant_id);
CREATE INDEX idx_inventory_mov_type ON inventory_movements(type);

-- Maintenances
CREATE TABLE IF NOT EXISTS inventory_maintenances (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  business_id BIGINT NOT NULL,
  date DATE NOT NULL,
  variant_id BIGINT NOT NULL,
  spares_json JSON,
  spares_cost DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  labor_cost DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  total_cost DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  responsible VARCHAR(150),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_maint_business FOREIGN KEY (business_id) REFERENCES businesses(id),
  CONSTRAINT fk_inventory_maint_variant FOREIGN KEY (variant_id) REFERENCES inventory_variants(id)
);
CREATE INDEX idx_inventory_maint_business_date ON inventory_maintenances(business_id, date);
CREATE INDEX idx_inventory_maint_variant ON inventory_maintenances(variant_id);
