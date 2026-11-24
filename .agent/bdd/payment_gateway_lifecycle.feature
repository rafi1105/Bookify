Feature: Payment Gateway Lifecycle, Webhooks & Wallet Refund
  As a Bookify customer
  I want to securely pay via bKash, Nagad, or Cards and receive instant refund to my wallet upon cancellation

  Scenario: Successful bKash Checkout and QR Ticket generation
    Given customer "Shohail" has locked seat "B1" on trip "TRIP-502"
    And the total amount is "1200.00 BDT"
    When "Shohail" selects "BKASH" and completes payment
    And the bKash webhook notifies Bookify with transaction "TRX88192"
    Then the payment status changes to "SUCCESS"
    And the booking status changes to "CONFIRMED"
    And an encrypted QR ticket with HMAC signature is generated
    And a downloadable PDF invoice is available in the user profile

  Scenario: Cancelling ticket 24 hours prior and receiving Wallet Refund
    Given customer "Shohail" has a confirmed booking "BK-9001" departing in 48 hours
    When "Shohail" requests to cancel booking "BK-9001"
    Then the platform applies a 10% cancellation fee
    And credits "1080.00 BDT" to "Shohail"'s Bookify Wallet
    And the booking status changes to "REFUNDED"
    And the reserved seat "B1" is set back to "AVAILABLE" in the search engine

