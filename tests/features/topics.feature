@topics
Feature: Topics and replies
  As a participant of the forums
  I want to read topics, start my own and reply to others
  So that I can take part in the community

  @critical
  Scenario: A visitor reads a topic and its replies
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    Then I should be reading the topic "Welcome to the forums"
    And the forum breadcrumbs should be "Home", "Forums", "Community", "General discussion" and "Welcome to the forums"
    And the forums should say "This topic has 2 replies, 3 voices"
    And the topic should have 3 posts
    And post 1 should be by "keymaster"
    And post 1 should read "Say hello and tell us what you are working on."
    And the author of post 1 should be a "Keymaster"
    And post 2 should be by "participant"
    And the author of post 2 should be a "Participant"
    And the last post should be by "moderator"
    And the last post should read "Welcome aboard."
    And the author of the last post should be a "Moderator"
    And the topic should be open
    And the topic should be tagged "welcome"
    And the topic should not be tagged "howto"
    And I should not be able to reply
    And the forums should say "You must be logged in to reply to this topic."

  Scenario: A long topic has pages
    Given I am an anonymous user
    When I open the topic "A long conversation" in "Help and support"
    Then the topic should have 18 posts
    And I should be on page 1
    And post 1 should read "This topic has more replies than one page shows."
    And the last post should read "Reply number 14 of the long conversation."
    When I go to page 2
    Then I should be on page 2
    And post 1 should read "Reply number 15 of the long conversation."
    And the last post should read "Reply number 17 of the long conversation."
    And the last post should be by "participant"

  Scenario: A closed topic takes no replies from a participant
    Given I am a logged in user with the "participant" user
    When I open the topic "The spring meetup is over" in "General discussion"
    Then the topic should be closed
    And the topic should not be open
    And I should not be able to reply
    And the forums should say "The topic ‘The spring meetup is over’ is closed to new replies."

  Scenario: A participant starts a topic with tags, and a moderator replies to it
    Given there is no topic "Webship test topic"
    And I am a logged in user with the "participant" user
    When I start a new topic in "General discussion"
    And I write the topic title "Webship test topic"
    And I write "Webship test: the first post of the topic." in the editor
    And I tag the topic with "webship, test"
    And I submit the post
    Then I should be reading the topic "Webship test topic"
    And the topic should have 1 post
    And post 1 should be by "participant"
    And post 1 should read "Webship test: the first post of the topic."
    And the topic should be tagged "webship"
    And the topic should be tagged "test"
    And post 1 should offer the link "Edit"
    And post 1 should not offer the link "Trash"
    When I open the forum "General discussion"
    Then the forum should have 5 topics
    And the topic "Webship test topic" should be by "participant" in the list
    Given "moderator" replied to the topic "Webship test topic" with "Webship test reply of the moderator."
    And I am a logged in user with the "participant" user
    When I open the topic "Webship test topic" in "General discussion"
    Then the topic should have 2 posts
    And the last post should be by "moderator"
    And the last post should read "Webship test reply of the moderator."
    And the last post should not offer the link "Edit"
    When I reply to the topic with "Webship test: thank you."
    Then the topic should have 3 posts
    And the last post should be by "participant"
    And the last post should read "Webship test: thank you."
    And there is no topic "Webship test topic"

  Scenario: The forums refuse a topic without a title or a text
    Given I am a logged in user with the "participant" user
    When I start a new topic in "General discussion"
    And I try to submit the post
    Then the editor should show the error "Your topic needs a title."
    And the editor should show the error "Your topic cannot be empty."
    When I write the topic title "Webship test topic without a text"
    And I try to submit the post
    Then the editor should show the error "Your topic cannot be empty."
    When I open the forum "General discussion"
    Then the forum should not list the topic "Webship test topic without a text"

  Scenario: The forums refuse an empty reply
    Given I am a logged in user with the "participant" user
    When I open the topic "A community garden in spring" in "General discussion"
    Then I should be able to reply
    When I write "" in the editor
    And I try to submit the post
    Then the editor should show the error "Your reply cannot be empty."
    And the topic should have 2 posts

  Scenario: The toolbar of the editor formats a post
    Given there is a topic "Webship test topic" in "General discussion" by "participant"
    And I am a logged in user with the "participant" user
    When I open the topic "Webship test topic"
    And I write "Webship test: " in the editor
    And I add "bold words" to the editor with the "b" button
    And I add " and " to the editor
    And I add "important" to the editor with the "i" button
    And I add "a quoted line" to the editor with the "b-quote" button
    And I add "wp-config.php" to the editor with the "code" button
    And I add "no longer true" to the editor with the "del" button
    Then the editor should contain "<strong>bold words</strong>"
    And the editor should contain "<blockquote>a quoted line</blockquote>"
    When I submit the post
    Then the topic should have 2 posts
    And the last post should show "bold words" in bold
    And the last post should show "important" in italics
    And the last post should show "a quoted line" as a quote
    And the last post should show "wp-config.php" as code
    And the last post should show "no longer true" struck through
    And the last post should read "Webship test: bold words and important"
    And there is no topic "Webship test topic"

  Scenario: An account edits its own post, with a reason the forums keep in the edit log
    Given there is a topic "Webship test topic" in "General discussion" by "participant" with:
      """
      Webship test: the text before the edit.
      """
    And I am a logged in user with the "participant" user
    When I open the topic "Webship test topic"
    Then post 1 should read "Webship test: the text before the edit."
    When I edit post 1
    Then the editor should contain "Webship test: the text before the edit."
    When I write the topic title "Webship test topic, renamed"
    And I write "Webship test: the text after the edit, with a <a href='https://example.com/docs'>link to the documentation</a>." in the editor
    And I give the edit reason "Clearer title"
    And I submit the post
    Then I should be reading the topic "Webship test topic, renamed"
    And post 1 should read "Webship test: the text after the edit"
    And post 1 should show "link to the documentation" as a link
    And the edit log of post 1 should show "This topic was modified"
    And the edit log of post 1 should show "by participant"
    And the edit log of post 1 should show "Reason: Clearer title"
    And there is no topic "Webship test topic, renamed"
