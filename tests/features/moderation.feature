@moderation
Feature: Moderation
  As a moderator of the forums
  I want to close, stick, hide, merge, split and move what the members post
  So that the forums stay in order

  Scenario: A participant has no moderator tools, a moderator has them
    Given I am a logged in user with the "participant" user
    When I open the topic "A community garden in spring" in "General discussion"
    Then I should not see the moderator tools
    And post 1 should offer the link "Edit"
    And post 1 should not offer the link "Close"
    And post 2 should not offer the link "Split"
    Given I am a logged in user with the "moderator" user
    When I open the topic "A community garden in spring" in "General discussion"
    Then I should see the moderator tools
    And post 1 should offer the link "Merge"
    And post 1 should offer the link "Close"
    And post 1 should offer the link "Stick"
    And post 2 should offer the link "Move"
    And post 2 should offer the link "Split"

  Scenario: A moderator closes a topic and opens it again
    Given there is a topic "Webship test topic" in "General discussion" by "moderator"
    And I am a logged in user with the "moderator" user
    When I open the topic "Webship test topic"
    And I close the topic
    Then the topic should be closed
    And the forums should say "This topic is marked as closed to new replies, however your posting capabilities still allow you to reply."
    Given I am a logged in user with the "participant" user
    When I open the topic "Webship test topic" in "General discussion"
    Then the topic should be closed
    And I should not be able to reply
    Given I am a logged in user with the "moderator" user
    When I open the topic "Webship test topic" in "General discussion"
    And I open the topic
    Then the topic should be open
    Given I am a logged in user with the "participant" user
    When I open the topic "Webship test topic" in "General discussion"
    Then I should be able to reply
    And there is no topic "Webship test topic"

  Scenario: A moderator sticks a topic to the top of its forum, then to the front of every forum
    Given there is a topic "Webship test topic" in "Help and support" by "participant"
    And I am a logged in user with the "moderator" user
    When I open the topic "Webship test topic"
    Then the topic should not be sticky
    When I stick the topic
    Then the topic should be sticky
    When I open the forum "Help and support"
    Then the topic "Webship test topic" should be sticky in the list
    And the topic "Webship test topic" should not be super sticky in the list
    When I open the forum "Showcase"
    Then the forum should not list the topic "Webship test topic"
    When I open the topic "Webship test topic" in "Help and support"
    And I unstick the topic
    Then the topic should not be sticky
    When I stick the topic to the front
    Then the topic should be sticky
    When I open the forum "Showcase"
    Then the forum should list the topic "Webship test topic"
    And the topic "Webship test topic" should be super sticky in the list
    When I open the topic "Webship test topic" in "Help and support"
    And I unstick the topic
    Then the topic should not be sticky
    And there is no topic "Webship test topic"

  Scenario: A topic a moderator unapproves is hidden from the members until it is approved
    Given there is a topic "Webship test topic" in "General discussion" by "participant"
    And I am a logged in user with the "moderator" user
    When I open the topic "Webship test topic"
    And I unapprove the topic
    Then the topic should be pending
    And the forums should say "This topic is pending moderation."
    # The forum's list hides a pending topic from a moderator too, until it asks for it.
    When I open the forum "General discussion"
    Then the forum should not list the topic "Webship test topic"
    And the forums should say "(+1 hidden)"
    When I show the hidden topics
    Then the topic "Webship test topic" should be pending in the list
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the forum should not list the topic "Webship test topic"
    Given I am a logged in user with the "moderator" user
    When I open the forum "General discussion"
    And I show the hidden topics
    And I open the topic "Webship test topic"
    And I approve the topic
    Then the topic should be open
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the forum should list the topic "Webship test topic"
    And there is no topic "Webship test topic"

  Scenario: A moderator marks a topic as spam and takes the mark away
    Given there is a topic "Webship test topic" in "General discussion" by "participant"
    And I am a logged in user with the "moderator" user
    When I open the topic "Webship test topic"
    And I spam the topic
    Then the topic should be spam
    And the forums should say "This topic is marked as spam."
    When I unspam the topic
    Then the topic should be open
    And the topic should not be spam
    And there is no topic "Webship test topic"

  Scenario: A moderator trashes a topic, restores it, and deletes it for good
    Given there is a topic "Webship test topic" in "General discussion" by "participant"
    And "moderator" replied to the topic "Webship test topic" with "Webship test reply of the moderator."
    And I am a logged in user with the "moderator" user
    When I open the topic "Webship test topic"
    And I trash the topic
    Then the topic should be in the trash
    And the forums should say "This topic is in the trash."
    When I restore the topic
    Then the topic should be open
    And the topic should have 2 posts
    When I delete the topic permanently
    And I open the forum "General discussion"
    Then the forum should not list the topic "Webship test topic"
    And the forum should have 4 topics

  Scenario: A moderator hides a reply, and deletes another
    Given there is a topic "Webship test topic" in "General discussion" by "participant"
    And "participant" replied to the topic "Webship test topic" with "Webship test: a first reply."
    And "participant" replied to the topic "Webship test topic" with "Webship test: a second reply."
    And I am a logged in user with the "moderator" user
    When I open the topic "Webship test topic"
    And I unapprove the last post
    Then the last post should be pending
    When I approve the last post
    Then the last post should be published
    When I spam the last post
    Then the last post should be spam
    And the forums should say "This topic has 1 reply (+1 hidden)"
    Given I am an anonymous user
    When I open the topic "Webship test topic" in "General discussion"
    Then the topic should have 2 posts
    And the last post should read "Webship test: a first reply."
    Given I am a logged in user with the "moderator" user
    When I open the topic "Webship test topic" in "General discussion"
    # The forums hide the reply from a moderator too, until it asks for it.
    Then the topic should have 2 posts
    And the forums should say "(+1 hidden)"
    When I show the hidden posts
    Then the topic should have 3 posts
    And the last post should be spam
    And post 2 should not be spam
    When I unspam the last post
    Then the last post should be published
    When I trash the last post
    Then the last post should be in the trash
    When I restore the last post
    Then the last post should be published
    When I delete the last post permanently
    Then the topic should have 2 posts
    And the last post should read "Webship test: a first reply."
    And there is no topic "Webship test topic"

  Scenario: A moderator splits a topic, moves a reply, and merges the topics again
    Given there is no topic "Webship test split"
    And there is a topic "Webship test topic" in "General discussion" by "participant"
    And "participant" replied to the topic "Webship test topic" with "Webship test: a first reply."
    And "moderator" replied to the topic "Webship test topic" with "Webship test: a second reply."
    And "participant" replied to the topic "Webship test topic" with "Webship test: a third reply."
    And I am a logged in user with the "moderator" user
    When I open the topic "Webship test topic"
    Then the topic should have 4 posts
    When I split the topic from post 3 into "Webship test split"
    Then I should be reading the topic "Webship test split"
    And the topic should have 2 posts
    And post 1 should read "Webship test: a second reply."
    And post 1 should be by "moderator"
    And post 2 should read "Webship test: a third reply."
    When I open the topic "Webship test topic" in "General discussion"
    Then the topic should have 2 posts
    When I move the last post to the topic "Webship test split"
    Then I should be reading the topic "Webship test split"
    And the topic should have 3 posts
    When I merge the topic into "Webship test topic"
    Then I should be reading the topic "Webship test topic"
    And the topic should have 4 posts
    And post 1 should read "the first post of"
    When I open the forum "General discussion"
    Then the forum should not list the topic "Webship test split"
    And there is no topic "Webship test topic"
    And there is no topic "Webship test split"

  Scenario: A moderator moves a reply into a topic of its own
    Given there is no topic "Webship test: moved reply"
    And there is a topic "Webship test topic" in "General discussion" by "participant"
    And "participant" replied to the topic "Webship test topic" with "Webship test: a question of its own."
    And I am a logged in user with the "moderator" user
    When I open the topic "Webship test topic"
    And I move the last post to a new topic "Webship test: moved reply"
    Then I should be reading the topic "Webship test: moved reply"
    And the topic should have 1 post
    And post 1 should read "Webship test: a question of its own."
    And post 1 should be by "participant"
    And there is no topic "Webship test: moved reply"
    And there is no topic "Webship test topic"

  Scenario: A moderator moves a topic to another forum and edits it, with a reason
    Given there is a topic "Webship test topic" in "General discussion" by "participant"
    And I am a logged in user with the "moderator" user
    When I open the topic "Webship test topic"
    And I move the topic to "Help and support"
    Then the forum breadcrumbs should be "Home", "Forums", "Community", "Help and support" and "Webship test topic"
    When I open the forum "General discussion"
    Then the forum should not list the topic "Webship test topic"
    When I open the topic "Webship test topic" in "Help and support"
    And I edit post 1
    And I add " Webship test: the moderator added this." to the editor
    And I choose the topic type "Sticky"
    And I choose the topic status "Closed"
    And I give the edit reason "Moved to the right forum"
    And I submit the post
    Then the topic should be closed
    And the topic should be sticky
    And post 1 should read "Webship test: the moderator added this."
    And the edit log of post 1 should show "by moderator"
    And the edit log of post 1 should show "Reason: Moved to the right forum"
    And there is no topic "Webship test topic"
