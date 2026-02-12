-- ============================================================
-- Repair: Ensure system_modules data exists
-- Uses INSERT IGNORE to avoid duplicates if data already exists
-- ============================================================
INSERT IGNORE INTO system_modules (code, name, description, icon, color, display_order, active) VALUES
('SEGURIDAD_INDUSTRIAL', 'Seguridad y Salud en el Trabajo', 'Gestión de seguridad industrial, matriz legal y cumplimiento normativo', 'fas fa-hard-hat', '#e74c3c', 1, TRUE),
('TALENTO_HUMANO',       'Talento Humano',                  'Gestión de empleados, contratos, documentos y certificaciones',          'fas fa-users',    '#3498db', 2, TRUE),
('CALIDAD',              'Calidad',                         'Gestión de calidad, auditorías y mejora continua',                       'fas fa-check-circle', '#27ae60', 3, TRUE),
('INVENTARIO',           'Inventario',                      'Control de inventario, entradas, salidas y kardex',                      'fas fa-boxes',    '#f39c12', 4, TRUE);
