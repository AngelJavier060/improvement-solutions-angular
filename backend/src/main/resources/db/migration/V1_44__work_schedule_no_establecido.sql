-- Jornada de catálogo para empresas sin patrón configurado: registro manual de T/D en planilla.
INSERT INTO work_schedules (name, description, active, created_at, updated_at)
SELECT 'No establecido',
       'Sin patrón automático: los días T/D se registran manualmente. Puede sustituirse luego por una jornada con patrón (p. ej. 5x2).',
       TRUE,
       NOW(),
       NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM work_schedules WHERE LOWER(TRIM(name)) = 'no establecido'
);

-- Disponible en todas las empresas (lista de selección en planilla / ficha)
INSERT INTO business_work_schedule (business_id, work_schedule_id)
SELECT b.id, ws.id
FROM businesses b
CROSS JOIN work_schedules ws
WHERE LOWER(TRIM(ws.name)) = 'no establecido'
ON CONFLICT DO NOTHING;
