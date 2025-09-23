-- Migration script to support multiple contractor companies per business
-- This changes the relationship from @ManyToOne to @ManyToMany
-- Use improvement_solutions database
USE improvement_solutions;

-- Create the junction table for business-contractor companies many-to-many relationship
CREATE TABLE IF NOT EXISTS business_contractor_companies (
    business_id BIGINT NOT NULL,
    contractor_company_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, contractor_company_id),
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (contractor_company_id) REFERENCES contractor_companies(id) ON DELETE CASCADE
);

-- Check existing data before migration
SELECT 'Businesses with contractor companies before migration:' as info;
SELECT id, name, contractor_company_id FROM businesses WHERE contractor_company_id IS NOT NULL;

-- Migrate existing data from businesses.contractor_company_id to the junction table
-- Only migrate if contractor_company_id is not null
INSERT IGNORE INTO business_contractor_companies (business_id, contractor_company_id)
SELECT id, contractor_company_id
FROM businesses
WHERE contractor_company_id IS NOT NULL;

-- Verify migration
SELECT 'Data in junction table after migration:' as info;
SELECT bcc.business_id, b.name as business_name, cc.name as contractor_company_name
FROM business_contractor_companies bcc
JOIN businesses b ON bcc.business_id = b.id
JOIN contractor_companies cc ON bcc.contractor_company_id = cc.id;

-- Note: We keep the contractor_company_id column for backward compatibility
-- It will be used by the @Transient methods in the Business entity
-- The column can be removed in a future migration once all code is updated

SELECT 'Migration completed successfully' as result;