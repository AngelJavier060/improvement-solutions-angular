-- ============================================================
-- Catálogo de módulos del sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS system_modules (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE COMMENT 'Código interno: TALENTO_HUMANO, SEGURIDAD_INDUSTRIAL, CALIDAD, INVENTARIO, etc.',
    name        VARCHAR(120) NOT NULL COMMENT 'Nombre visible',
    description VARCHAR(500) NULL,
    icon        VARCHAR(80)  NULL COMMENT 'Clase CSS del icono (FontAwesome, etc.)',
    color       VARCHAR(20)  NULL COMMENT 'Color del badge (#hex)',
    display_order INT        NOT NULL DEFAULT 0,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Módulos iniciales
INSERT INTO system_modules (code, name, description, icon, color, display_order) VALUES
('SEGURIDAD_INDUSTRIAL', 'Seguridad y Salud en el Trabajo', 'Gestión de seguridad industrial, matriz legal y cumplimiento normativo', 'fas fa-hard-hat', '#e74c3c', 1),
('TALENTO_HUMANO',       'Talento Humano',                  'Gestión de empleados, contratos, documentos y certificaciones',          'fas fa-users',    '#3498db', 2),
('CALIDAD',              'Calidad',                         'Gestión de calidad, auditorías y mejora continua',                       'fas fa-check-circle', '#27ae60', 3),
('INVENTARIO',           'Inventario',                      'Control de inventario, entradas, salidas y kardex',                      'fas fa-boxes',    '#f39c12', 4);

-- ============================================================
-- Relación empresa ↔ módulo (con fechas y estado)
-- ============================================================
CREATE TABLE IF NOT EXISTS business_modules (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    business_id     BIGINT   NOT NULL,
    module_id       BIGINT   NOT NULL,
    active          BOOLEAN  NOT NULL DEFAULT TRUE,
    start_date      DATE     NULL     COMMENT 'Fecha de inicio del acceso',
    expiration_date DATE     NULL     COMMENT 'Fecha de vencimiento (NULL = sin vencimiento)',
    notes           VARCHAR(500) NULL COMMENT 'Notas del Super Usuario',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_business_module (business_id, module_id),

    CONSTRAINT fk_bm_business FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT fk_bm_module   FOREIGN KEY (module_id)   REFERENCES system_modules (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
