Feature: Bookify Stripe demo
  Scenario: An approved trip can be sold
    Given a vendor bus and a submitted route and fare
    When the admin approves the proposal and the vendor publishes a departure
    Then a passenger can reserve an available seat and start Stripe test checkout

  Scenario: Stripe returns a payment after the seat hold expires
    Given an expired seat hold
    When Stripe reports a successful payment
    Then the system refunds the payment without issuing a ticket

  Scenario: Resume interrupted checkout
    Given a passenger owns a booking with an active seat hold and an open Stripe session
    When the passenger resumes payment from My Bookings
    Then Stripe opens the same checkout session

  Scenario: See cancellation terms and receive the ticket
    Given a passenger selected seats for an upcoming departure
    When the passenger reviews checkout and Stripe confirms payment
    Then checkout shows the refund amount and deadline and the configured test recipient receives the boarding ticket
