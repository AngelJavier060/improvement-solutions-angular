-- Recuperar documentación de cumplimiento desde PDFs ya subidos (sin borrar archivos).
-- Seguro de ejecutar varias veces: solo inserta si el PDF aún no tiene fila de compliance.

INSERT INTO fleet_compliance_documents (
    fleet_vehicle_id,
    type_code,
    type_label,
    doc_category,
    reference_id,
    issue_date,
    expiry_date,
    active,
    historic_mode,
    file_name,
    fleet_vehicle_document_id,
    created_at,
    updated_at
)
SELECT
    d.fleet_vehicle_id,
    'OTRO',
    COALESCE(
        NULLIF(TRIM(REGEXP_REPLACE(COALESCE(d.description, ''), '^Documentación:\s*', '', 'i')), ''),
        d.original_filename,
        'Documento #' || d.id
    ) AS type_label,
    CASE
        WHEN COALESCE(d.description, d.original_filename, '') ILIKE '%liberaci%'
          OR COALESCE(d.description, d.original_filename, '') ILIKE '%pcr%'
            THEN 'LIBERACIONES'
        WHEN COALESCE(d.description, d.original_filename, '') ILIKE '%informe final%'
          OR COALESCE(d.description, d.original_filename, '') ILIKE '%certific%'
            THEN 'CERTIFICACIONES'
        ELSE 'DOCUMENTOS_PRINCIPALES'
    END AS doc_category,
    'PDF-' || d.id,
    (d.created_at)::date,
    NULL,
    TRUE,
    FALSE,
    d.original_filename,
    d.id,
    COALESCE(d.created_at, NOW()),
    COALESCE(d.created_at, NOW())
FROM fleet_vehicle_documents d
WHERE NOT EXISTS (
    SELECT 1
    FROM fleet_compliance_documents c
    WHERE c.fleet_vehicle_document_id = d.id
);

-- Verificación
SELECT COUNT(*) AS compliance_rows FROM fleet_compliance_documents;
SELECT id, fleet_vehicle_id, type_label, doc_category, fleet_vehicle_document_id
FROM fleet_compliance_documents
ORDER BY id;
