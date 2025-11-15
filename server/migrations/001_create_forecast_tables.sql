-- Migration: Create forecasting and model performance tables
-- Date: 2025-11-15
-- Description: Tables for disease forecasting, model performance tracking, and alerts

-- Forecasts table
CREATE TABLE IF NOT EXISTS forecasts (
  id SERIAL PRIMARY KEY,
  disease VARCHAR(100) NOT NULL,
  location_uid VARCHAR(11) NOT NULL,
  forecast_date DATE NOT NULL,
  target_date DATE NOT NULL,
  predicted_cases INTEGER,
  lower_bound INTEGER,
  upper_bound INTEGER,
  confidence DECIMAL(5,4),
  risk_level VARCHAR(20),
  risk_score DECIMAL(5,4),
  model_version VARCHAR(50),
  contributing_factors JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(disease, location_uid, forecast_date, target_date)
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  disease VARCHAR(100) NOT NULL,
  location_uid VARCHAR(11) NOT NULL,
  alert_date DATE NOT NULL,
  severity VARCHAR(20), -- CRITICAL, WARNING, NORMAL
  cases INTEGER,
  threshold INTEGER,
  percent_above_threshold DECIMAL(7,2),
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, RESOLVED, DISMISSED
  resolved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Interventions table
CREATE TABLE IF NOT EXISTS interventions (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER REFERENCES alerts(id),
  intervention_type VARCHAR(100),
  location_uid VARCHAR(11),
  start_date DATE,
  end_date DATE,
  target_population INTEGER,
  reached_population INTEGER,
  cost DECIMAL(12,2),
  status VARCHAR(20), -- PLANNED, ONGOING, COMPLETED, CANCELLED
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Model performance tracking
CREATE TABLE IF NOT EXISTS model_performance (
  id SERIAL PRIMARY KEY,
  disease VARCHAR(100),
  location_uid VARCHAR(11),
  model_type VARCHAR(50),
  model_version VARCHAR(50),
  evaluation_date DATE,
  mae DECIMAL(10,2),
  rmse DECIMAL(10,2),
  mape DECIMAL(10,4),
  r_squared DECIMAL(10,4),
  training_data_size INTEGER,
  test_data_size INTEGER,
  metrics JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forecasts_disease_location ON forecasts(disease, location_uid, target_date);
CREATE INDEX IF NOT EXISTS idx_forecasts_target_date ON forecasts(target_date);
CREATE INDEX IF NOT EXISTS idx_forecasts_forecast_date ON forecasts(forecast_date);

CREATE INDEX IF NOT EXISTS idx_alerts_disease_location ON alerts(disease, location_uid, alert_date);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

CREATE INDEX IF NOT EXISTS idx_interventions_alert ON interventions(alert_id);
CREATE INDEX IF NOT EXISTS idx_interventions_location ON interventions(location_uid);

CREATE INDEX IF NOT EXISTS idx_model_performance_disease ON model_performance(disease, evaluation_date);
CREATE INDEX IF NOT EXISTS idx_model_performance_location ON model_performance(location_uid);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_forecasts_updated_at BEFORE UPDATE ON forecasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON interventions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
