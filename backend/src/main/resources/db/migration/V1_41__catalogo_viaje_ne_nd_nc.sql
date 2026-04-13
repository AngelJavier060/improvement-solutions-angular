-- Catálogos de viaje: reemplazar nivel_parametro único por ne_nivel / nd_nivel / nc_nivel (PostgreSQL).
-- Migra el valor previo a ne_nivel_id cuando existía nivel_parametro_id.

DO $$
BEGIN
  -- condicion_climaticas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'condicion_climaticas' AND column_name = 'ne_nivel_id') THEN
    ALTER TABLE condicion_climaticas ADD COLUMN ne_nivel_id BIGINT;
    ALTER TABLE condicion_climaticas ADD COLUMN nd_nivel_id BIGINT;
    ALTER TABLE condicion_climaticas ADD COLUMN nc_nivel_id BIGINT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'condicion_climaticas' AND column_name = 'nivel_parametro_id') THEN
    UPDATE condicion_climaticas SET ne_nivel_id = COALESCE(ne_nivel_id, nivel_parametro_id) WHERE nivel_parametro_id IS NOT NULL;
    ALTER TABLE condicion_climaticas DROP COLUMN nivel_parametro_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'distancia_recorrer') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'distancia_recorrer' AND column_name = 'ne_nivel_id') THEN
      ALTER TABLE distancia_recorrer ADD COLUMN ne_nivel_id BIGINT;
      ALTER TABLE distancia_recorrer ADD COLUMN nd_nivel_id BIGINT;
      ALTER TABLE distancia_recorrer ADD COLUMN nc_nivel_id BIGINT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'distancia_recorrer' AND column_name = 'nivel_parametro_id') THEN
      UPDATE distancia_recorrer SET ne_nivel_id = COALESCE(ne_nivel_id, nivel_parametro_id) WHERE nivel_parametro_id IS NOT NULL;
      ALTER TABLE distancia_recorrer DROP COLUMN nivel_parametro_id;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'horario_circulaciones' AND column_name = 'ne_nivel_id') THEN
    ALTER TABLE horario_circulaciones ADD COLUMN ne_nivel_id BIGINT;
    ALTER TABLE horario_circulaciones ADD COLUMN nd_nivel_id BIGINT;
    ALTER TABLE horario_circulaciones ADD COLUMN nc_nivel_id BIGINT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'horario_circulaciones' AND column_name = 'nivel_parametro_id') THEN
    UPDATE horario_circulaciones SET ne_nivel_id = COALESCE(ne_nivel_id, nivel_parametro_id) WHERE nivel_parametro_id IS NOT NULL;
    ALTER TABLE horario_circulaciones DROP COLUMN nivel_parametro_id;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'estado_carreteras' AND column_name = 'ne_nivel_id') THEN
    ALTER TABLE estado_carreteras ADD COLUMN ne_nivel_id BIGINT;
    ALTER TABLE estado_carreteras ADD COLUMN nd_nivel_id BIGINT;
    ALTER TABLE estado_carreteras ADD COLUMN nc_nivel_id BIGINT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'estado_carreteras' AND column_name = 'nivel_parametro_id') THEN
    UPDATE estado_carreteras SET ne_nivel_id = COALESCE(ne_nivel_id, nivel_parametro_id) WHERE nivel_parametro_id IS NOT NULL;
    ALTER TABLE estado_carreteras DROP COLUMN nivel_parametro_id;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tipo_cargas' AND column_name = 'ne_nivel_id') THEN
    ALTER TABLE tipo_cargas ADD COLUMN ne_nivel_id BIGINT;
    ALTER TABLE tipo_cargas ADD COLUMN nd_nivel_id BIGINT;
    ALTER TABLE tipo_cargas ADD COLUMN nc_nivel_id BIGINT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tipo_cargas' AND column_name = 'nivel_parametro_id') THEN
    UPDATE tipo_cargas SET ne_nivel_id = COALESCE(ne_nivel_id, nivel_parametro_id) WHERE nivel_parametro_id IS NOT NULL;
    ALTER TABLE tipo_cargas DROP COLUMN nivel_parametro_id;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hora_conducciones' AND column_name = 'ne_nivel_id') THEN
    ALTER TABLE hora_conducciones ADD COLUMN ne_nivel_id BIGINT;
    ALTER TABLE hora_conducciones ADD COLUMN nd_nivel_id BIGINT;
    ALTER TABLE hora_conducciones ADD COLUMN nc_nivel_id BIGINT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hora_conducciones' AND column_name = 'nivel_parametro_id') THEN
    UPDATE hora_conducciones SET ne_nivel_id = COALESCE(ne_nivel_id, nivel_parametro_id) WHERE nivel_parametro_id IS NOT NULL;
    ALTER TABLE hora_conducciones DROP COLUMN nivel_parametro_id;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hora_descansos' AND column_name = 'ne_nivel_id') THEN
    ALTER TABLE hora_descansos ADD COLUMN ne_nivel_id BIGINT;
    ALTER TABLE hora_descansos ADD COLUMN nd_nivel_id BIGINT;
    ALTER TABLE hora_descansos ADD COLUMN nc_nivel_id BIGINT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hora_descansos' AND column_name = 'nivel_parametro_id') THEN
    UPDATE hora_descansos SET ne_nivel_id = COALESCE(ne_nivel_id, nivel_parametro_id) WHERE nivel_parametro_id IS NOT NULL;
    ALTER TABLE hora_descansos DROP COLUMN nivel_parametro_id;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'medio_comunicaciones' AND column_name = 'ne_nivel_id') THEN
    ALTER TABLE medio_comunicaciones ADD COLUMN ne_nivel_id BIGINT;
    ALTER TABLE medio_comunicaciones ADD COLUMN nd_nivel_id BIGINT;
    ALTER TABLE medio_comunicaciones ADD COLUMN nc_nivel_id BIGINT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'medio_comunicaciones' AND column_name = 'nivel_parametro_id') THEN
    UPDATE medio_comunicaciones SET ne_nivel_id = COALESCE(ne_nivel_id, nivel_parametro_id) WHERE nivel_parametro_id IS NOT NULL;
    ALTER TABLE medio_comunicaciones DROP COLUMN nivel_parametro_id;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transporta_pasajeros' AND column_name = 'ne_nivel_id') THEN
    ALTER TABLE transporta_pasajeros ADD COLUMN ne_nivel_id BIGINT;
    ALTER TABLE transporta_pasajeros ADD COLUMN nd_nivel_id BIGINT;
    ALTER TABLE transporta_pasajeros ADD COLUMN nc_nivel_id BIGINT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transporta_pasajeros' AND column_name = 'nivel_parametro_id') THEN
    UPDATE transporta_pasajeros SET ne_nivel_id = COALESCE(ne_nivel_id, nivel_parametro_id) WHERE nivel_parametro_id IS NOT NULL;
    ALTER TABLE transporta_pasajeros DROP COLUMN nivel_parametro_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tipo_vias') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tipo_vias' AND column_name = 'ne_nivel_id') THEN
      ALTER TABLE tipo_vias ADD COLUMN ne_nivel_id BIGINT;
      ALTER TABLE tipo_vias ADD COLUMN nd_nivel_id BIGINT;
      ALTER TABLE tipo_vias ADD COLUMN nc_nivel_id BIGINT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tipo_vias' AND column_name = 'nivel_parametro_id') THEN
      UPDATE tipo_vias SET ne_nivel_id = COALESCE(ne_nivel_id, nivel_parametro_id) WHERE nivel_parametro_id IS NOT NULL;
      ALTER TABLE tipo_vias DROP COLUMN nivel_parametro_id;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posibles_riesgos_via') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posibles_riesgos_via' AND column_name = 'metodologia_riesgo_id') THEN
      ALTER TABLE posibles_riesgos_via ADD COLUMN metodologia_riesgo_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posibles_riesgos_via' AND column_name = 'ne_nivel_id') THEN
      ALTER TABLE posibles_riesgos_via ADD COLUMN ne_nivel_id BIGINT;
      ALTER TABLE posibles_riesgos_via ADD COLUMN nd_nivel_id BIGINT;
      ALTER TABLE posibles_riesgos_via ADD COLUMN nc_nivel_id BIGINT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'posibles_riesgos_via' AND column_name = 'nivel_parametro_id') THEN
      UPDATE posibles_riesgos_via SET ne_nivel_id = COALESCE(ne_nivel_id, nivel_parametro_id) WHERE nivel_parametro_id IS NOT NULL;
      ALTER TABLE posibles_riesgos_via DROP COLUMN nivel_parametro_id;
    END IF;
  END IF;
END $$;
