---
name: multilingual-voice-ai
description: Guides the implementation and testing of the Bookify Voice Booking Engine, Whisper speech-to-text, and LangChain entity extraction in Bangla, English, and Banglish.
---

# Multilingual AI Voice Booking Skill

Activate this skill when building or tuning the Voice Booking assistant in `services/ai-engine` or frontend microphone interaction components.

## Pipeline Architecture
1. **Audio Ingestion**: Accepts 16kHz mono audio streams or WebM from the browser/mobile.
2. **Whisper Transcription**: Calls Whisper model with prompt conditioning for Bangladeshi transit terminology (e.g., "সোহাগ", "গ্রীন লাইন", "এসি", "নন-এসি", "স্লিপার", "ভাড়া").
3. **Language Routing**: Detects language (`bn-BD`, `en-US`, or mixed Banglish).
4. **LangChain Entity Extraction**:
   - Extracts `origin`, `destination`, `date`, `seatCount`, `busType`, `preferredTime`.
   - Normalizes colloquial date expressions like "আগামীকাল" (tomorrow), "পরশু" (day after tomorrow), "সামনের শুক্রবার" (next Friday) into ISO 8601 `YYYY-MM-DD`.
5. **Slot Completion & Clarification**:
   - If origin or destination is missing, return polite voice/text prompt requesting the missing information.
   - Once all required slots are present, trigger trip search.

