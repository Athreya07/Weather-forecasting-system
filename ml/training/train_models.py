#!/usr/bin/env python3
"""
====================================================================
Pune Weather Forecasting System
Phase 3 & 4: Model Training Pipeline
Baseline Models + XGBoost Final Models
====================================================================
"""
import os, sys
from pathlib import Path

# Resolve project root (works whether called from backend/ or project root)
THIS_FILE = Path(__file__).resolve()
PROJECT_ROOT = THIS_FILE.parent.parent.parent  # ml/training/train_models.py -> root

DATA_PATH  = PROJECT_ROOT / 'data' / 'pune_engineered.csv'
MODEL_PATH = PROJECT_ROOT / 'ml' / 'models'

# Fallback: if engineered CSV doesn't exist, engineer it first
if not DATA_PATH.exists():
    RAW_PATH = PROJECT_ROOT / 'data' / 'pune.csv'
    if not RAW_PATH.exists():
        print(f"ERROR: Cannot find {RAW_PATH}")
        sys.exit(1)
    print("  Engineered dataset not found — running feature engineering first...")
    exec(open(PROJECT_ROOT / 'notebooks' / '02_feature_engineering.py').read())

MODEL_PATH.mkdir(parents=True, exist_ok=True)

import pandas as pd
import numpy as np
import json
import joblib
import warnings
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    accuracy_score, precision_score, recall_score, f1_score,
)
import xgboost as xgb
import lightgbm as lgb
warnings.filterwarnings('ignore')

print("=" * 60)
print("PUNE WEATHER — MODEL TRAINING PIPELINE")
print("=" * 60)

df = pd.read_csv(DATA_PATH)
print(f"\nLoaded: {df.shape[0]:,} rows × {df.shape[1]} columns")

exclude = [
    'date_time', 'location', 'moonrise', 'moonset',
    'sunrise', 'sunset', 'tempC', 'FeelsLikeC', 'precipMM', 'will_rain'
]
feature_cols = [c for c in df.columns if c not in exclude]
print(f"Features: {len(feature_cols)}")

X       = df[feature_cols].values
y_temp  = df['tempC'].values
y_feels = df['FeelsLikeC'].values
y_rain  = df['will_rain'].values

split   = int(len(X) * 0.8)
X_train, X_test   = X[:split],       X[split:]
yt_train, yt_test = y_temp[:split],  y_temp[split:]
yf_train, yf_test = y_feels[:split], y_feels[split:]
yr_train, yr_test = y_rain[:split],  y_rain[split:]
print(f"Train: {len(X_train):,}  |  Test: {len(X_test):,}")

scaler    = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

results = {}

print("\n[1] Linear Regression...")
lr   = LinearRegression()
lr.fit(X_train_s, yt_train)
pred = lr.predict(X_test_s)
results['LinearRegression'] = dict(
    MAE=round(float(mean_absolute_error(yt_test, pred)), 4),
    RMSE=round(float(np.sqrt(mean_squared_error(yt_test, pred))), 4),
    R2=round(float(r2_score(yt_test, pred)), 4))
print(f"   {results['LinearRegression']}")

print("[2] Random Forest...")
rf   = RandomForestRegressor(n_estimators=100, max_depth=12, n_jobs=-1, random_state=42)
rf.fit(X_train, yt_train)
pred = rf.predict(X_test)
results['RandomForest'] = dict(
    MAE=round(float(mean_absolute_error(yt_test, pred)), 4),
    RMSE=round(float(np.sqrt(mean_squared_error(yt_test, pred))), 4),
    R2=round(float(r2_score(yt_test, pred)), 4))
print(f"   {results['RandomForest']}")

print("[3] XGBoost baseline...")
xb   = xgb.XGBRegressor(n_estimators=200, max_depth=6, learning_rate=0.1,
                          subsample=0.8, colsample_bytree=0.8,
                          n_jobs=-1, random_state=42, verbosity=0)
