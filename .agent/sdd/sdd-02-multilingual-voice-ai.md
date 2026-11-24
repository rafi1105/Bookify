# SDD-02: Multilingual AI Voice Booking Engine

## 1. Overview
The Bookify Voice Booking Engine allows passengers to speak naturally in **Bangla (`bn-BD`)**, **English (`en-US`)**, or **Banglish** (Bangla written or spoken with English vocabulary) to search and reserve bus tickets.

---

## 2. Audio Processing & Speech-to-Text Pipeline

```
Audio Input (Microphone) -> WebM / WAV -> FastAPI /api/ai/voice/stt
                             |
                             v
               OpenAI Whisper (Large-v3 / Medium)
                             |
                             +--> Transcript (Text)
                             +--> Language Detection Confidence
```

1. **Audio Ingestion**: Audio recorded at 16kHz mono or WebM compressed.
2. **Transcription**: Processed with Whisper model using localized Bangla prompt hints.
3. **Language Detection**: Identifies whether the transcript is pure Bangla, English, or mixed Banglish.

---

## 3. NLP Intent & Entity Extraction

### LangChain Orchestration Prompt
```text
You are Bookify's conversational bus reservation assistant.
Extract the user's booking intent and entities from the provided transcript.

Current Date: {current_date}
Available Cities: [Dhaka, Chittagong, Sylhet, Cox's Bazar, Khulna, Rajshahi, Barisal, Rangpur, Bogura]
Bus Types: [AC_BUSINESS, AC_ECONOMY, NON_AC, SLEEPER_AC]

Transcript: "{transcript}"

Return JSON:
{
  "intent": "BOOK_TICKET" | "CHECK_SCHEDULE" | "CANCEL_TICKET" | "RESCHEDULE_TICKET" | "UNKNOWN",
  "entities": {
    "origin": string | null,
    "destination": string | null,
    "travelDate": "YYYY-MM-DD" | null,
    "seatCount": number,
    "busType": string | null,
    "preferredTime": "MORNING" | "AFTERNOON" | "NIGHT" | null
  },
  "confidenceScore": number,
  "clarificationPrompt": string | null
}
```

### Supported Utterance Examples
1. **Bangla**:
   - Utterance: *"আগামীকাল ঢাকা থেকে খুলনার দুইটা এসি টিকিট বুক করো।"*
   - Extracted: `{ origin: "Dhaka", destination: "Khulna", date: "{tomorrow}", seatCount: 2, busType: "AC" }`
2. **Banglish**:
   - Utterance: *"Kalke sokale Dhaka theke Chittagong er 1ta sleeper ticket lagbe."*
   - Extracted: `{ origin: "Dhaka", destination: "Chittagong", date: "{tomorrow}", seatCount: 1, busType: "SLEEPER_AC", preferredTime: "MORNING" }`
3. **English**:
   - Utterance: *"Book three non-AC seats from Sylhet to Dhaka for next Friday."*
   - Extracted: `{ origin: "Sylhet", destination: "Dhaka", date: "{next_friday}", seatCount: 3, busType: "NON_AC" }`

---

## 4. Slot Filling & Clarification Workflow
If critical entities are missing (e.g., origin or destination missing), the engine returns `clarificationPrompt`:
- Example: *"ঢাকা থেকে আপনি কোন শহরে যেতে চাচ্ছেন?"* (Which city are you traveling to from Dhaka?)
- When all required slots are filled, the engine calls the Booking Service API (`GET /api/trips`) and returns matching trips to the frontend.

