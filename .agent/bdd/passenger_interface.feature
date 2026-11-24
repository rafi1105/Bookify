Feature: Minimal passenger interface
  Scenario: Search for a departure
    Given I am on the home page
    When I enter different cities, a travel date and an optional coach class
    Then I reach the trip results for those criteria

  Scenario: Navigate on a narrow screen
    Given I open Bookify on a narrow screen
    When I open the main menu and select My bookings
    Then the menu closes and My bookings opens
