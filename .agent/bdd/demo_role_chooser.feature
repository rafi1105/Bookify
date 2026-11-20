Feature: Demo role chooser
  Scenario: Switch roles after signing out
    Given I am signed in as a passenger
    When I sign out and choose Admin
    Then the active role is Admin and the workspace opens

  Scenario: Choose a vendor account
    Given I am signed out
    When I choose Vendor and select a demo vendor
    Then the workspace session is scoped to that vendor
