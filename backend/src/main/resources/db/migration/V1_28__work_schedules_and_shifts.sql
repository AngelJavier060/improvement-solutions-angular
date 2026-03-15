-- =============================================
-- V1_28: Jornadas de Trabajo y Horarios de Trabajo
-- Global catalogs + business assignment join tables
-- =============================================

-- Tabla de Jornadas de Trabajo (catálogo global)
CREATE TABLE IF NOT EXISTS work_schedules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de Horarios de Trabajo (catálogo global)
CREATE TABLE IF NOT EXISTS work_shifts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Join table: empresa <-> jornadas
CREATE TABLE IF NOT EXISTS business_work_schedule (
    business_id BIGINT NOT NULL,
    work_schedule_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, work_schedule_id),
    CONSTRAINT fk_bws_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_bws_schedule FOREIGN KEY (work_schedule_id) REFERENCES work_schedules(id) ON DELETE CASCADE
);

-- Join table: empresa <-> horarios
CREATE TABLE IF NOT EXISTS business_work_shift (
    business_id BIGINT NOT NULL,
    work_shift_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, work_shift_id),
    CONSTRAINT fk_bwsh_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_bwsh_shift FOREIGN KEY (work_shift_id) REFERENCES work_shifts(id) ON DELETE CASCADE
);

-- Columnas en business_employees para relacionar empleado con jornada/horario
ALTER TABLE business_employees
    ADD COLUMN IF NOT EXISTS work_schedule_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS work_shift_id BIGINT NULL,
    ADD CONSTRAINT fk_be_work_schedule FOREIGN KEY (work_schedule_id) REFERENCES work_schedules(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_be_work_shift FOREIGN KEY (work_shift_id) REFERENCES work_shifts(id) ON DELETE SET NULL;
