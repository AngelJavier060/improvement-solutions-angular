-- Catálogo global Tipo de Acontecimiento + asignación por empresa
CREATE TABLE IF NOT EXISTS inventory_acontecimiento_types (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL,
    description VARCHAR(255),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_inventory_acontecimiento_types_name_ci
    ON inventory_acontecimiento_types (LOWER(TRIM(name)));

INSERT INTO inventory_acontecimiento_types (name, description, active)
SELECT v.name, v.description, TRUE
FROM (VALUES
    ('Solicitud de EPP', 'Pedido o reposición de equipo de protección personal'),
    ('Incumplimiento de uso', 'Trabajador no usa el EPP correctamente'),
    ('Deterioro prematuro', 'EPP en mal estado / deterioro prematuro'),
    ('Pérdida de equipo', 'Extravío o pérdida del EPP asignado'),
    ('Inspección de rutina', 'Revisión periódica del estado del EPP')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM inventory_acontecimiento_types t WHERE LOWER(TRIM(t.name)) = LOWER(TRIM(v.name)));

CREATE TABLE IF NOT EXISTS business_inventory_acontecimiento_type (
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    inventory_acontecimiento_type_id BIGINT NOT NULL REFERENCES inventory_acontecimiento_types(id) ON DELETE CASCADE,
    PRIMARY KEY (business_id, inventory_acontecimiento_type_id)
);
