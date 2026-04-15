-- Fecha de salida / fin de relación laboral (planilla histórica e indicadores)
ALTER TABLE business_employees ADD COLUMN IF NOT EXISTS fecha_salida DATE;

CREATE INDEX IF NOT EXISTS idx_business_employees_fecha_salida ON business_employees (fecha_salida);

-- Retrocompatibilidad: tomar la última fecha de movimiento DEACTIVATION si existe
UPDATE business_employees be
SET fecha_salida = sub.max_ed
FROM (
    SELECT business_employee_id, MAX(effective_date) AS max_ed
    FROM employee_movements
    WHERE movement_type = 'DEACTIVATION'
    GROUP BY business_employee_id
) sub
WHERE be.id = sub.business_employee_id
  AND be.active = false
  AND be.fecha_salida IS NULL;
