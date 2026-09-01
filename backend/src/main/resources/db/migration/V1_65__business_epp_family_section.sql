-- Asignación por empresa de Familia / Sección (Inventario-Bodega)
CREATE TABLE IF NOT EXISTS business_epp_family (
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    epp_family_id BIGINT NOT NULL REFERENCES epp_families(id) ON DELETE CASCADE,
    PRIMARY KEY (business_id, epp_family_id)
);

CREATE TABLE IF NOT EXISTS business_epp_section (
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    epp_section_id BIGINT NOT NULL REFERENCES epp_sections(id) ON DELETE CASCADE,
    PRIMARY KEY (business_id, epp_section_id)
);

CREATE INDEX IF NOT EXISTS idx_business_epp_family_biz ON business_epp_family(business_id);
CREATE INDEX IF NOT EXISTS idx_business_epp_section_biz ON business_epp_section(business_id);
