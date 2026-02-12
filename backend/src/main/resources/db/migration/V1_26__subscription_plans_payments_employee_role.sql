-- ============================================================
-- V1_26: Subscription Plans, Payments & Employee Role
-- Estructura escalable para SaaS multi-empresa
-- ============================================================

-- 1. Catálogo de planes de suscripción (configurable por Super Admin)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(50)    NOT NULL UNIQUE COMMENT 'MENSUAL, SEMESTRAL, ANUAL, ILIMITADO',
    name            VARCHAR(120)   NOT NULL,
    description     VARCHAR(500)   NULL,
    duration_months INT            NOT NULL COMMENT 'Duración en meses (0 = ilimitado)',
    price           DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    currency        VARCHAR(10)    NOT NULL DEFAULT 'USD',
    active          BOOLEAN        NOT NULL DEFAULT TRUE,
    display_order   INT            NOT NULL DEFAULT 0,
    created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Planes iniciales
INSERT INTO subscription_plans (code, name, description, duration_months, price, display_order) VALUES
('MENSUAL',    'Plan Mensual',    'Acceso por 1 mes al módulo seleccionado',  1,  15.00,  1),
('SEMESTRAL',  'Plan Semestral',  'Acceso por 6 meses al módulo seleccionado', 6, 100.00, 2),
('ANUAL',      'Plan Anual',      'Acceso por 12 meses al módulo seleccionado', 12, 150.00, 3),
('ILIMITADO',  'Plan Ilimitado',  'Acceso permanente al módulo seleccionado',  0, 250.00, 4);

-- 2. Extender business_modules con referencia a plan y estado explícito
ALTER TABLE business_modules
    ADD COLUMN plan_id BIGINT NULL AFTER module_id,
    ADD COLUMN status  VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' COMMENT 'ACTIVO, SUSPENDIDO, VENCIDO, PENDIENTE' AFTER active,
    ADD CONSTRAINT fk_bm_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans (id) ON DELETE SET NULL;

-- 3. Tabla de pagos
CREATE TABLE IF NOT EXISTS payments (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    business_id         BIGINT         NOT NULL,
    business_module_id  BIGINT         NULL COMMENT 'Suscripción asociada (puede ser NULL para pagos generales)',
    plan_id             BIGINT         NULL,
    amount              DECIMAL(10,2)  NOT NULL,
    currency            VARCHAR(10)    NOT NULL DEFAULT 'USD',
    payment_method      VARCHAR(30)    NOT NULL DEFAULT 'TRANSFERENCIA' COMMENT 'TRANSFERENCIA, TARJETA, EFECTIVO, OTRO',
    payment_status      VARCHAR(20)    NOT NULL DEFAULT 'PENDIENTE' COMMENT 'PENDIENTE, CONFIRMADO, RECHAZADO',
    payment_date        DATETIME       NULL COMMENT 'Fecha en que se realizó el pago',
    reference_number    VARCHAR(100)   NULL COMMENT 'Número de comprobante/referencia',
    notes               VARCHAR(500)   NULL,
    confirmed_by        BIGINT         NULL COMMENT 'ID del Super Admin que confirmó',
    confirmed_at        DATETIME       NULL,
    created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_pay_business        FOREIGN KEY (business_id)        REFERENCES businesses (id) ON DELETE CASCADE,
    CONSTRAINT fk_pay_business_module FOREIGN KEY (business_module_id) REFERENCES business_modules (id) ON DELETE SET NULL,
    CONSTRAINT fk_pay_plan            FOREIGN KEY (plan_id)            REFERENCES subscription_plans (id) ON DELETE SET NULL,
    CONSTRAINT fk_pay_confirmed_by    FOREIGN KEY (confirmed_by)       REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Rol de empleado
INSERT IGNORE INTO roles (name, description, created_at, updated_at) VALUES
('ROLE_EMPLOYEE', 'Empleado de empresa - acceso limitado a su información personal', NOW(), NOW());

-- 5. Vincular empleados con cuentas de usuario (login por cédula)
ALTER TABLE business_employees
    ADD COLUMN user_id BIGINT NULL AFTER employee_id,
    ADD CONSTRAINT fk_be_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;

-- Índices para rendimiento
CREATE INDEX idx_payments_business ON payments (business_id);
CREATE INDEX idx_payments_status ON payments (payment_status);
CREATE INDEX idx_bm_status ON business_modules (status);
CREATE INDEX idx_be_user ON business_employees (user_id);
