-- Populate entity_aliases table with common B2B technology and company aliases
-- Run this against your Supabase database to enable alias resolution

-- Clear existing aliases (optional - remove if you want to keep existing data)
-- DELETE FROM entity_aliases;

-- Microsoft Products
INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Microsoft 365', ARRAY['m365', 'office 365', 'o365', 'microsoft office'], 'product', 'productivity')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Microsoft Azure', ARRAY['azure', 'ms azure'], 'product', 'cloud')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Microsoft Teams', ARRAY['ms teams', 'teams'], 'product', 'collaboration')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- Amazon/AWS Products
INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Amazon Web Services', ARRAY['aws', 'amazon aws'], 'product', 'cloud')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Amazon EC2', ARRAY['ec2', 'elastic compute cloud'], 'product', 'cloud')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Amazon S3', ARRAY['s3', 'simple storage service'], 'product', 'cloud')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- Google Products
INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Google Cloud Platform', ARRAY['gcp', 'google cloud'], 'product', 'cloud')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Google Workspace', ARRAY['g suite', 'gsuite', 'google apps'], 'product', 'productivity')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- Salesforce Products
INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Salesforce', ARRAY['sfdc', 'sales force', 'sf'], 'company', 'crm')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Salesforce Marketing Cloud', ARRAY['sfmc', 'marketing cloud'], 'product', 'marketing')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- Oracle Products
INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Oracle Database', ARRAY['oracle db', 'oracle rdbms'], 'product', 'database')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- SAP Products
INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('SAP ERP', ARRAY['sap', 'sap erp'], 'product', 'erp')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- Security Products
INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Zscaler Internet Access', ARRAY['zia', 'zscaler zia'], 'product', 'security')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Zscaler Private Access', ARRAY['zpa', 'zscaler zpa'], 'product', 'security')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Palo Alto Networks', ARRAY['pan', 'palo alto', 'panw'], 'company', 'security')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('CrowdStrike Falcon', ARRAY['crowdstrike', 'falcon'], 'product', 'security')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- Collaboration Tools
INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Slack', ARRAY['slack workspace'], 'product', 'collaboration')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Zoom', ARRAY['zoom meetings', 'zoom video'], 'product', 'collaboration')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- Development Tools
INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('GitHub', ARRAY['gh', 'github.com'], 'product', 'development')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('GitLab', ARRAY['gitlab.com'], 'product', 'development')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- Data & Analytics
INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Snowflake', ARRAY['snowflake data cloud'], 'product', 'data')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Databricks', ARRAY['databricks lakehouse'], 'product', 'data')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Tableau', ARRAY['tableau desktop', 'tableau server'], 'product', 'analytics')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- Common Abbreviations
INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Customer Relationship Management', ARRAY['crm'], 'concept', 'business')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Enterprise Resource Planning', ARRAY['erp'], 'concept', 'business')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Software as a Service', ARRAY['saas'], 'concept', 'business')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

INSERT INTO entity_aliases (canonical, aliases, entity_type, category) VALUES
  ('Application Programming Interface', ARRAY['api'], 'concept', 'technology')
ON CONFLICT (canonical) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  updated_at = NOW();

-- Verify the data was inserted
SELECT canonical, aliases, entity_type, category
FROM entity_aliases
ORDER BY category, canonical;

-- Count by category
SELECT category, COUNT(*) as count
FROM entity_aliases
GROUP BY category
ORDER BY count DESC;
