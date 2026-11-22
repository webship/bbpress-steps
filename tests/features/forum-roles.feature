@roles
Feature: The forum roles
  As the keymaster of the forums
  I want each forum role to reach what it should and nothing more
  So that the private and the hidden forums stay that way

  Scenario: A participant reads the private forum, not the hidden one
    Given I am a logged in user with the "participant" user
    And I am on the forum index
    Then the forum index should list the forum "Members lounge"
    And the forum "Members lounge" should be private in the list
    But the forum index should not list the forum "Staff room"
    When I open the forum "Members lounge"
    Then the forum should list the topic "Members only: the next meetup"
    And I should be able to start a topic

  @js-off
  Scenario: The hidden forum is not found by a participant
    Given I am a logged in user with the "participant" user
    Then I should not be allowed to open "/forums/forum/staff-room/"

  Scenario: A moderator and a keymaster read the hidden forum
    Given I am a logged in user with the "moderator" user
    And I am on the forum index
    Then the forum index should list the forum "Staff room"
    And the forum "Staff room" should be hidden in the list
    And the forum "Staff room" should not be private in the list
    When I open the forum "Staff room"
    Then the forum should list the topic "Staff only: the moderation notes"
    Given I am a logged in user with the "keymaster" user
    When I open the forum "Staff room"
    Then I should be in the forum "Staff room"
    And I should be able to start a topic

  @js-off
  Scenario: A visitor does not find the private and the hidden forum
    Given I am an anonymous user
    Then I should not be allowed to open "/forums/forum/members-lounge/"
    And I should not be allowed to open "/forums/forum/staff-room/"
    And I should not be allowed to open "/forums/topic/members-only-the-next-meetup/"

  @js-off
  Scenario: A spectator reads the public forums and writes nothing
    Given I am a logged in user with the "spectator" user
    And I am on the forum index
    Then the forum index should list the forum "Showcase"
    But the forum index should not list the forum "Members lounge"
    When I open the forum "General discussion"
    Then I should not be able to start a topic
    And the forums should say "You cannot create new topics."
    When I open the topic "Welcome to the forums" in "General discussion"
    Then I should not be able to reply
    And the forums should say "You cannot reply to this topic."
    And I should not see the moderator tools
    And I should not be allowed to open "/forums/forum/members-lounge/"

  @js-off
  Scenario: A blocked account gets no forum at all
    Given I am a logged in user with the "blocked" user
    Then I should not be allowed to open "/forums/"
    And I should not be allowed to open "/forums/forum/showcase/"
    And I should not be allowed to open "/forums/topic/welcome-to-the-forums/"
    And I should be logged in

  Scenario: The keymaster may post where a forum is closed, a moderator may not
    Given I am a logged in user with the "keymaster" user
    When I open the forum "Archive"
    Then I should be able to start a topic
    And the forums should say "This forum is marked as closed to new topics, however your posting capabilities still allow you to create a topic."
    Given I am a logged in user with the "moderator" user
    When I open the forum "Archive"
    Then I should not be able to start a topic

  @js-off
  Scenario: The administration of the forums by role
    Given I am a logged in user with the "keymaster" user
    When I go to the "Dashboard" admin screen
    Then the admin menu should list "Forums"
    And the admin menu should list "Topics"
    And the admin menu should list "Replies"
    Given I am a logged in user with the "moderator" user
    When I go to the "Dashboard" admin screen
    Then the admin menu should list "Topics"
    And the admin menu should list "Replies"
    But the admin menu should not list "Forums"
    Given I am a logged in user with the "participant" user
    Then I should not be allowed to open "/wp-admin/edit.php?post_type=topic"
    And I should not be allowed to open "/wp-admin/options-general.php?page=bbpress"
