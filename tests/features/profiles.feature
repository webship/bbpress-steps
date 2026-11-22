@profiles
Feature: Forum profiles
  As a member of the forums
  I want a profile that shows what I wrote and the role I have
  So that the others know who they talk to

  Scenario: A visitor reads the forum profile of an account
    Given I am an anonymous user
    When I open the forum profile of "participant"
    Then the forum profile should show "@participant"
    And the forum profile should show "Forum Role: Participant"
    And the forum profile should show "Topics Started: 12"
    And the forum profile should show "Replies Created: 12"
    And the forum profile should not show "Forum Role: Moderator"
    And the forum profile should offer the page "Topics Started"
    And the forum profile should offer the page "Replies Created"
    And the forum profile should offer the page "Engagements"
    And the forum profile should offer the page "Favorites"
    But the forum profile should not offer the page "Subscriptions"
    And the forum profile should not offer the page "Edit"

  Scenario: The pages of a profile list the topics and the replies of the account
    Given I am an anonymous user
    When I open the forum profile of "moderator"
    And I open "Topics Started" in the forum profile
    Then the forum should list the topic "The spring meetup is over"
    And the forum should list the topic "A long conversation"
    And the forum should not list the topic "Staff only: the moderation notes"
    When I open "Replies Created" in the forum profile
    Then the forum profile should show "Welcome aboard. Ask in Help and support when you are stuck."
    When I open "Profile" in the forum profile
    Then the forum profile should show "Forum Role: Moderator"

  Scenario Outline: The profile of each account states its forum role
    Given I am an anonymous user
    Then the forum role of "<account>" should be "<role>"

    Examples:
      | account     | role        |
      | admin       | Keymaster   |
      | keymaster   | Keymaster   |
      | moderator   | Moderator   |
      | participant | Participant |
      | spectator   | Spectator   |
      | blocked     | Blocked     |

  Scenario: An account has more pages on its own profile, and edits it
    Given I am a logged in user with the "participant" user
    When I open my forum profile
    Then the forum profile should offer the page "Subscriptions"
    And the forum profile should offer the page "Edit"
    When I open "Edit" in the forum profile
    And I fill in "Biographical Info" with "Webship test: I grow tomatoes."
    And I save my forum profile
    Then the forums should say "User updated."
    When I open my forum profile
    Then the forum profile should show "Webship test: I grow tomatoes."
    When I open "Edit" in the forum profile
    And I fill in "Biographical Info" with ""
    And I save my forum profile
    Then the forums should say "User updated."
    When I open my forum profile
    Then the forum profile should not show "Webship test: I grow tomatoes."

  @js-off
  Scenario: An account cannot edit the profile of another
    Given I am a logged in user with the "participant" user
    Then I should not be allowed to open "/forums/users/moderator/edit/"
    When I open the forum profile of "moderator"
    Then the forum profile should not offer the page "Edit"
    And the forum profile should not offer the page "Subscriptions"
