-- Climate Data Integration - Phase 5
-- This table stores historical and forecasted climate data from ERA5

-- Drop table if it exists for fresh setup
DROP TABLE IF EXISTS climate_data CASCADE;

CREATE TABLE climate_data (
  id SERIAL PRIMARY KEY,
  location_uid VARCHAR(11) NOT NULL,
  date DATE NOT NULL,
  temperature_mean DECIMAL(5,2),  -- Celsius
  temperature_min DECIMAL(5,2),   -- Celsius
  temperature_max DECIMAL(5,2),   -- Celsius
  precipitation DECIMAL(7,2),     -- mm
  humidity DECIMAL(5,2),          -- percentage (0-100)
  wind_speed DECIMAL(5,2),        -- m/s
  source VARCHAR(50) DEFAULT 'ERA5',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(location_uid, date, source)
);

-- Create indexes for efficient querying
CREATE INDEX idx_climate_location_date ON climate_data(location_uid, date);
CREATE INDEX idx_climate_date ON climate_data(date);
CREATE INDEX idx_climate_location ON climate_data(location_uid);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_climate_data_updated_at BEFORE UPDATE
ON climate_data FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE climate_data IS 'Stores historical and forecasted climate data from ERA5 API for disease forecasting';
COMMENT ON COLUMN climate_data.location_uid IS 'References organisationunit.uid from DHIS2';
COMMENT ON COLUMN climate_data.date IS 'Date of the climate observation';
COMMENT ON COLUMN climate_data.temperature_mean IS 'Mean temperature in Celsius';
COMMENT ON COLUMN climate_data.precipitation IS 'Total precipitation in millimeters';
COMMENT ON COLUMN climate_data.humidity IS 'Relative humidity percentage (0-100)';
COMMENT ON COLUMN climate_data.source IS 'Data source identifier (ERA5, manual, etc)';
