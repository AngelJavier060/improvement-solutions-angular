-- Catálogos Mantenimiento Automotriz: Número de ejes y Configuración de ejes

CREATE TABLE IF NOT EXISTS numero_ejes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(2000),
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS configuracion_ejes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(2000),
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_numero_eje (
    business_id BIGINT NOT NULL,
    numero_eje_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, numero_eje_id),
    CONSTRAINT fk_business_numero_eje_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_business_numero_eje_catalog
        FOREIGN KEY (numero_eje_id) REFERENCES numero_ejes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_configuracion_eje (
    business_id BIGINT NOT NULL,
    configuracion_eje_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, configuracion_eje_id),
    CONSTRAINT fk_business_configuracion_eje_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_business_configuracion_eje_catalog
        FOREIGN KEY (configuracion_eje_id) REFERENCES configuracion_ejes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_business_numero_eje_business ON business_numero_eje(business_id);
CREATE INDEX idx_business_numero_eje_catalog ON business_numero_eje(numero_eje_id);
CREATE INDEX idx_business_configuracion_eje_business ON business_configuracion_eje(business_id);
CREATE INDEX idx_business_configuracion_eje_catalog ON business_configuracion_eje(configuracion_eje_id);
