# Database Configuration Quick Reference

This document explains how to configure the dashboard to work with any DHIS2 database.

## Overview

The DHIS2 Disease Forecast Dashboard connects directly to a DHIS2 PostgreSQL database. When you point it to a new database, it automatically:

1. ✅ Verifies the database is a valid DHIS2 database
2. ✅ Creates required custom tables if they don't exist
3. ✅ Starts the dashboard ready to use

## Single Point of Configuration

All database configuration is done through the `.env` file. You only need to configure **one set of credentials** (PostgreSQL).

### Required Configuration

Edit your `.env` file and set these variables:

```env
# DHIS2 Database Configuration
POSTGRES_HOST=localhost          # Database host (localhost or remote IP)
POSTGRES_PORT=5432               # Database port (usually 5432)
POSTGRES_DB=your_dhis2_db_name  # Your DHIS2 database name
POSTGRES_USER=your_username      # Database username
POSTGRES_PASSWORD=your_password  # Database password
```

### Optional Configuration

The DHIS2 API configuration is optional and only needed if you want to use the DHIS2 API instead of direct database access:

```env
# DHIS2 API Configuration (Optional - not needed for postgres data source)
DHIS2_BASE_URL=https://your-dhis2-instance.com
DHIS2_USERNAME=api_username
DHIS2_PASSWORD=api_password
```

## Switching to a New DHIS2 Database

### Step-by-Step Process

1. **Update `.env` file** with new database credentials:
   ```env
   POSTGRES_HOST=new-database-host
   POSTGRES_PORT=5432
   POSTGRES_DB=new_dhis2_database
   POSTGRES_USER=new_username
   POSTGRES_PASSWORD=new_password
   ```

2. **Start the application**:
   ```bash
   npm run dev:full
   ```

3. **That's it!** The system will automatically:
   - Connect to the new database
   - Verify it's a valid DHIS2 database
   - Create required tables (climate_data, forecasts, alerts, interventions, model_performance)
   - Start the dashboard

### What Gets Created

When connecting to a new DHIS2 database, the system creates these additional tables:

| Table | Purpose |
|-------|---------|
| `climate_data` | Stores historical and forecasted climate data |
| `forecasts` | Stores ML forecast predictions |
| `alerts` | Stores disease alert notifications |
| `interventions` | Tracks intervention activities |
| `model_performance` | Stores ML model performance metrics |

**Note**: These tables are created **in the same database** as your DHIS2 data. They do not modify any existing DHIS2 tables.

## Database Verification

The system performs automatic verification to ensure you're connecting to a valid DHIS2 database. It checks for the presence of:

- `dataelement` table
- `organisationunit` table
- `datavalue` table

If these tables don't exist, the system will display an error and refuse to start.

## Manual Database Initialization

If you want to manually initialize the database (without starting the server), run:

```bash
npm run db:init
```

This will:
- Test the database connection
- Verify it's a DHIS2 database
- Create missing tables
- Display a success message

## Connection Testing

To test your database connection before starting the application:

```bash
# Using psql
psql -h <POSTGRES_HOST> -p <POSTGRES_PORT> -U <POSTGRES_USER> -d <POSTGRES_DB>

# Example
psql -h localhost -p 5432 -U dhis -d dhis2SierraLeoneDemo
```

## Troubleshooting

### Error: "POSTGRES_DB is required"

**Cause**: The `POSTGRES_DB` variable is empty in your `.env` file.

**Solution**: Set the database name in `.env`:
```env
POSTGRES_DB=your_dhis2_database_name
```

### Error: "POSTGRES_USER is required"

**Cause**: The `POSTGRES_USER` variable is empty in your `.env` file.

**Solution**: Set the database username in `.env`:
```env
POSTGRES_USER=your_database_username
```

### Error: "POSTGRES_PASSWORD is required"

**Cause**: The `POSTGRES_PASSWORD` variable is empty in your `.env` file.

**Solution**: Set the database password in `.env`:
```env
POSTGRES_PASSWORD=your_database_password
```

### Error: "This does not appear to be a DHIS2 database"

**Cause**: The database you're connecting to doesn't have the required DHIS2 tables.

**Solution**: Ensure you're connecting to a valid DHIS2 database that has been properly initialized.

### Error: Connection timeout or connection refused

**Cause**: Cannot connect to the PostgreSQL database.

**Solution**:
1. Verify PostgreSQL is running
2. Check host and port are correct
3. Ensure database allows connections from your host
4. Check firewall settings if connecting to a remote database

## Remote Database Configuration

To connect to a remote DHIS2 database:

```env
POSTGRES_HOST=remote-server-ip-or-hostname
POSTGRES_PORT=5432
POSTGRES_DB=dhis2_database
POSTGRES_USER=remote_username
POSTGRES_PASSWORD=remote_password
```

**Important Security Considerations**:
- Ensure the remote PostgreSQL server allows connections from your IP
- Use strong passwords
- Consider using SSL connections for production
- Restrict database user permissions to only what's needed

## Environment-Specific Configuration

You can maintain different `.env` files for different environments:

```bash
# Development
.env.development

# Staging
.env.staging

# Production
.env.production
```

Copy the appropriate file to `.env` when switching environments.

## Migration Information

### From Old Configuration

If you're upgrading from an older version that used separate DHIS2 API and PostgreSQL configurations:

**Old approach** (separate configs):
```env
DHIS2_BASE_URL=https://dhis2-instance.com
DHIS2_USERNAME=admin
DHIS2_PASSWORD=district

POSTGRES_HOST=localhost
POSTGRES_DB=dhis2_db
POSTGRES_USER=dhis
POSTGRES_PASSWORD=dhis
```

**New approach** (unified):
```env
# Just use PostgreSQL credentials
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=dhis2_db
POSTGRES_USER=dhis
POSTGRES_PASSWORD=dhis

# DHIS2 API config is now optional
DASHBOARD_DATA_SOURCE=postgres
```

## Additional Resources

- [Setup Guide](./SETUP_GUIDE.md) - Complete setup instructions
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [DHIS2 Database Documentation](https://docs.dhis2.org/en/manage/performing-system-administration/dhis-core-version-master/installation.html#install_database_setup)
