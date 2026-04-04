-- Tablas de relación ManyToMany entre Business y entidades de Mantenimiento Automotriz

CREATE TABLE IF NOT EXISTS business_marca_vehiculo (
    business_id BIGINT NOT NULL,
    marca_vehiculo_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, marca_vehiculo_id),
    CONSTRAINT fk_bmv_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_bmv_marca FOREIGN KEY (marca_vehiculo_id) REFERENCES marca_vehiculos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_tipo_combustible (
    business_id BIGINT NOT NULL,
    tipo_combustible_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, tipo_combustible_id),
    CONSTRAINT fk_btc_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_btc_tipo FOREIGN KEY (tipo_combustible_id) REFERENCES tipo_combustibles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_color_vehiculo (
    business_id BIGINT NOT NULL,
    color_vehiculo_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, color_vehiculo_id),
    CONSTRAINT fk_bcv_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_bcv_color FOREIGN KEY (color_vehiculo_id) REFERENCES color_vehiculos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_transmision (
    business_id BIGINT NOT NULL,
    transmision_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, transmision_id),
    CONSTRAINT fk_bt_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_bt_transmision FOREIGN KEY (transmision_id) REFERENCES transmisiones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_propietario_vehiculo (
    business_id BIGINT NOT NULL,
    propietario_vehiculo_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, propietario_vehiculo_id),
    CONSTRAINT fk_bpv_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_bpv_propietario FOREIGN KEY (propietario_vehiculo_id) REFERENCES propietario_vehiculos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_tipo_documento_vehiculo (
    business_id BIGINT NOT NULL,
    tipo_documento_vehiculo_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, tipo_documento_vehiculo_id),
    CONSTRAINT fk_btdv_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_btdv_tipo FOREIGN KEY (tipo_documento_vehiculo_id) REFERENCES tipo_documento_vehiculos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_unidad_medida (
    business_id BIGINT NOT NULL,
    unidad_medida_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, unidad_medida_id),
    CONSTRAINT fk_bum_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_bum_unidad FOREIGN KEY (unidad_medida_id) REFERENCES unidad_medidas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_ubicacion_ruta (
    business_id BIGINT NOT NULL,
    ubicacion_ruta_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, ubicacion_ruta_id),
    CONSTRAINT fk_bur_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_bur_ubicacion FOREIGN KEY (ubicacion_ruta_id) REFERENCES ubicacion_rutas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_pais_origen (
    business_id BIGINT NOT NULL,
    pais_origen_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, pais_origen_id),
    CONSTRAINT fk_bpo_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_bpo_pais FOREIGN KEY (pais_origen_id) REFERENCES pais_origenes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
