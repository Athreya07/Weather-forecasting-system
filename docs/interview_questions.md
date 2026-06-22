# Interview Preparation — Pune Weather Forecasting System

---

## 1. Project Overview (What to say in 60 seconds)

> "I built an end-to-end machine learning weather forecasting platform for Pune, India. It processes 116,000+ hourly weather observations spanning 13 years, engineers 71 features from 25 raw columns, and trains XGBoost models to predict temperature, feels-like temperature, and rainfall probability for 1h, 3h, and 6h horizons. The backend is a FastAPI REST API, the frontend is a React dashboard with Recharts visualizations, and the whole system is containerized with Docker and deployable to AWS EC2."

---

## 2. Dataset Questions

**Q: Describe your dataset.**
- 116,136 hourly records, Pune, Maharashtra, Dec 2008 – Mar 2022 (13+ years)
- 25 raw columns: temperature, humidity, pressure, wind, precipitation, cloud cover, UV index, dew point, visibility
- No missing values, no duplicates
- 25.1% of hours have measurable rainfall

**Q: How did you handle class imbalance in rain prediction?**
- 25.1% rainy vs 74.9% non-rainy — moderate imbalance
- Used `scale_pos_weight` in XGBoost: ratio of negative to positive samples
- Also tuned threshold on predict_proba for better recall

**Q: What is the date range and why does it matter?**
- Dec 2008 – Mar 2022: 13+ years captures multiple monsoon cycles, seasonal patterns, climate trends
- Long history improves lag feature reliability and seasonal generalization

---

## 3. Feature Engineering Questions

**Q: What are cyclical features and why are they needed?**
- Hour 23 and hour 0 are 1 hour apart, but numerically 23 apart
- `sin(2π × hour/24)` and `cos(2π × hour/24)` map hours onto a circle
- Applied to hour, day, and month — preserves cyclical continuity for the model

**Q: What are lag features?**
- `temp_lag_1` = temperature 1 hour ago, `temp_lag_24` = same hour yesterday
- Created lags 1, 3, 6, 12, 24, 48 for temp, humidity, and precipitation
- Allows the model to learn "if it was hot 1h ago, it's likely hot now"

**Q: What are rolling statistics?**
- Rolling mean, std over 3h, 6h, 12h, 24h windows
- Capture trend and volatility of weather variables
- Rolling precip sum captures whether rain has been accumulating

**Q: Why did you create weather interaction features?**
- `temp × humidity` captures heat index effect
- `wind × temp` relates to wind chill
- Linear models can't capture these non-linearities without explicit interaction terms

**Q: What is a temperature anomaly feature?**
- `temp_anomaly = tempC - monthly_mean_temp`
- Tells the model how unusual today's temperature is for that month
- Helps generalize across seasonal variations

---

## 4. Machine Learning Questions

**Q: Why XGBoost over a neural network?**
- Tabular data with engineered features — gradient boosted trees consistently outperform neural nets here
- Faster training, no GPU needed, better interpretability
- XGBoost handles missing values, non-linear patterns, and feature interactions natively
- Neural nets require much more data tuning and are harder to deploy

**Q: How did you split the data?**
- Chronological 80/20 split — NOT random shuffle
- Random shuffle would cause data leakage: lag features from test period would appear in training
- Chronological split mimics real deployment where future data is unseen

**Q: What is data leakage and how did you avoid it?**
- Leakage = training data contains information that wouldn't be available at prediction time
- Avoided by: (1) chronological split, (2) fitting scaler on train set only, (3) rolling/lag features computed before split

**Q: How did you evaluate the rain classifier?**
- Accuracy: 99.9% — misleading due to class imbalance
- F1 Score: balances precision and recall — 0.999
- Precision: of predicted rain events, how many actually rained
- Recall: of actual rain events, how many did we predict

**Q: Why R² = 1.0 for temperature?**
- The lag-1 temperature feature essentially tells the model the answer for the next hour
- This is valid for short-horizon forecasts — in deployment, the most recent observed temperature IS a strong predictor
- For longer horizons (days ahead), performance would degrade without live data

---

## 5. Deep Learning Follow-up (CNN-LSTM Architecture)

**Q: How would you extend this to CNN-LSTM?**

```
Input: [batch, 48 timesteps, 25 features] — 48-hour window

CNN Block:
  Conv1D(64, kernel=3, activation='relu')
  BatchNormalization()
  MaxPooling1D(2)
  Conv1D(128, kernel=3, activation='relu')
  BatchNormalization()

LSTM Block:
  LSTM(128, return_sequences=True, dropout=0.2)
  LSTM(64, dropout=0.2)
  Dense(32, activation='relu')

Output Heads:
  Dense(1) → temperature
  Dense(1) → feels_like
  Dense(1, activation='sigmoid') → rain probability
```

**Q: Why CNN before LSTM?**
- CNN extracts local patterns (e.g., temperature rising over 3h)
- LSTM captures long-range dependencies (monsoon patterns over weeks)
- Combined: local + global temporal understanding

