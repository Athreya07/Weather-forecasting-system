#!/usr/bin/env python3
"""
====================================================================
Pune Weather Forecasting System
Phase 5: Model Evaluation & Reporting
====================================================================
"""

import pandas as pd
import numpy as np
import json
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    accuracy_score, f1_score, precision_score, recall_score,
    confusion_matrix, classification_report
)
import warnings
warnings.filterwarnings('ignore')

plt.style.use('seaborn-v0_8-whitegrid')
BLUE = '#2563EB'

print("=" * 60)
print("PUNE WEATHER — MODEL EVALUATION REPORT")
print("=" * 60)

DATA_PATH  = Path('data/pune_engineered.csv')
MODEL_PATH = Path('ml/models')
EVAL_PATH  = Path('ml/evaluation')
EVAL_PATH.mkdir(parents=True, exist_ok=True)

# ── Load ───────────────────────────────────────────────────────────
df = pd.read_csv(DATA_PATH)
with open(MODEL_PATH / 'feature_meta.json') as f:
    meta = json.load(f)

feature_cols = meta['features']
X  = df[feature_cols].values
y_temp  = df['tempC'].values
y_feels = df['FeelsLikeC'].values
y_rain  = df['will_rain'].values

split_idx = int(len(X) * 0.8)
X_test   = X[split_idx:]
yt_test  = y_temp[split_idx:]
yf_test  = y_feels[split_idx:]
yr_test  = y_rain[split_idx:]

xgb_temp  = joblib.load(MODEL_PATH / 'xgb_temp.pkl')
xgb_feels = joblib.load(MODEL_PATH / 'xgb_feels.pkl')
xgb_rain  = joblib.load(MODEL_PATH / 'xgb_rain.pkl')

temp_pred  = xgb_temp.predict(X_test)
feels_pred = xgb_feels.predict(X_test)
rain_pred  = xgb_rain.predict(X_test)
rain_prob  = xgb_rain.predict_proba(X_test)[:, 1]

# ── Regression Metrics ─────────────────────────────────────────────
print("\n[1] REGRESSION METRICS")
for name, y_true, y_hat in [
    ('Temperature (tempC)', yt_test, temp_pred),
    ('Feels Like (FeelsLikeC)', yf_test, feels_pred),
]:
    mae  = mean_absolute_error(y_true, y_hat)
    rmse = np.sqrt(mean_squared_error(y_true, y_hat))
    r2   = r2_score(y_true, y_hat)
    print(f"\n   {name}")
    print(f"     MAE  : {mae:.4f}")
    print(f"     RMSE : {rmse:.4f}")
    print(f"     R²   : {r2:.4f}")

# ── Classification Metrics ─────────────────────────────────────────
print("\n[2] CLASSIFICATION METRICS (Rain Prediction)")
print(f"   Accuracy  : {accuracy_score(yr_test, rain_pred):.4f}")
print(f"   Precision : {precision_score(yr_test, rain_pred):.4f}")
print(f"   Recall    : {recall_score(yr_test, rain_pred):.4f}")
print(f"   F1 Score  : {f1_score(yr_test, rain_pred):.4f}")
print("\n   Classification Report:")
print(classification_report(yr_test, rain_pred, target_names=['No Rain', 'Rain']))

# ── Plot 1: Actual vs Predicted (temperature) ──────────────────────
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
fig.suptitle('Temperature Prediction: Actual vs Predicted', fontsize=13, fontweight='bold')

sample = slice(0, 500)
axes[0].plot(yt_test[sample], label='Actual', color='#374151', linewidth=1.2, alpha=0.8)
axes[0].plot(temp_pred[sample], label='Predicted', color=BLUE, linewidth=1.2, alpha=0.8, linestyle='--')
axes[0].set_xlabel('Time Step')
axes[0].set_ylabel('Temperature (°C)')
axes[0].set_title('First 500 Test Predictions')
axes[0].legend()

axes[1].scatter(yt_test[:2000], temp_pred[:2000], alpha=0.3, s=8, color=BLUE)
mn, mx = yt_test.min(), yt_test.max()
axes[1].plot([mn, mx], [mn, mx], 'r--', linewidth=1.5, label='Perfect fit')
axes[1].set_xlabel('Actual (°C)')
axes[1].set_ylabel('Predicted (°C)')
axes[1].set_title('Scatter: Actual vs Predicted')
axes[1].legend()

plt.tight_layout()
plt.savefig(EVAL_PATH / 'temp_prediction.png', dpi=150, bbox_inches='tight')
plt.close()
print("\n  ✓ Saved: temp_prediction.png")

# ── Plot 2: Residuals ──────────────────────────────────────────────
residuals = yt_test - temp_pred
fig, axes = plt.subplots(1, 2, figsize=(12, 4))
fig.suptitle('Residual Analysis', fontsize=13, fontweight='bold')

axes[0].hist(residuals, bins=60, color=BLUE, alpha=0.8, edgecolor='white')
axes[0].axvline(0, color='red', linestyle='--', linewidth=1.5)
axes[0].set_xlabel('Residual (°C)')
axes[0].set_ylabel('Frequency')
axes[0].set_title('Residual Distribution')

axes[1].scatter(temp_pred[:3000], residuals[:3000], alpha=0.3, s=6, color='#8B5CF6')
axes[1].axhline(0, color='red', linestyle='--', linewidth=1.5)
axes[1].set_xlabel('Predicted Value')
axes[1].set_ylabel('Residual')
axes[1].set_title('Residual vs Predicted')

plt.tight_layout()
plt.savefig(EVAL_PATH / 'residual_analysis.png', dpi=150, bbox_inches='tight')
plt.close()
print("  ✓ Saved: residual_analysis.png")

# ── Plot 3: Confusion Matrix (rain) ───────────────────────────────
cm = confusion_matrix(yr_test, rain_pred)
fig, ax = plt.subplots(figsize=(6, 5))
sns.heatmap(
    cm, annot=True, fmt='d', cmap='Blues', ax=ax,
    xticklabels=['No Rain', 'Rain'],
    yticklabels=['No Rain', 'Rain']
)
ax.set_xlabel('Predicted')
ax.set_ylabel('Actual')
ax.set_title('Rain Classification — Confusion Matrix', fontweight='bold')
plt.tight_layout()
plt.savefig(EVAL_PATH / 'confusion_matrix.png', dpi=150, bbox_inches='tight')
plt.close()
print("  ✓ Saved: confusion_matrix.png")

# ── Plot 4: Feature Importance ─────────────────────────────────────
importance = xgb_temp.feature_importances_
fi_df = pd.DataFrame({'feature': feature_cols, 'importance': importance})
fi_df = fi_df.sort_values('importance', ascending=False).head(20)

fig, ax = plt.subplots(figsize=(10, 7))
bars = ax.barh(fi_df['feature'][::-1], fi_df['importance'][::-1], color=BLUE, alpha=0.85)
ax.set_xlabel('Importance Score')
ax.set_title('Top 20 Feature Importances (Temperature Model)', fontsize=12, fontweight='bold')
plt.tight_layout()
plt.savefig(EVAL_PATH / 'feature_importance.png', dpi=150, bbox_inches='tight')
plt.close()
print("  ✓ Saved: feature_importance.png")

print("\n" + "=" * 60)
print("EVALUATION COMPLETE — All plots saved to ml/evaluation/")
print("=" * 60)
