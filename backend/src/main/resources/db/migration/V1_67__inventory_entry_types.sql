-- Catálogo global Tipo de Entrada + asignación por empresa (sin código)
CREATE TABLE IF NOT EXISTS inventory_entry_types (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL,
    description VARCHAR(255),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_inventory_entry_types_name_ci
    ON inventory_entry_types (LOWER(TRIM(name)));

INSERT INTO inventory_entry_types (name, description, active)
SELECT v.name, v.description, TRUE
FROM (VALUES
    ('Compra', 'Compra a proveedor'),
    ('Devolución', 'Devolución de trabajador o cliente'),
    ('Transferencia', 'Transferencia de otra bodega'),
    ('Ajuste', 'Ajuste de inventario (inventario físico)'),
    ('Donación', 'Donación recibida')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM inventory_entry_types t WHERE LOWER(TRIM(t.name)) = LOWER(TRIM(v.name)));

CREATE TABLE IF NOT EXISTS business_inventory_entry_type (
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    inventory_entry_type_id BIGINT NOT NULL REFERENCES inventory_entry_types(id) ON DELETE CASCADE,
    PRIMARY KEY (business_id, inventory_entry_type_id)
);
