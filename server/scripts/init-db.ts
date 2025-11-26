import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
loadEnv();

interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

// Get database configuration from environment
function getDbConfig(): DbConfig {
  const config = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || '',
    user: process.env.POSTGRES_USER || '',
    password: process.env.POSTGRES_PASSWORD || ''
  };

  // Validate required fields
  if (!config.database) {
    throw new Error('POSTGRES_DB is required in .env file');
  }
  if (!config.user) {
    throw new Error('POSTGRES_USER is required in .env file');
  }
  if (!config.password) {
    throw new Error('POSTGRES_PASSWORD is required in .env file');
  }

  return config;
}

// Check if a table exists in the database
async function tableExists(pool: Pool, tableName: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    )`,
    [tableName]
  );
  return result.rows[0].exists;
}

// Check if DHIS2 tables exist (to verify this is a DHIS2 database)
async function isDhis2Database(pool: Pool): Promise<boolean> {
  const dhis2Tables = ['dataelement', 'organisationunit', 'datavalue'];

  for (const table of dhis2Tables) {
    const exists = await tableExists(pool, table);
    if (!exists) {
      return false;
    }
  }

  return true;
}

// Run a migration SQL file
async function runMigration(pool: Pool, migrationPath: string, migrationName: string): Promise<void> {
  console.log(`  Running migration: ${migrationName}...`);

  try {
    const sql = readFileSync(migrationPath, 'utf-8');
    await pool.query(sql);
    console.log(`  ✓ Migration ${migrationName} completed successfully`);
  } catch (error: any) {
    console.error(`  ✗ Migration ${migrationName} failed:`, error.message);
    throw error;
  }
}

// Main initialization function
async function initializeDatabase(): Promise<void> {
  console.log('\n🔧 Initializing database...\n');

  let pool: Pool | null = null;

  try {
    // Get database configuration
    const config = getDbConfig();
    console.log(`📊 Connecting to database: ${config.database} on ${config.host}:${config.port}`);
    console.log(`👤 Using user: ${config.user}\n`);

    // Create connection pool
    pool = new Pool({
      ...config,
      max: 5,
      connectionTimeoutMillis: 5000
    });

    // Test connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✓ Database connection successful\n');

    // Verify this is a DHIS2 database
    console.log('🔍 Verifying DHIS2 database...');
    const isDhis2 = await isDhis2Database(pool);

    if (!isDhis2) {
      throw new Error(
        'This does not appear to be a DHIS2 database. ' +
        'Required tables (dataelement, organisationunit, datavalue) not found. ' +
        'Please ensure you are connecting to a valid DHIS2 database.'
      );
    }
    console.log('✓ DHIS2 database verified\n');

    // Check and create required tables
    console.log('📋 Checking required tables...\n');

    const requiredTables = [
      { name: 'climate_data', migration: '001_create_climate_data_table.sql' },
      { name: 'forecasts', migration: '001_create_forecast_tables.sql' }
    ];

    for (const table of requiredTables) {
      const exists = await tableExists(pool, table.name);

      if (exists) {
        console.log(`  ✓ Table '${table.name}' already exists`);
      } else {
        console.log(`  ⚠ Table '${table.name}' does not exist`);
        const migrationPath = join(__dirname, '..', 'migrations', table.migration);
        await runMigration(pool, migrationPath, table.migration);
      }
    }

    // Also check for related tables created by forecast migration
    const forecastRelatedTables = ['alerts', 'interventions', 'model_performance'];
    for (const tableName of forecastRelatedTables) {
      const exists = await tableExists(pool, tableName);
      if (exists) {
        console.log(`  ✓ Table '${tableName}' exists`);
      }
    }

    console.log('\n✅ Database initialization completed successfully!\n');

  } catch (error: any) {
    console.error('\n❌ Database initialization failed:', error.message);
    console.error('\nPlease check your database configuration in the .env file:');
    console.error('  - POSTGRES_HOST');
    console.error('  - POSTGRES_PORT');
    console.error('  - POSTGRES_DB (must be a DHIS2 database)');
    console.error('  - POSTGRES_USER');
    console.error('  - POSTGRES_PASSWORD\n');
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run initialization
initializeDatabase();
