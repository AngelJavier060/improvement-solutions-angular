-- ══════════════════════════════════════════════════════════════════════════════
-- V1_29: Módulo Accidentes / Incidentes (Alerta Temprana)
-- Específico para el módulo de Seguridad Industrial
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS business_incidents (
    id                      BIGSERIAL PRIMARY KEY,
    business_id             BIGINT NOT NULL REFERENCES businesses(id),

    -- Sección 1: Datos Específicos
    affectation_type        VARCHAR(60),
    incident_date           DATE NOT NULL,
    incident_time           TIME,
    location                VARCHAR(255),
    personnel_type          VARCHAR(20),
    company_name            VARCHAR(200),

    -- Sección 2: Información del Personal
    person_name             VARCHAR(200),
    person_cedula           VARCHAR(20),
    person_position         VARCHAR(100),
    person_area             VARCHAR(100),
    person_age              INT,
    person_gender           VARCHAR(20),
    person_shift            VARCHAR(30),
    person_experience       VARCHAR(80),

    -- Sección 3: Detalles del Evento
    title                   VARCHAR(300) NOT NULL,
    description             TEXT NOT NULL,
    event_classification    VARCHAR(80),

    -- Sección 4: Acciones de Mitigación Inmediata
    mitigation_actions      TEXT,

    -- Sección 5: Nivel de Investigación y Criterios (booleans)
    is_high_potential       BOOLEAN DEFAULT FALSE,
    is_critical_enap        BOOLEAN DEFAULT FALSE,
    is_fatal                BOOLEAN DEFAULT FALSE,
    requires_resuscitation  BOOLEAN DEFAULT FALSE,
    requires_rescue         BOOLEAN DEFAULT FALSE,
    fall_over_2m            BOOLEAN DEFAULT FALSE,
    involves_amputation     BOOLEAN DEFAULT FALSE,
    affects_normal_task     BOOLEAN DEFAULT FALSE,
    is_collective           BOOLEAN DEFAULT FALSE,

    life_rule_violated      VARCHAR(100),
    api_level               VARCHAR(20),
    has_occurred_before     VARCHAR(200),
    investigation_level     VARCHAR(80),

    -- Sección 6: Comentarios y Evidencia
    preliminary_comments    TEXT,
    control_measures        TEXT,

    -- Estado: ABIERTO | EN_REVISION | CERRADO
    status                  VARCHAR(20) NOT NULL DEFAULT 'ABIERTO',

    -- Auditoría
    created_by              VARCHAR(100),
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP
);

CREATE INDEX idx_business_incidents_business_id   ON business_incidents(business_id);
CREATE INDEX idx_business_incidents_incident_date ON business_incidents(incident_date);
CREATE INDEX idx_business_incidents_status        ON business_incidents(status);
