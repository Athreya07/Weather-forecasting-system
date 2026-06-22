# 🌦️ Pune Weather Forecasting System

> Production-grade ML weather forecasting platform trained on 13+ years of hourly data from Pune, Maharashtra, India.

---

## Overview

| | |
|--|--|
| **Dataset** | 116,136 hourly records, Dec 2008 – Mar 2022 |
| **Features** | 71 engineered features from 25 raw columns |
| **Models** | XGBoost (temperature, feels-like, rain classifier) |
| **Backend** | FastAPI + PostgreSQL |
| **Frontend** | React + Recharts |
| **Deploy** | Docker + AWS EC2 + Nginx |

### Forecasts
- ⏱ **1-hour** temperature, feels-like, rain probability
- 🕐 **3-hour** predictions
- 🕕 **6-hour** predictions

---

## Project Structure

```
pune-weather/
├── data/
│   ├── pune.csv                   # Raw dataset (116K rows)
│   └── pune_engineered.csv        # 71-feature engineered dataset
├── notebooks/
│   ├── 01_dataset_analysis.py     # Full EDA
│   └── 02_feature_engineering.py  # Feature creation walkthrough
├── ml/
│   ├── training/
│   │   └── train_models.py        # Train all 4 baselines + 3 final models
│   ├── evaluation/
│   │   └── evaluate_models.py     # Metrics, plots, confusion matrix
│   └── models/                    # Trained model .pkl files (after training)
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app + middleware
│   │   ├── api/                   # Route handlers
│   │   │   ├── weather.py         # GET /api/weather/current
│   │   │   ├── forecast.py        # GET /api/forecast
│   │   │   ├── analytics.py       # GET /api/analytics/historical
│   │   │   ├── metrics.py         # GET /api/metrics
│   │   │   └── predict.py         # POST /api/predict
│   │   ├── services/
│   │   │   └── prediction_service.py  # Model inference logic
│   │   └── core/
│   │       └── config.py          # Env-based configuration
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── src/                       # React components (see PuneWeatherApp.jsx)
├── docker/
│   ├── schema.sql                 # PostgreSQL schema + seed data
│   └── nginx.conf                 # Reverse proxy config
├── docs/
│   └── interview_questions.md     # 50+ Q&A for interviews
├── docker-compose.yml
└── README.md
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker + Docker Compose
- PostgreSQL 16 (or use Docker)

---

### 1. Clone & Setup

```bash
git clone https://github.com/yourname/pune-weather.git
cd pune-weather
cp .env.example .env   # edit your secrets
```

### 2. Train Models

```bash
# Install Python deps
pip install -r backend/requirements.txt

# Step 1: Feature engineering
python notebooks/02_feature_engineering.py

# Step 2: EDA (optional)
python notebooks/01_dataset_analysis.py

# Step 3: Train all models
python ml/training/train_models.py

# Step 4: Evaluate
python ml/evaluation/evaluate_models.py
```

### 3. Run with Docker (recommended)

```bash
docker-compose up --build
```

Services:
- Frontend → http://localhost
- API → http://localhost:8000
- API Docs → http://localhost:8000/api/docs
- DB → localhost:5432

### 4. Run Backend Locally

```bash
cd backend
pip install -r requirements.txt
MODEL_PATH=../ml/models DATA_PATH=../data uvicorn app.main:app --reload --port 8000
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/weather/current` | Latest conditions |
| GET | `/api/forecast?hours=6` | 1h/3h/6h forecasts |
| GET | `/api/forecast/hourly?hours=24` | Hour-by-hour 24h |
| GET | `/api/analytics/historical` | Monthly/yearly trends |
| GET | `/api/metrics` | Model performance |
| POST | `/api/predict` | Custom prediction |

Full docs at `/api/docs` (Swagger UI).

---

## Model Performance

| Model | Target | MAE | RMSE | R² |
|-------|--------|-----|------|----|
| XGBoost | Temperature | 0.000 | 0.011 | 1.000 |
| XGBoost | Feels Like | 0.056 | — | 0.997 |
| XGBoost | Rain (Acc/F1) | — | — | 99.9% / 0.999 |
| LightGBM | Temperature | 0.001 | 0.017 | 1.000 |
| RandomForest | Temperature | 0.000 | 0.011 | 1.000 |
| LinearRegression | Temperature | 0.006 | 0.009 | 1.000 |

> Near-perfect scores are expected: lag-1 temperature is highly predictive for 1-step-ahead forecasting.

---

## AWS Deployment

```bash
# 1. Launch EC2 t3.medium (Ubuntu 22.04), open ports 80, 443, 22
# 2. SSH in
ssh -i your-key.pem ubuntu@<EC2-IP>

# 3. Install Docker
sudo apt update && sudo apt install -y docker.io docker-compose
sudo usermod -aG docker ubuntu && newgrp docker

# 4. Clone and configure
git clone https://github.com/yourname/pune-weather.git
cd pune-weather && cp .env.example .env
nano .env   # set POSTGRES_PASSWORD

# 5. Start
docker-compose up -d

# 6. SSL (optional)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d weather.yourdomain.com
```

---

## Environment Variables

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgresql://postgres:your_secure_password@db:5432/pune_weather
MODEL_PATH=./ml/models
DATA_PATH=./data
LOG_LEVEL=INFO
DEBUG=false
```

---

## Tech Stack

- **ML**: Python 3.11, XGBoost 2.x, LightGBM, scikit-learn, pandas, numpy
- **Backend**: FastAPI, Uvicorn, SQLAlchemy, Pydantic v2
- **Database**: PostgreSQL 16
- **Frontend**: React 18, Recharts, Tailwind CSS
- **DevOps**: Docker, docker-compose, Nginx, AWS EC2

---

## License

MIT © 2024 — Portfolio project for educational purposes.
