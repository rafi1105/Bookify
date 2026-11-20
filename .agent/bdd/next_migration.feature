Feature: Unified Next.js application
  Scenario: Open a passenger or operator link
    Given Bookify is running on Next.js
    When I open an existing page URL directly
    Then its Bookify page renders

  Scenario: Preserve the raw Stripe webhook request
    Given Bookify is running on Next.js
    When Stripe sends a correctly signed JSON webhook
    Then Express can verify the original request bytes
