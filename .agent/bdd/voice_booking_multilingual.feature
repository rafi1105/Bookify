Feature: Multilingual Voice Booking with Whisper and LangChain
  As a passenger preferring voice interaction
  I want to speak in Bangla, English, or Banglish
  So that I can search and book bus tickets without typing

  Scenario: Full Bengali voice booking command
    Given the voice booking microphone is active
    When the user speaks: "আগামীকাল ঢাকা থেকে খুলনার দুইটা AC টিকিট বুক করো"
    Then the Whisper STT service should transcribe the audio to text
    And the detected language must be "bn-BD"
    And the LangChain entity extractor should parse:
      | entity      | value      |
      | intent      | BOOK_TICKET|
      | origin      | Dhaka      |
      | destination | Khulna     |
      | date        | TOMORROW   |
      | seatCount   | 2          |
      | busType     | AC         |
    And the system returns available AC trips from Dhaka to Khulna for tomorrow

  Scenario: Banglish voice query with partial details
    Given the voice booking microphone is active
    When the user speaks: "Kalke sokale Cox's Bazar er bus ache?"
    Then the system identifies origin is missing
    And the system asks for clarification: "আপনি কোথা থেকে কক্সবাজার যেতে চাচ্ছেন?"
    When the user responds: "Dhaka theke"
    Then the complete itinerary is formed for "Dhaka -> Cox's Bazar" on tomorrow morning

