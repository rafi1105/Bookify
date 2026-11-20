Feature: Simulated passenger trip tracking
  Scenario: Only selected demo buses are disrupted
    Given three fictional demo trips
    When their randomized scenarios reach the disruption tick
    Then one trip moves normally, one slows in traffic and one stops for a simulated accident

  Scenario: Simulated trips resume and arrive
    Given a demo trip with a simulated disruption
    When its disruption ends and it finishes the route
    Then the trip stays at 100 percent with zero speed and zero remaining travel time