xb.fit(X_train, yt_train)
pred = xb.predict(X_test)
results['XGBoost'] = dict(
    MAE=round(float(mean_absolute_error(yt_test, pred)), 4),
    RMSE=round(float(np.sqrt(mean_squared_error(yt_test, pred))), 4),
    R2=round(float(r2_score(yt_test, pred)), 4))
print(f"   {results['XGBoost']}")

print("[4] LightGBM baseline...")
lgbm = lgb.LGBMRegressor(n_estimators=200, max_depth=6, learning_rate=0.1,
                          subsample=0.8, colsample_bytree=0.8,
                          n_jobs=-1, random_state=42, verbose=-1)
lgbm.fit(X_train, yt_train)
pred = lgbm.predict(X_test)
results['LightGBM'] = dict(
    MAE=round(float(mean_absolute_error(yt_test, pred)), 4),
    RMSE=round(float(np.sqrt(mean_squared_error(yt_test, pred))), 4),
    R2=round(float(r2_score(yt_test, pred)), 4))
print(f"   {results['LightGBM']}")

print("\n[5] Final XGBoost models (3 targets)...")
params = dict(n_estimators=300, max_depth=6, learning_rate=0.05,
              subsample=0.8, colsample_bytree=0.8, n_jobs=-1, random_state=42, verbosity=0)

xgb_temp = xgb.XGBRegressor(**params)
xgb_temp.fit(X_train, yt_train, eval_set=[(X_test, yt_test)], verbose=False)
tp = xgb_temp.predict(X_test)
print(f"   Temp:      MAE={mean_absolute_error(yt_test,tp):.4f}  R²={r2_score(yt_test,tp):.4f}")

xgb_feels = xgb.XGBRegressor(**params)
xgb_feels.fit(X_train, yf_train, eval_set=[(X_test, yf_test)], verbose=False)
fp = xgb_feels.predict(X_test)
print(f"   FeelsLike: MAE={mean_absolute_error(yf_test,fp):.4f}  R²={r2_score(yf_test,fp):.4f}")

cls_params = dict(**params)
cls_params['scale_pos_weight'] = float((yr_train==0).sum()/(yr_train==1).sum())
xgb_rain = xgb.XGBClassifier(**cls_params)
xgb_rain.fit(X_train, yr_train, eval_set=[(X_test, yr_test)], verbose=False)
rp = xgb_rain.predict(X_test)
print(f"   Rain:      Acc={accuracy_score(yr_test,rp):.4f}  F1={f1_score(yr_test,rp):.4f}")

print("\n[6] Saving...")
joblib.dump(xgb_temp,  MODEL_PATH / 'xgb_temp.pkl')
joblib.dump(xgb_feels, MODEL_PATH / 'xgb_feels.pkl')
joblib.dump(xgb_rain,  MODEL_PATH / 'xgb_rain.pkl')
joblib.dump(scaler,    MODEL_PATH / 'scaler.pkl')

meta = dict(
    features=feature_cols, n_features=len(feature_cols),
    temp_mae=round(float(mean_absolute_error(yt_test,tp)),4),
    temp_r2=round(float(r2_score(yt_test,tp)),4),
    feels_mae=round(float(mean_absolute_error(yf_test,fp)),4),
    feels_r2=round(float(r2_score(yf_test,fp)),4),
    rain_accuracy=round(float(accuracy_score(yr_test,rp)),4),
    rain_f1=round(float(f1_score(yr_test,rp)),4),
    rain_precision=round(float(precision_score(yr_test,rp)),4),
    rain_recall=round(float(recall_score(yr_test,rp)),4),
    train_samples=len(X_train), test_samples=len(X_test),
)
with open(MODEL_PATH / 'feature_meta.json', 'w') as f:
    json.dump(meta, f, indent=2)
with open(PROJECT_ROOT / 'data' / 'model_results.json', 'w') as f:
    json.dump(results, f, indent=2)

print("\n" + "="*60)
print("TRAINING COMPLETE ✓")
print(f"  Models saved → {MODEL_PATH}")
print("="*60)
