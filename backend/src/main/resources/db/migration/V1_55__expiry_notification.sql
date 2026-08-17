ALTER TABLE businesses ADD COLUMN IF NOT EXISTS expiry_notification_config TEXT;

CREATE TABLE IF NOT EXISTS expiry_alert_sent (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES businesses(id),
    source_type VARCHAR(40) NOT NULL,
    source_id BIGINT NOT NULL,
    threshold_days INTEGER NOT NULL,
    expiry_date DATE,
    sent_at TIMESTAMP,
    CONSTRAINT uk_expiry_alert_sent UNIQUE (business_id, source_type, source_id, threshold_days)
);
