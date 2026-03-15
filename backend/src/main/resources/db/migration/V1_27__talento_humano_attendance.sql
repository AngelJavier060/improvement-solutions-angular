-- =====================================================
-- V1_27: Módulo Talento Humano - Control de Asistencia
-- Tablas: work_days, overtime, vacations, permissions, incidents
-- Aislamiento multiempresa garantizado via business_id en cada tabla
-- =====================================================

-- 1. Planilla de días de trabajo (registro mensual por empleado)
CREATE TABLE IF NOT EXISTS employee_work_days (
    id            BIGSERIAL PRIMARY KEY,
    business_id   BIGINT       NOT NULL,
    employee_id   BIGINT       NOT NULL,
    work_date     DATE         NOT NULL,
    day_type      VARCHAR(10)  NOT NULL DEFAULT 'T',
    notes         VARCHAR(500),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ewd_business  FOREIGN KEY (business_id)  REFERENCES businesses(id)         ON DELETE CASCADE,
    CONSTRAINT fk_ewd_employee  FOREIGN KEY (employee_id)  REFERENCES business_employees(id)  ON DELETE CASCADE,
    CONSTRAINT uq_ewd_emp_date  UNIQUE (employee_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_ewd_business     ON employee_work_days (business_id);
CREATE INDEX IF NOT EXISTS idx_ewd_employee     ON employee_work_days (employee_id);
CREATE INDEX IF NOT EXISTS idx_ewd_date         ON employee_work_days (work_date);
CREATE INDEX IF NOT EXISTS idx_ewd_biz_month    ON employee_work_days (business_id, work_date);

-- 2. Horas extraordinarias
CREATE TABLE IF NOT EXISTS employee_overtime (
    id            BIGSERIAL PRIMARY KEY,
    business_id   BIGINT       NOT NULL,
    employee_id   BIGINT       NOT NULL,
    overtime_date DATE         NOT NULL,
    start_time    TIME         NOT NULL,
    end_time      TIME         NOT NULL,
    hours_total   NUMERIC(5,2) GENERATED ALWAYS AS (
                      EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0
                  ) STORED,
    reason        VARCHAR(500) NOT NULL,
    notes         VARCHAR(1000),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_eot_business  FOREIGN KEY (business_id)  REFERENCES businesses(id)         ON DELETE CASCADE,
    CONSTRAINT fk_eot_employee  FOREIGN KEY (employee_id)  REFERENCES business_employees(id)  ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_eot_business     ON employee_overtime (business_id);
CREATE INDEX IF NOT EXISTS idx_eot_employee     ON employee_overtime (employee_id);
CREATE INDEX IF NOT EXISTS idx_eot_date         ON employee_overtime (overtime_date);

-- 3. Vacaciones anuales
CREATE TABLE IF NOT EXISTS employee_vacations (
    id              BIGSERIAL PRIMARY KEY,
    business_id     BIGINT       NOT NULL,
    employee_id     BIGINT       NOT NULL,
    start_date      DATE         NOT NULL,
    end_date        DATE         NOT NULL,
    days_taken      INT          GENERATED ALWAYS AS (
                        (end_date - start_date + 1)
                    ) STORED,
    days_accumulated INT         NOT NULL DEFAULT 0,
    notes           VARCHAR(1000),
    status          VARCHAR(20)  NOT NULL DEFAULT 'APROBADO',
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_evac_business  FOREIGN KEY (business_id)  REFERENCES businesses(id)         ON DELETE CASCADE,
    CONSTRAINT fk_evac_employee  FOREIGN KEY (employee_id)  REFERENCES business_employees(id)  ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evac_business    ON employee_vacations (business_id);
CREATE INDEX IF NOT EXISTS idx_evac_employee    ON employee_vacations (employee_id);

-- 4. Permisos laborales
CREATE TABLE IF NOT EXISTS employee_permissions (
    id              BIGSERIAL PRIMARY KEY,
    business_id     BIGINT       NOT NULL,
    employee_id     BIGINT       NOT NULL,
    permission_date DATE         NOT NULL,
    permission_type VARCHAR(50)  NOT NULL,
    hours_requested NUMERIC(4,2) NOT NULL DEFAULT 0,
    reason          VARCHAR(500) NOT NULL,
    notes           VARCHAR(1000),
    status          VARCHAR(20)  NOT NULL DEFAULT 'APROBADO',
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_eperm_business  FOREIGN KEY (business_id)  REFERENCES businesses(id)         ON DELETE CASCADE,
    CONSTRAINT fk_eperm_employee  FOREIGN KEY (employee_id)  REFERENCES business_employees(id)  ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_eperm_business   ON employee_permissions (business_id);
CREATE INDEX IF NOT EXISTS idx_eperm_employee   ON employee_permissions (employee_id);
CREATE INDEX IF NOT EXISTS idx_eperm_date       ON employee_permissions (permission_date);

-- 5. Accidentes / Incidentes laborales
CREATE TABLE IF NOT EXISTS employee_incidents (
    id              BIGSERIAL PRIMARY KEY,
    business_id     BIGINT       NOT NULL,
    employee_id     BIGINT       NOT NULL,
    incident_date   DATE         NOT NULL,
    incident_time   TIME,
    incident_type   VARCHAR(30)  NOT NULL DEFAULT 'INCIDENTE',
    description     TEXT         NOT NULL,
    location        VARCHAR(255),
    severity        VARCHAR(20)  NOT NULL DEFAULT 'LEVE',
    notes           VARCHAR(1000),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_einc_business  FOREIGN KEY (business_id)  REFERENCES businesses(id)         ON DELETE CASCADE,
    CONSTRAINT fk_einc_employee  FOREIGN KEY (employee_id)  REFERENCES business_employees(id)  ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_einc_business    ON employee_incidents (business_id);
CREATE INDEX IF NOT EXISTS idx_einc_employee    ON employee_incidents (employee_id);
CREATE INDEX IF NOT EXISTS idx_einc_date        ON employee_incidents (incident_date);
