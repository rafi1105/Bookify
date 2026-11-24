# Phase 5: Multilingual AI Voice & Predictive Analytics

## Objective
Build and integrate the dedicated Python/FastAPI AI microservice supporting Whisper STT, LangChain entity extraction (Bangla/English/Banglish), demand forecasting, and schedule optimization.

---

## Actionable Execution Chunks

### Chunk 5.1: FastAPI Microservice Setup & Whisper STT Pipeline
- **Tasks**:
  1. Initialize Python virtual environment with FastAPI, Uvicorn, LangChain, OpenAI Whisper, and Prophet.
  2. Implement `POST /api/ai/voice/stt` endpoint accepting multipart audio files.
  3. Transcribe audio to text and detect language (`bn-BD`, `en-US`, Banglish).
- **SDD Reference**: `.agent/sdd/sdd-02-multilingual-voice-ai.md`
- **DoD**: Voice recording uploaded from browser returns accurate Bangla or English transcript.

### Chunk 5.2: Multilingual Intent & Entity Extraction Chain
- **Tasks**:
  1. Build LangChain extraction prompt with few-shot examples for Bangla and Banglish idioms.
  2. Parse output into structured JSON with `origin`, `destination`, `date`, `seatCount`, and `busType`.
  3. Handle missing slots with conversational clarification prompts.
- **BDD Reference**: `.agent/bdd/voice_booking_multilingual.feature`
- **TDD Tests**: Unit tests with 50+ test phrases in Bangla and Banglish asserting correct JSON entity outputs.
- **DoD**: Speaking *"কাল সকালে ঢাকা থেকে সিলেটের ২টা টিকিট দিন"* automatically fills search filters.

### Chunk 5.3: Demand Forecasting Model
- **Tasks**:
  1. Build time-series prediction pipeline using historical bookings, holiday calendar, and weather data.
  2. Implement `GET /api/ai/forecast/demand` endpoint outputting expected passenger counts and recommended bus quantities.
- **SDD Reference**: `.agent/sdd/sdd-04-demand-forecast-and-schedule-optimizer.md`
- **DoD**: Returns passenger demand predictions with confidence bounds for target future dates.

### Chunk 5.4: Dynamic Schedule Optimization Advisor
- **Tasks**:
  1. Implement occupancy analysis job flagging underutilized trips (< 40%).
  2. Generate schedule shift proposals (e.g., move departure from 10 PM to 1 PM).
  3. Implement Vendor interactive approval API (`/api/vendor/recommendations/:id/approve`).
- **BDD Reference**: `.agent/bdd/vendor_fleet_and_schedule.feature`
- **DoD**: Vendor can view AI advice on their dashboard and accept schedule changes with one click.

