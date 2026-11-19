CREATE TABLE IF NOT EXISTS aula_curso (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    titulo VARCHAR(180) NOT NULL,
    area VARCHAR(80) NOT NULL,
    audiencia VARCHAR(40) NOT NULL,
    audiencia_detalle VARCHAR(160),
    fecha_inicio DATE,
    fecha_limite DATE,
    hora_reunion TIMESTAMP,
    cupo INTEGER,
    en_vivo BOOLEAN NOT NULL DEFAULT FALSE,
    sala VARCHAR(120),
    video_path VARCHAR(255),
    video_nombre VARCHAR(180),
    material_path VARCHAR(255),
    material_nombre VARCHAR(180),
    nota_minima INTEGER NOT NULL DEFAULT 80,
    intentos INTEGER NOT NULL DEFAULT 2,
    por_trabajador INTEGER NOT NULL DEFAULT 5,
    estado VARCHAR(20) NOT NULL DEFAULT 'PUBLICADO',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_aula_curso_business ON aula_curso (business_id);

CREATE TABLE IF NOT EXISTS aula_pregunta (
    id BIGSERIAL PRIMARY KEY,
    curso_id BIGINT NOT NULL REFERENCES aula_curso (id) ON DELETE CASCADE,
    texto VARCHAR(500) NOT NULL,
    orden INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS aula_opcion (
    id BIGSERIAL PRIMARY KEY,
    pregunta_id BIGINT NOT NULL REFERENCES aula_pregunta (id) ON DELETE CASCADE,
    texto VARCHAR(300) NOT NULL,
    correcta BOOLEAN NOT NULL DEFAULT FALSE,
    orden INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS aula_resultado (
    id BIGSERIAL PRIMARY KEY,
    curso_id BIGINT NOT NULL REFERENCES aula_curso (id) ON DELETE CASCADE,
    employee_id BIGINT NOT NULL,
    preguntas_json TEXT,
    respuestas_json TEXT,
    nota INTEGER,
    intentos_usados INTEGER NOT NULL DEFAULT 0,
    estado VARCHAR(30) NOT NULL,
    video_visto BOOLEAN NOT NULL DEFAULT FALSE,
    ingreso_sala BOOLEAN NOT NULL DEFAULT FALSE,
    fecha TIMESTAMP,
    UNIQUE (curso_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_aula_resultado_curso ON aula_resultado (curso_id);
