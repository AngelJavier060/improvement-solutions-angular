-- Matriz de capacidades operativas por usuario
CREATE TABLE IF NOT EXISTS user_operational_capabilities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    can_view BOOLEAN NOT NULL DEFAULT TRUE,
    can_download BOOLEAN NOT NULL DEFAULT TRUE,
    can_create BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    can_upload BOOLEAN NOT NULL DEFAULT FALSE,
    can_overtime BOOLEAN NOT NULL DEFAULT FALSE,
    can_vacations BOOLEAN NOT NULL DEFAULT FALSE,
    can_time_off BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

ALTER TABLE user_operational_capabilities ADD COLUMN IF NOT EXISTS can_overtime BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE user_operational_capabilities ADD COLUMN IF NOT EXISTS can_vacations BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE user_operational_capabilities ADD COLUMN IF NOT EXISTS can_time_off BOOLEAN NOT NULL DEFAULT FALSE;
