-- Add active flags to courses and cards for historical handling

ALTER TABLE business_employee_courses
  ADD COLUMN IF NOT EXISTS active TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE business_employee_cards
  ADD COLUMN IF NOT EXISTS active TINYINT(1) NOT NULL DEFAULT 1;
