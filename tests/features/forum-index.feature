@forums
Feature: The forum index and a forum
  As a visitor of the site
  I want to find my way through the forums and their topics
  So that I can read what the community wrote

  @critical
  Scenario: A visitor sees the public forums, under their category
    Given I am an anonymous user
    And I am on the forum index
    Then the forum index should list the forum "Community"
    And the forum index should list the forum "General discussion" in the category "Community"
    And the forum index should list the forum "Help and support" in the category "Community"
    And the forum index should list the forum "Showcase"
    And the forum index should list the forum "Archive"
    But the forum index should not list the forum "Members lounge"
    And the forum index should not list the forum "Staff room"
    And the forum breadcrumbs should be "Home" and "Forums"

  Scenario: The index counts the topics and the posts of each forum, and marks them
    Given I am an anonymous user
    When I go to the forum index
    Then the forum "Community" should be a category in the list
    And the forum "Community" should have 7 topics in the list
    And the forum "Community" should have 30 posts in the list
    And the forum "Showcase" should have 16 topics in the list
    And the forum "Showcase" should not be a category in the list
    And the forum "Archive" should be closed in the list
    And the forum "Archive" should have 2 posts in the list
    And the forum "Showcase" should not be closed in the list

  Scenario: A category lists its forums
    Given I am an anonymous user
    When I open the forum "Community"
    Then I should be in the forum "Community"
    And the forum should list the subforum "General discussion"
    And the forum should list the subforum "Help and support"
    And the forum should not list the subforum "Showcase"
    And the forum "General discussion" should have 4 topics in the list
    And the forums should say "This category has 7 topics, 23 replies"
    And I should not be able to start a topic

  Scenario: A forum lists its topics: the sticky ones first, then by their last post
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then I should be in the forum "General discussion"
    And the forum breadcrumbs should be "Home", "Forums", "Community" and "General discussion"
    And the forums should say "This forum has 4 topics, 4 replies"
    And the forum should have 4 topics
    And the first topic of the forum should be "Forum rules"
    And the topic "Forum rules" should be super sticky in the list
    And the topic "Welcome to the forums" should be sticky in the list
    And the topic "Welcome to the forums" should not be super sticky in the list
    And the topic "A community garden in spring" should not be sticky in the list
    And the topic "The spring meetup is over" should be closed in the list
    And the topic "A community garden in spring" should not be closed in the list
    And the forum should not list the topic "Showcase entry 01"

  Scenario: The row of a topic names its author and counts its replies and voices
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the topic "Welcome to the forums" should be by "keymaster" in the list
    And the topic "Welcome to the forums" should have 2 replies in the list
    And the topic "Welcome to the forums" should have 3 voices in the list
    And the topic "Forum rules" should have 0 replies in the list
    And the topic "A community garden in spring" should be by "participant" in the list
    And the topic "A community garden in spring" should have 1 reply in the list

  Scenario: A forum with more topics than a page shows has pages
    Given I am an anonymous user
    When I open the forum "Showcase"
    # Its own sixteen topics, and the super sticky topic every forum lists.
    Then the forum should have 17 topics
    And I should be on page 1
    And the first topic of the forum should be "Forum rules"
    And the forum should list the topic "Showcase entry 16"
    And the forum should not list the topic "Showcase entry 01"
    When I go to page 2
    Then I should be on page 2
    And the forum should list the topic "Showcase entry 01"
    And the forum should not list the topic "Showcase entry 16"
    When I go to page 1
    Then I should be on page 1

  Scenario: A visitor reads a forum but is asked to log in before posting
    Given I am an anonymous user
    When I open the forum "Help and support"
    Then I should not be able to start a topic
    And the forums should say "You must be logged in to create new topics."

  Scenario: A closed forum takes no new topics
    Given I am a logged in user with the "participant" user
    When I open the forum "Archive"
    Then the forums should say "The forum ‘Archive’ is closed to new topics and replies."
    And I should not be able to start a topic
    And the forum should list the topic "The forums opened"
