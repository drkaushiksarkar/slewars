#!/bin/bash

# Run database migrations for the ML service
# This script applies all SQL migrations to the database

echo "Running database migrations..."
echo "================================"

# Database connection (using the same DB as quick_train.py)
DB_NAME="dhis2SierraLeoneDemo"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Error: psql command not found. Please install PostgreSQL client."
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run each migration file
echo "Applying migration: 001_create_forecast_tables.sql"
psql -d "$DB_NAME" -f "$SCRIPT_DIR/001_create_forecast_tables.sql"

if [ $? -eq 0 ]; then
    echo "✓ Successfully applied 001_create_forecast_tables.sql"
else
    echo "✗ Failed to apply 001_create_forecast_tables.sql"
    exit 1
fi

echo ""
echo "Applying migration: 001_create_climate_data_table.sql"
psql -d "$DB_NAME" -f "$SCRIPT_DIR/001_create_climate_data_table.sql"

if [ $? -eq 0 ]; then
    echo "✓ Successfully applied 001_create_climate_data_table.sql"
else
    echo "✗ Failed to apply 001_create_climate_data_table.sql"
    exit 1
fi

echo ""
echo "================================"
echo "All migrations completed successfully!"
echo ""
echo "Created tables:"
echo "  - forecasts"
echo "  - alerts"
echo "  - interventions"
echo "  - model_performance"
echo "  - climate_data"
echo ""
