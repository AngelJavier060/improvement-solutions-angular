-- Create table for course certifications
CREATE TABLE IF NOT EXISTS course_certifications (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at DATETIME,
  updated_at DATETIME
);

-- Create table for cards catalog
CREATE TABLE IF NOT EXISTS cards (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at DATETIME,
  updated_at DATETIME
);
