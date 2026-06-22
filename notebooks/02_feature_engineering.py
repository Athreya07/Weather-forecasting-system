#!/usr/bin/env python3
"""Feature Engineering — creates pune_engineered.csv with 71 features."""
import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH   = ROOT / 'data' / 'pune.csv'
OUTPUT_PATH = ROOT / 'data' / 'pune_engineered.csv'

print("=" * 60)
print("PUNE WEATHER — FEATURE ENGINEERING")
print("=" * 60)

df = pd.read_csv(DATA_PATH)
df['date_time'] = pd.to_datetime(df['date_time'])
df = df.sort_values('date_time').reset_index(drop=True)
print(f"Raw: {df.shape[0]:,} rows × {df.shape[1]} columns")

# Time features
df['hour']    = df['date_time'].dt.hour
df['day']     = df['date_time'].dt.day
df['month']   = df['date_time'].dt.month
df['weekday'] = df['date_time'].dt.weekday
df['quarter'] = df['date_time'].dt.quarter
df['year']    = df['date_time'].dt.year

# Cyclical encoding
df['hour_sin']  = np.sin(2 * np.pi * df['hour']  / 24)
df['hour_cos']  = np.cos(2 * np.pi * df['hour']  / 24)
df['day_sin']   = np.sin(2 * np.pi * df['day']   / 31)
df['day_cos']   = np.cos(2 * np.pi * df['day']   / 31)
df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

# Lag features
for lag in [1, 3, 6, 12, 24, 48]:
    df[f'temp_lag_{lag}']     = df['tempC'].shift(lag)
    df[f'humidity_lag_{lag}'] = df['humidity'].shift(lag)
    df[f'precip_lag_{lag}']   = df['precipMM'].shift(lag)

# Rolling statistics
for w in [3, 6, 12, 24]:
    df[f'temp_roll_mean_{w}']     = df['tempC'].rolling(w).mean()
    df[f'temp_roll_std_{w}']      = df['tempC'].rolling(w).std()
    df[f'humidity_roll_mean_{w}'] = df['humidity'].rolling(w).mean()
    df[f'precip_roll_sum_{w}']    = df['precipMM'].rolling(w).sum()

# Interaction features
df['temp_humidity']     = df['tempC'] * df['humidity']
df['temp_pressure']     = df['tempC'] * df['pressure']
df['wind_temp']         = df['windspeedKmph'] * df['tempC']
df['humidity_pressure'] = df['humidity'] * df['pressure']

# Seasonal indicators
df['is_summer']  = df['month'].isin([3,4,5]).astype(int)
df['is_monsoon'] = df['month'].isin([6,7,8,9]).astype(int)
df['is_winter']  = df['month'].isin([11,12,1,2]).astype(int)

# Anomaly features
df['temp_anomaly'] = df['tempC'] - df.groupby('month')['tempC'].transform('mean')
df['rain_anomaly'] = df['precipMM'] - df.groupby('month')['precipMM'].transform('mean')

# Target
df['will_rain'] = (df['precipMM'] > 0.1).astype(int)

df_clean = df.dropna().reset_index(drop=True)
df_clean.to_csv(OUTPUT_PATH, index=False)
print(f"Saved: {OUTPUT_PATH}")
print(f"Final: {df_clean.shape[0]:,} rows × {df_clean.shape[1]} features")
print("Feature engineering complete ✓")
