# SDD-04: AI Demand Forecasting, Schedule Optimization & Business Advisor

## 1. Overview
The Bookify AI Predictive Engine solves the core problem identified in the research: **bus operators lose up to 35% potential revenue due to rigid, static timetables** that fail to adapt to holiday spikes, weather changes, and highway bottlenecks.

---

## 2. Predictive Demand Forecasting Engine

### 2.1 Feature Engineering Matrix
| Feature Category | Inputs | Source |
|---|---|---|
| Historical Bookings | 30-day, 90-day, 365-day seat sales & cancellation rates | `bookings`, `booking_items` |
| Calendar & Festivals | Eid-ul-Fitr, Eid-ul-Adha, Durga Puja, National Holidays | Bangladesh Gov Holiday API |
| Weather Telemetry | Heavy rainfall, tropical storm warnings, flood alerts | OpenWeatherMap API |
| Highway Traffic | Real-time congestion indices on major national highways (N1, N2, N5) | Google Distance Matrix API |
| Temporal Markers | Day of week (Friday/Saturday weekend peak), time of departure | System Clock |

### 2.2 Forecasting Models
- **Short-Term (1-3 Days)**: Gradient Boosted Trees (XGBoost / LightGBM) trained on rolling 7-day bookings and hourly weather.
- **Medium-Term (7-30 Days)**: Meta Prophet with custom holiday regressors for Eid and long weekends.

### 2.3 Output Schema
```json
{
  "routeId": "r_dhaka_cox",
  "forecastDate": "2026-10-23",
  "isHighDemandSpike": true,
  "confidenceScore": 0.93,
  "predictedPassengerDemand": 520,
  "currentFleetCapacity": 360,
  "recommendedBuses": 14,
  "additionalBusesRequired": 4,
  "projectedRevenue": 728000.00
}
```

---

## 3. Dynamic Schedule Optimization & Slot Rebalancing

### 3.1 Optimization Algorithm
The engine evaluates trip profitability and seat occupancy every 6 hours:
1. Identify trips with **occupancy < 40%** scheduled within 48 hours.
2. Cross-reference demand curves on adjacent routes and time windows.
3. Compute marginal cost vs. revenue delta of shifting departure time.
4. If shifting departure time (e.g., from 10:00 PM to 01:00 PM) yields $\ge 15\%$ gain, synthesize an actionable recommendation.

### 3.2 Human-in-the-Loop Vendor Approval
- In accordance with transport regulatory standards, the AI **does NOT unilaterally mutate live schedules**.
- Instead, it generates a proposal with status `PENDING_APPROVAL` in `ai_recommendations`.
- The Bus Operator receives a push alert and dashboard banner:
  > *"AI Recommendation: Shift Dhaka -> Khulna coach from 10:00 PM to 01:00 PM on Friday to capture high afternoon demand. Projected revenue increase: +18.4%."*
- Actions available: **[Accept & Reschedule]** or **[Decline with Reason]**.
- Upon acceptance, the Fleet Service automatically updates `trips` and notifies existing booked passengers via SMS.

