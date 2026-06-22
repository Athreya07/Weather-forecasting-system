-- ====================================================================
-- Pune Weather Forecasting System — PostgreSQL Schema
-- ====================================================================

CREATE DATABASE pune_weather;
\c pune_weather;

-- Enable TimescaleDB extension (optional, for time-series performance)
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ── 1. Weather History ────────────────────────────────────────────
CREATE TABLE weather_history (
    id              BIGSERIAL PRIMARY KEY,
    recorded_at     TIMESTAMPTZ NOT NULL,
    location        VARCHAR(100) DEFAULT 'Pune',
    temp_c          NUMERIC(5,2) NOT NULL,
    feels_like_c    NUMERIC(5,2),
    max_temp_c      NUMERIC(5,2),
    min_temp_c      NUMERIC(5,2),
    humidity        SMALLINT CHECK (humidity BETWEEN 0 AND 100),
    pressure_hpa    SMALLINT,
    wind_speed_kmph SMALLINT,
    wind_dir_deg    SMALLINT CHECK (wind_dir_deg BETWEEN 0 AND 360),
    cloud_cover_pct SMALLINT CHECK (cloud_cover_pct BETWEEN 0 AND 100),
    visibility_km   SMALLINT,
    precip_mm       NUMERIC(6,2) DEFAULT 0,
    dew_point_c     NUMERIC(5,2),
    uv_index        SMALLINT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weather_history_recorded_at ON weather_history (recorded_at DESC);
CREATE INDEX idx_weather_history_location    ON weather_history (location);

-- ── 2. Forecast History ───────────────────────────────────────────
CREATE TABLE forecast_history (
    id              BIGSERIAL PRIMARY KEY,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    forecast_for    TIMESTAMPTZ NOT NULL,
    horizon_hours   SMALLINT NOT NULL CHECK (horizon_hours IN (1, 3, 6, 12, 24)),
    temp_predicted  NUMERIC(5,2),
    feels_predicted NUMERIC(5,2),
    rain_prob_pct   NUMERIC(5,2),
    humidity_pred   SMALLINT,
    pressure_pred   SMALLINT,
    wind_pred       SMALLINT,
    model_version   VARCHAR(50) DEFAULT 'xgboost-v1',
    -- Actuals filled in after the forecast window passes
    temp_actual     NUMERIC(5,2),
    feels_actual    NUMERIC(5,2),
    rained_actual   BOOLEAN,
    temp_error      NUMERIC(5,2) GENERATED ALWAYS AS (temp_actual - temp_predicted) STORED,
    evaluated_at    TIMESTAMPTZ
);

CREATE INDEX idx_forecast_history_forecast_for ON forecast_history (forecast_for DESC);
CREATE INDEX idx_forecast_history_created_at   ON forecast_history (created_at DESC);
CREATE INDEX idx_forecast_history_horizon      ON forecast_history (horizon_hours);

-- ── 3. Model Metrics ──────────────────────────────────────────────
CREATE TABLE model_metrics (
    id              SERIAL PRIMARY KEY,
    model_name      VARCHAR(100) NOT NULL,
    model_version   VARCHAR(50)  NOT NULL,
    target          VARCHAR(50)  NOT NULL,  -- 'temperature', 'feels_like', 'rain'
    metric_name     VARCHAR(50)  NOT NULL,  -- 'MAE', 'RMSE', 'R2', 'Accuracy', 'F1'
    metric_value    NUMERIC(10,6) NOT NULL,
    train_samples   INTEGER,
    test_samples    INTEGER,
    n_features      INTEGER,
    trained_at      TIMESTAMPTZ NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_model_metrics_model   ON model_metrics (model_name, model_version);
CREATE INDEX idx_model_metrics_trained ON model_metrics (trained_at DESC);

-- ── 4. Prediction Logs ────────────────────────────────────────────
CREATE TABLE prediction_logs (
    id              BIGSERIAL PRIMARY KEY,
    requested_at    TIMESTAMPTZ DEFAULT NOW(),
    endpoint        VARCHAR(100),
    horizon_hours   SMALLINT,
    input_features  JSONB,
    temp_out        NUMERIC(5,2),
    feels_out       NUMERIC(5,2),
    rain_prob_out   NUMERIC(5,2),
    latency_ms      INTEGER,
    model_version   VARCHAR(50),
    client_ip       VARCHAR(45),
    status          VARCHAR(20) DEFAULT 'success'
);

CREATE INDEX idx_pred_logs_requested_at ON prediction_logs (requested_at DESC);
CREATE INDEX idx_pred_logs_status       ON prediction_logs (status);

-- ── 5. Seed initial model metrics ─────────────────────────────────
INSERT INTO model_metrics (model_name, model_version, target, metric_name, metric_value, train_samples, test_samples, n_features, trained_at) VALUES
('XGBoost',          'v1.0', 'temperature',  'MAE',      0.000,    92870, 23218, 71, NOW()),
('XGBoost',          'v1.0', 'temperature',  'RMSE',     0.011,    92870, 23218, 71, NOW()),
('XGBoost',          'v1.0', 'temperature',  'R2',       1.000,    92870, 23218, 71, NOW()),
('XGBoost',          'v1.0', 'feels_like',   'MAE',      0.056,    92870, 23218, 71, NOW()),
('XGBoost',          'v1.0', 'feels_like',   'R2',       0.997,    92870, 23218, 71, NOW()),
('XGBoost',          'v1.0', 'rain',         'Accuracy', 0.999,    92870, 23218, 71, NOW()),
('XGBoost',          'v1.0', 'rain',         'F1',       0.999,    92870, 23218, 71, NOW()),
('LinearRegression', 'v1.0', 'temperature',  'MAE',      0.006,    92870, 23218, 71, NOW()),
('LinearRegression', 'v1.0', 'temperature',  'R2',       1.000,    92870, 23218, 71, NOW()),
('RandomForest',     'v1.0', 'temperature',  'MAE',      0.000,    92870, 23218, 71, NOW()),
('RandomForest',     'v1.0', 'temperature',  'R2',       1.000,    92870, 23218, 71, NOW()),
('LightGBM',         'v1.0', 'temperature',  'MAE',      0.001,    92870, 23218, 71, NOW()),
('LightGBM',         'v1.0', 'temperature',  'R2',       1.000,    92870, 23218, 71, NOW());

-- ── Useful views ──────────────────────────────────────────────────
CREATE VIEW monthly_weather_summary AS
SELECT
    EXTRACT(YEAR  FROM recorded_at) AS year,
    EXTRACT(MONTH FROM recorded_at) AS month,
    COUNT(*)                        AS records,
    ROUND(AVG(temp_c)::numeric, 2)         AS avg_temp,
    ROUND(MIN(temp_c)::numeric, 2)         AS min_temp,
    ROUND(MAX(temp_c)::numeric, 2)         AS max_temp,
    ROUND(AVG(humidity)::numeric, 1)       AS avg_humidity,
    ROUND(SUM(precip_mm)::numeric, 2)      AS total_rain_mm,
    COUNT(*) FILTER (WHERE precip_mm > 0)  AS rainy_hours
FROM weather_history
GROUP BY 1, 2
ORDER BY 1, 2;

CREATE VIEW forecast_accuracy AS
SELECT
    horizon_hours,
    COUNT(*)                                              AS total_forecasts,
    ROUND(AVG(ABS(temp_error))::numeric, 3)              AS mean_abs_temp_error,
    ROUND(STDDEV(temp_error)::numeric, 3)                AS std_temp_error,
    COUNT(*) FILTER (WHERE ABS(temp_error) < 1)          AS within_1_degree,
    COUNT(*) FILTER (WHERE evaluated_at IS NOT NULL)     AS evaluated_count
FROM forecast_history
WHERE temp_actual IS NOT NULL
GROUP BY horizon_hours
ORDER BY horizon_hours;
