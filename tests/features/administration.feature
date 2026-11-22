@administration
Feature: The forums in the administration
  As the keymaster of the forums
  I want the lists, the settings and the tools of the forums
  So that I can run them

  Scenario: The screens of the forums open by their names
    Given I am a logged in user with the "keymaster" user
    When I go to the "Forums" admin screen
    Then I should be on the "Forums" admin screen
    When I go to the "Topics" admin screen
    Then I should be on the "Topics" admin screen
    When I go to the "Replies" admin screen
    Then I should be on the "Replies" admin screen
    When I go to the "Topic Tags" admin screen
    Then I should be on the "Topic Tags" admin screen
    When I go to the "Forums settings" admin screen
    Then I should be on the "Forums settings" admin screen
    When I go to the "Forum tools" admin screen
    Then I should be on the "Forum tools" admin screen

  Scenario: The lists of the administration hold the forums, the topics and the replies
    Given I am a logged in user with the "keymaster" user
    Then the forums list should include "General discussion"
    And the forums list should include "Staff room"
    And the forums list should not include "Webship test forum"
    And the topics list should include "Welcome to the forums"
    And the topics list should not include "Webship test topic that is not there"
    And the replies list should include "Reply To: Welcome to the forums"
    And the topic "The spring meetup is over" should be closed in the topics list
    And the topic "Welcome to the forums" should be sticky in the topics list
    And the topic "A community garden in spring" should be open in the topics list
    And the topic "A community garden in spring" should not be sticky in the topics list
    And the forum "Archive" should be closed in the forums list
    And the forum "Showcase" should be open in the forums list

  Scenario: A moderator works on a topic from the topics list
    Given there is a topic "Webship test topic" in "General discussion" by "participant"
    And I am a logged in user with the "moderator" user
    When I close the topic "Webship test topic" from the topics list
    Then I should see a success notice "successfully closed"
    And the topic "Webship test topic" should be closed in the topics list
    When I open the topic "Webship test topic" from the topics list
    Then the topic "Webship test topic" should be open in the topics list
    When I stick the topic "Webship test topic" from the topics list
    Then the topic "Webship test topic" should be sticky in the topics list
    When I unstick the topic "Webship test topic" from the topics list
    Then the topic "Webship test topic" should not be sticky in the topics list
    When I unapprove the topic "Webship test topic" from the topics list
    Then the topic "Webship test topic" should be pending in the topics list
    When I approve the topic "Webship test topic" from the topics list
    And I spam the topic "Webship test topic" from the topics list
    Then the topic "Webship test topic" should be spam in the topics list
    When I unspam the topic "Webship test topic" from the topics list
    And I trash the topic "Webship test topic" from the topics list
    Then the topic "Webship test topic" should be in the trash in the topics list
    And the topics list should not include "Webship test topic"
    When I restore the topic "Webship test topic" from the topics trash
    Then the topics list should include "Webship test topic"
    When I trash the topic "Webship test topic" from the topics list
    And I delete the topic "Webship test topic" from the topics trash
    Then the topics list should not include "Webship test topic"
    And the topic "A community garden in spring" should not be in the trash in the topics list

  Scenario: The keymaster closes a forum from the forums list and opens it again
    Given I am a logged in user with the "keymaster" user
    When I close the forum "Showcase" from the forums list
    Then the forum "Showcase" should be closed in the forums list
    Given I am a logged in user with the "participant" user
    When I open the forum "Showcase"
    Then I should not be able to start a topic
    Given I am a logged in user with the "keymaster" user
    When I open the forum "Showcase" from the forums list
    Then the forum "Showcase" should be open in the forums list
    Given I am a logged in user with the "participant" user
    When I open the forum "Showcase"
    Then I should be able to start a topic

  Scenario: The settings of the forums
    Given I am a logged in user with the "keymaster" user
    When I go to the "Forums settings" admin screen
    Then the forum feature "Favorites" should be on
    And the forum feature "Subscriptions" should be on
    And the forum feature "Topic tags" should be on
    And the forum feature "Search" should be on
    And the forum feature "Revisions" should be on
    And the forum feature "Anonymous" should be off
    And the forum feature "Reply Threading" should be off
    And the "Forum Root" setting should be "forums"
    And the "Topic Tag" setting should be "topic-tag"

  Scenario: A feature turned off is gone from the forums, and comes back
    Given I am a logged in user with the "keymaster" user
    When I go to the "Forums settings" admin screen
    And I turn the forum feature "Favorites" off
    And I save the settings
    Then I should see a success notice "Settings saved."
    And the forum feature "Favorites" should be off
    When I open my forum profile
    Then the forum profile should not offer the page "Favorites"
    When I go to the "Forums settings" admin screen
    And I turn the forum feature "Favorites" on
    And I save the settings
    Then the forum feature "Favorites" should be on
    When I open my forum profile
    Then the forum profile should offer the page "Favorites"

  Scenario: The repair tools of the forums
    Given I am a logged in user with the "keymaster" user
    When I run the forum repair tool "Recount topics in each forum"
    Then I should see a success notice "Counting the number of topics in each forum"
    When I run the forum repair tool "Recount replies in each topic"
    Then I should see a success notice "Complete!"
    When I go to the forum index
    Then the forum "Showcase" should have 16 topics in the list

  Scenario: The users screen shows the forum role of each account, and changes one
    Given I am a logged in user with the "admin" user
    Then the users screen should show the forum role "Keymaster" for "admin"
    And the users screen should show the forum role "Moderator" for "moderator"
    And the users screen should show the forum role "Blocked" for "blocked"
    When I change the forum role of "spectator" to "Participant"
    Then the users screen should show the forum role "Participant" for "spectator"
    And the forum role of "spectator" should be "Participant"
    When I change the forum role of "spectator" to "Spectator"
    Then the users screen should show the forum role "Spectator" for "spectator"
