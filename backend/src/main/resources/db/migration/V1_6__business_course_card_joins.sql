-- Join table for Business <-> CourseCertification
CREATE TABLE IF NOT EXISTS business_course_certification (
  business_id BIGINT NOT NULL,
  course_certification_id BIGINT NOT NULL,
  PRIMARY KEY (business_id, course_certification_id),
  CONSTRAINT fk_bcc_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_bcc_course FOREIGN KEY (course_certification_id) REFERENCES course_certifications(id) ON DELETE CASCADE
);

-- Join table for Business <-> CardCatalog
CREATE TABLE IF NOT EXISTS business_card (
  business_id BIGINT NOT NULL,
  card_id BIGINT NOT NULL,
  PRIMARY KEY (business_id, card_id),
  CONSTRAINT fk_bc_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_bc_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);
