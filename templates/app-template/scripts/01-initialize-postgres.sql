-- Set timezone to UTC
SET timezone = 'UTC';

-- Create ltree extension
CREATE EXTENSION IF NOT EXISTS ltree;

-- Create e2e_test database
CREATE DATABASE e2e_test;

-- Logging message for confirmation
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed:';
    RAISE NOTICE '- Timezone set to UTC';
    RAISE NOTICE '- ltree extension installed';
END $$;
