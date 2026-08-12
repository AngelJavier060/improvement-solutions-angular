-- Sincroniza categoría de documentación de flota = categoría del catálogo de la empresa (admin).
-- Corrige casos como "Liberación PCR" que está en Liberaciones en admin pero aparece en Documentos legales.

\pset pager off

-- 1) Ver catálogo vs compliance (diagnóstico)
SELECT t.id, t.name, t.category AS cat_admin
FROM tipo_documento_vehiculos t
JOIN business_tipo_documento_vehiculo bt ON bt.tipo_documento_vehiculo_id = t.id
JOIN businesses b ON b.id = bt.business_id
WHERE b.ruc = '1792499038001'
  AND lower(translate(t.name, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) LIKE '%liberacion%'
ORDER BY t.name;

-- 2) Asegurar categorías en el CATÁLOGO según lo que ves en administración
UPDATE tipo_documento_vehiculos t
SET category = 'LIBERACIONES', updated_at = NOW()
WHERE lower(translate(trim(t.name), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) IN (
  'liberacion pcr',
  'liberacion shaya'
);

UPDATE tipo_documento_vehiculos t
SET category = 'CERTIFICACIONES', updated_at = NOW()
WHERE lower(translate(trim(t.name), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) IN (
  'informe final arnes y linea de vida',
  'informe final cables principal y auxiliar'
);

-- 3) Copiar categoría del catálogo → filas de la unidad (por nombre normalizado)
UPDATE fleet_compliance_documents c
SET
  type_label = t.name,
  type_code = 'tdv_' || t.id::text,
  doc_category = CASE
    WHEN t.category IN ('CERTIFICACIONES', 'LIBERACIONES', 'DOCUMENTOS_PRINCIPALES') THEN t.category
    ELSE 'DOCUMENTOS_PRINCIPALES'
  END,
  updated_at = NOW()
FROM tipo_documento_vehiculos t
JOIN business_tipo_documento_vehiculo bt ON bt.tipo_documento_vehiculo_id = t.id
JOIN businesses b ON b.id = bt.business_id
JOIN fleet_vehicles v ON v.id = c.fleet_vehicle_id AND v.business_id = b.id
WHERE lower(trim(both from translate(coalesce(c.type_label, ''), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')))
    = lower(trim(both from translate(coalesce(t.name, ''), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')));

-- 4) También por type_code tdv_{id}
UPDATE fleet_compliance_documents c
SET
  type_label = t.name,
  doc_category = CASE
    WHEN t.category IN ('CERTIFICACIONES', 'LIBERACIONES', 'DOCUMENTOS_PRINCIPALES') THEN t.category
    ELSE 'DOCUMENTOS_PRINCIPALES'
  END,
  updated_at = NOW()
FROM tipo_documento_vehiculos t
WHERE c.type_code = 'tdv_' || t.id::text;

-- 5) Resultado por grupo
SELECT doc_category, COUNT(*) n, string_agg(DISTINCT type_label, ' | ' ORDER BY type_label) docs
FROM fleet_compliance_documents c
JOIN fleet_vehicles v ON v.id = c.fleet_vehicle_id
JOIN businesses b ON b.id = v.business_id
WHERE b.ruc = '1792499038001'
GROUP BY doc_category
ORDER BY 1;
