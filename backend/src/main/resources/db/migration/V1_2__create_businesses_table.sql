-- Crear tabla de empresas
CREATE TABLE businesses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_short VARCHAR(50),
    ruc VARCHAR(13) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20),
    address VARCHAR(500),
    website VARCHAR(255),
    description TEXT,
    commercial_activity VARCHAR(255),
    trade_name VARCHAR(255),
    legal_representative VARCHAR(255) NOT NULL,
    logo VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    registration_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Crear tabla de relación usuario-empresa
CREATE TABLE user_business (
    user_id BIGINT NOT NULL,
    business_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, business_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_businesses_ruc ON businesses(ruc);
CREATE INDEX idx_businesses_name ON businesses(name);
CREATE INDEX idx_businesses_active ON businesses(active);
CREATE INDEX idx_user_business_user_id ON user_business(user_id);
CREATE INDEX idx_user_business_business_id ON user_business(business_id);