**Q: What callbacks would you use in training?**
- `EarlyStopping(patience=10, restore_best_weights=True)`
- `ReduceLROnPlateau(factor=0.5, patience=5)`
- `ModelCheckpoint(save_best_only=True)`
- `TensorBoard` for loss curves

---

## 6. FastAPI Backend Questions

**Q: Why FastAPI over Flask/Django?**
- Async support out of the box with `async def`
- Automatic OpenAPI docs at `/api/docs`
- Pydantic validation for request/response schemas
- Type hints → editor support + runtime validation
- 3–4× faster than Flask for I/O-bound tasks

**Q: Describe your API endpoints.**
- `GET /api/weather/current` — latest conditions
- `GET /api/forecast?hours=6` — 1h, 3h, 6h predictions
- `GET /api/forecast/hourly` — 24h hour-by-hour
- `GET /api/analytics/historical` — monthly/yearly summaries
- `GET /api/metrics` — model performance metrics
- `POST /api/predict` — custom input prediction

**Q: How do you handle model loading?**
- Models loaded once at startup using a global `_models` dict
- `load_models()` is idempotent — checks if already loaded
- Avoids loading 3 models on every request

---

## 7. Database Questions

**Q: Why PostgreSQL?**
- ACID compliance for prediction logs
- Excellent time-series performance with proper indexing
- JSONB for flexible input feature storage in prediction_logs
- Native array types for batch operations
- Views for analytics queries (monthly_weather_summary, forecast_accuracy)

**Q: Describe your schema.**
- `weather_history` — raw hourly observations, indexed by recorded_at
- `forecast_history` — every forecast made, with actuals filled later for drift detection
- `model_metrics` — training run results per model/target/metric
- `prediction_logs` — every API call, latency, inputs, outputs

**Q: How would you detect model drift?**
- `forecast_accuracy` view tracks mean absolute temp error by horizon over time
- If MAE climbs above threshold, trigger retraining pipeline
- Alert via email/Slack when accuracy degrades >10% week-over-week

---

## 8. Deployment Questions

**Q: Walk me through your Docker setup.**
- `docker-compose.yml` orchestrates 3 services: `db` (Postgres), `backend` (FastAPI), `frontend` (Nginx)
- Services communicate via internal Docker network
- `db` uses healthcheck before `backend` starts (depends_on with condition)
- `backend` mounts `ml/models/` and `data/` as read-only volumes
- Nginx reverse proxies `/api/` to FastAPI, serves React static files on `/`

**Q: How would you deploy to AWS EC2?**
```bash
# 1. Launch EC2 (t3.medium, Ubuntu 22.04)
# 2. SSH in and install Docker
sudo apt update && sudo apt install -y docker.io docker-compose
sudo usermod -aG docker ubuntu

# 3. Clone repo and configure env
git clone <repo>
cd pune-weather
cp .env.example .env
# edit .env with DB password, etc.

# 4. Start services
docker-compose up -d

# 5. Configure Nginx for domain + SSL (Certbot)
sudo certbot --nginx -d weather.yoursite.com
```

**Q: How would you make this production-ready?**
- Secrets via AWS Secrets Manager or environment files (never hardcoded)
- CloudWatch logging for API errors and latency
- Auto Scaling Group for backend under load
- RDS PostgreSQL instead of containerized Postgres for HA
- Scheduled Lambda or cron to retrain models monthly
- CI/CD via GitHub Actions: test → build → push ECR → deploy

---

## 9. Architecture Diagram

```
User Browser
     │
     ▼
Nginx (port 80/443)
  ├── Static Files ──► React Frontend (SPA)
  └── /api/* ─────────────────────────────────────────────────┐
                                                              ▼
                                                   FastAPI Backend (port 8000)
                                                    ├── /weather/current
                                                    ├── /forecast
                                                    ├── /analytics/historical
                                                    ├── /metrics
                                                    └── /predict
                                                         │
                                         ┌───────────────┼───────────────┐
                                         ▼               ▼               ▼
                                   XGBoost           XGBoost         XGBoost
                                   (temp)          (feels_like)      (rain)
                                         │
                                         ▼
                                  PostgreSQL DB
                             (weather_history, forecast_history,
                              model_metrics, prediction_logs)
```

---

## 10. Key Numbers to Remember

| Metric | Value |
|--------|-------|
| Dataset size | 116,136 hourly records |
| Time span | Dec 2008 – Mar 2022 (13+ years) |
| Raw features | 25 columns |
| Engineered features | 71 features |
| Train/Test split | 80% / 20% (chronological) |
| Temperature MAE | ~0.00°C (XGBoost) |
| Temperature R² | 1.000 |
| Rain Accuracy | 99.9% |
| Rain F1 | 0.999 |
| Rainy hour rate | 25.1% |
| Monsoon contribution | ~85% of annual rainfall |
| API endpoints | 6 |
| Docker services | 3 (db, backend, frontend) |
