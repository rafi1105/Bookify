Feature: Live map of buses, traffic and route search

  Scenario: Admin sees every operator's buses in their colours
    Given two operators with buses on trips
    When the admin opens /admin/live-map
    Then each bus moves along its road in its operator's colour
    And each bus shows its speed, an arrival countdown and whether it is on schedule

  Scenario: An operator sees only their own buses
    Given operator A and operator B both have buses on trips
    When operator A opens /operator/live-map
    Then only operator A's buses are listed and drawn

  Scenario: A driver's phone replaces the simulated position
    Given an operator created a driver link for a bus on a trip
    When the driver opens the link and starts sharing
    Then the bus is drawn at the phone's GPS position within a few seconds
    And it returns to its simulated position 2 minutes after the phone stops

  Scenario: Simulated traffic slows buses
    Given simulated traffic is on
    When a jam appears on a bus's road ahead of it
    Then the stretch is coloured orange or red and labelled simulated
    And the bus slows down inside it and its arrival estimate moves later

  Scenario: Searching a city on a longer route
    Given a Dhaka to Rangpur coach that drops at Bogura
    When a passenger searches Dhaka to Bogura
    Then the shortest road from Dhaka to Bogura is drawn on a map
    And the Dhaka to Rangpur coach is listed with a note to drop at Bogura
