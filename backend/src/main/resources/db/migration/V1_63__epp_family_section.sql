-- Catálogo global admin: Equipo de Protección Personal (Familia / Sección)
CREATE TABLE IF NOT EXISTS epp_families (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL,
    description VARCHAR(255),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_epp_families_name_ci
    ON epp_families (LOWER(TRIM(name)));

CREATE TABLE IF NOT EXISTS epp_sections (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL,
    description VARCHAR(255),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_epp_sections_name_ci
    ON epp_sections (LOWER(TRIM(name)));

-- Semilla inicial (solo si está vacío). El código se añade/normaliza en V1_64.
INSERT INTO epp_families (name, description, active)
SELECT 'EPP', 'Equipos de protección personal', TRUE
WHERE NOT EXISTS (SELECT 1 FROM epp_families);

INSERT INTO epp_sections (name, description, active)
SELECT v.name, v.description, TRUE
FROM (VALUES
    ('Casco', 'Protección craneal'),
    ('Pantalón', 'Prenda inferior de trabajo'),
    ('Camisa', 'Prenda superior de trabajo'),
    ('Overol', 'Traje de protección completo'),
    ('Guantes', 'Protección de manos'),
    ('Botas', 'Calzado de seguridad'),
    ('Respirador', 'Protección respiratoria'),
    ('Arnés', 'Protección contra caídas'),
    ('Otro EPP', 'Otros elementos de protección')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM epp_sections);
