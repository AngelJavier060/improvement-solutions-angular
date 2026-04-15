-- Eliminar días de planilla posteriores a la fecha de salida (inconsistencias / proyección)
DELETE FROM employee_work_days ewd
USING business_employees be
WHERE ewd.employee_id = be.id
  AND be.active = false
  AND be.fecha_salida IS NOT NULL
  AND ewd.work_date > be.fecha_salida;
