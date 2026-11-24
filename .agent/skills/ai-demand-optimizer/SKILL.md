---
name: ai-demand-optimizer
description: Guides predictive demand modeling, Prophet/XGBoost time-series analysis, schedule optimization, and vendor AI advisory recommendations for bus operators.
---

# AI Demand Forecasting & Schedule Optimizer Skill

Activate this skill when implementing machine learning models, telemetry aggregation, schedule shift algorithms, or vendor recommendation feeds.

## Core Directives
1. **Model Inputs**: Combine historical passenger counts, public holidays, weekend flags, weather forecasts, and highway delay data.
2. **Confidence Bounds**: Always output confidence intervals along with point predictions.
3. **Recommendation Safeguards**:
   - The AI only suggests schedule modifications (`PENDING_APPROVAL`).
   - The vendor must explicitly click "Approve" before any change is made to live database departure times.
4. **Business Metric Tracking**:
   - Compute expected revenue lift (e.g. `+18%`) by comparing the projected passenger load of the proposed departure time against the historical baseline of the existing slot.

