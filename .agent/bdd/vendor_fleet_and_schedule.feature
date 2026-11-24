Feature: Vendor Fleet Management and AI Schedule Optimization
  As a bus operator / vendor
  I want to manage my fleet and receive AI optimization suggestions
  So that I can maximize bus seat occupancy and company revenue

  Background:
    Given vendor "Green Line Paribahan" is logged in to the Vendor Portal
    And has 12 Scania AC buses registered in the system

  Scenario: Approving an AI Schedule Shift Recommendation
    Given the AI Engine detects 32% occupancy on trip "Dhaka -> Khulna at 10:00 PM"
    And predicts +18.4% revenue increase if shifted to "01:00 PM"
    When the vendor views the AI Business Advisor dashboard
    Then an alert is displayed: "Move Bus from 10 PM to 1 PM next Friday to increase utilization"
    When the vendor clicks "Approve AI Schedule"
    Then the trip schedule is updated in the database to "13:00:00"
    And the AI recommendation record is marked as "APPROVED"
    And the search engine reflects the new 1:00 PM departure time immediately

  Scenario: Rejecting an AI Recommendation with operational reason
    Given an AI recommendation to add 1 extra bus to "Dhaka -> Cox's Bazar"
    When the vendor reviews the suggestion
    And the vendor clicks "Reject" with reason "All drivers booked on maintenance schedule"
    Then the recommendation status changes to "REJECTED"
    And the rejection rationale is logged to the AI training loop

