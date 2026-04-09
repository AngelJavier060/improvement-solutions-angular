-- ══════════════════════════════════════════════════════════════════════════════
-- V1_37: Módulo Gerencias de Viaje (Control de Viajes)
-- Específico para el módulo de Seguridad Industrial
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gerencias_viajes (
    id                      BIGSERIAL PRIMARY KEY,
    business_id             BIGINT NOT NULL REFERENCES businesses(id),

    -- Datos del viaje
    fecha_hora              TIMESTAMP NOT NULL,
    conductor               VARCHAR(200) NOT NULL,
    cedula                  VARCHAR(20) NOT NULL,
    vehiculo_inicio         VARCHAR(100),
    km_inicial              DECIMAL(12,2),
    telefono                VARCHAR(30),
    cargo                   VARCHAR(150),
    area                    VARCHAR(100),
    proyecto                VARCHAR(200),
    motivo                  VARCHAR(300),
    origen                  VARCHAR(300),
    destino                 VARCHAR(300),
    fecha_salida            DATE,
    hora_salida             VARCHAR(10),

    -- Validaciones previas
    licencia_vigente        VARCHAR(20),
    manejo_defensivo        VARCHAR(20),
    inspeccion_vehiculo     VARCHAR(50),
    medios_comunicacion     VARCHAR(200),
    test_alcohol            VARCHAR(30),

    -- Pasajeros
    lleva_pasajeros         VARCHAR(10),
    pasajeros               VARCHAR(200),

    -- Vehículo y convoy
    tipo_vehiculo           VARCHAR(100),
    convoy                  VARCHAR(10),
    unidades_convoy         VARCHAR(100),

    -- Condiciones de la vía
    tipo_carretera          VARCHAR(100),
    estado_via              VARCHAR(50),
    clima                   VARCHAR(50),
    distancia               VARCHAR(50),

    -- Carga y peligros
    tipo_carga              VARCHAR(100),
    otros_peligros          VARCHAR(300),

    -- Jornada del conductor
    horas_conduccion        VARCHAR(50),
    horario_viaje           VARCHAR(50),
    descanso_conductor      VARCHAR(100),

    -- Riesgos y control
    riesgos_via             VARCHAR(500),
    medidas_control         VARCHAR(500),
    paradas_planificadas    VARCHAR(300),

    -- Km final
    km_final                DECIMAL(12,2),

    -- Estado: ACTIVO | COMPLETADO | CANCELADO
    estado                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',

    -- Auditoría
    created_by              VARCHAR(100),
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP
);

CREATE INDEX idx_gerencias_viajes_business_id   ON gerencias_viajes(business_id);
CREATE INDEX idx_gerencias_viajes_fecha_hora    ON gerencias_viajes(fecha_hora);
CREATE INDEX idx_gerencias_viajes_cedula        ON gerencias_viajes(cedula);
CREATE INDEX idx_gerencias_viajes_estado        ON gerencias_viajes(estado);
