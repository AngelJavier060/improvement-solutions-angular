-- Catálogo global Estado del EPI + asignación por empresa
CREATE TABLE IF NOT EXISTS inventory_estado_epi (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    description VARCHAR(255),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_inventory_estado_epi_name_ci
    ON inventory_estado_epi (LOWER(TRIM(name)));

INSERT INTO inventory_estado_epi (name, description, active)
SELECT v.name, v.description, TRUE
FROM (VALUES
    ('Buen estado (Solo falta de uso)', 'El EPP está en buen estado; solo falta de uso o reposición'),
    ('Desgaste normal', 'Desgaste por uso habitual'),
    ('Deteriorado / Roto', 'Mal estado de EPP / deteriorado / roto'),
    ('No presenta el equipo', 'El trabajador no presenta el equipo')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM inventory_estado_epi t WHERE LOWER(TRIM(t.name)) = LOWER(TRIM(v.name)));

CREATE TABLE IF NOT EXISTS business_inventory_estado_epi (
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    inventory_estado_epi_id BIGINT NOT NULL REFERENCES inventory_estado_epi(id) ON DELETE CASCADE,
    PRIMARY KEY (business_id, inventory_estado_epi_id)
);
