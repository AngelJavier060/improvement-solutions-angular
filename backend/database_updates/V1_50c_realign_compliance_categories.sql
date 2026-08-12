-- Realinea documentación de flota con el catálogo de la empresa (nombre + categoría admin)
-- y elimina etiquetas basura como "PESOS".

-- 1) Quitar basura
DELETE FROM fleet_compliance_documents
WHERE upper(trim(type_label)) IN ('PESOS', 'PESO', 'OTRO', 'DOCUMENTO');

DELETE FROM fleet_compliance_documents c
USING fleet_vehicle_documents d
WHERE c.fleet_vehicle_document_id = d.id
  AND (
    upper(trim(c.type_label)) = 'PESOS'
    OR lower(coalesce(d.original_filename, '')) LIKE '%cedula%'
    OR lower(coalesce(d.original_filename, '')) LIKE '%cédula%'
    OR lower(coalesce(d.description, '')) = 'pesos'
  );

-- 2) Emparejar por nombre exacto (sin acentos / mayúsculas) al catálogo de la empresa
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

-- 3) Verificar distribución por grupo
SELECT doc_category, COUNT(*) AS n, string_agg(type_label, ' | ' ORDER BY type_label) AS docs
FROM fleet_compliance_documents
GROUP BY doc_category
ORDER BY doc_category;

SELECT id, type_label, doc_category, type_code, fleet_vehicle_document_id
FROM fleet_compliance_documents
ORDER BY doc_category, type_label, id;
