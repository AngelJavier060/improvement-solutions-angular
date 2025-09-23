-- Employee Documents and Contracts schema

-- Documents
CREATE TABLE IF NOT EXISTS business_employee_documents (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  business_employee_id BIGINT NOT NULL,
  type_document_id BIGINT NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  observations VARCHAR(1024) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_bed_business_employee FOREIGN KEY (business_employee_id) REFERENCES business_employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_bed_type_document FOREIGN KEY (type_document_id) REFERENCES type_documents(id)
);

CREATE TABLE IF NOT EXISTS business_employee_document_files (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  document_id BIGINT NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  file_name VARCHAR(255) NULL,
  file_type VARCHAR(100) NULL,
  uploaded_at DATETIME NOT NULL,
  CONSTRAINT fk_bedf_document FOREIGN KEY (document_id) REFERENCES business_employee_documents(id) ON DELETE CASCADE
);

-- Contracts
CREATE TABLE IF NOT EXISTS business_employee_contracts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  business_employee_id BIGINT NOT NULL,
  type_contract_id BIGINT NOT NULL,
  position_id BIGINT NULL,
  department_id BIGINT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  salary DECIMAL(12,2) NULL,
  description VARCHAR(512) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_bec_business_employee FOREIGN KEY (business_employee_id) REFERENCES business_employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_bec_type_contract FOREIGN KEY (type_contract_id) REFERENCES type_contracts(id),
  CONSTRAINT fk_bec_position FOREIGN KEY (position_id) REFERENCES positions(id),
  CONSTRAINT fk_bec_department FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS business_employee_contract_files (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  contract_id BIGINT NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  file_name VARCHAR(255) NULL,
  file_type VARCHAR(100) NULL,
  uploaded_at DATETIME NOT NULL,
  CONSTRAINT fk_becf_contract FOREIGN KEY (contract_id) REFERENCES business_employee_contracts(id) ON DELETE CASCADE
);
