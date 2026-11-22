@search
Feature: The forum search, topic tags and views
  As a visitor of the forums
  I want to search them and follow their tags
  So that I find the topic that answers my question

  Scenario: The search finds topics and replies, and opens one
    Given I am an anonymous user
    When I search the forums for "marigolds"
    Then the search should find 2 matches
    And the search results should show "A community garden in spring"
    And the search results should show "Marigolds keep the aphids away from the tomatoes."
    And the search results should show "We planted tomatoes, basil and marigolds this year."
    And the search result "A community garden in spring" should be a topic in "General discussion"
    And the search result "A community garden in spring" should be a reply
    And the forum breadcrumbs should be "Home", "Forums", "Search" and "Search Results for 'marigolds'"
    When I open the search result "A community garden in spring"
    Then I should be reading the topic "A community garden in spring"

  Scenario: A search with no match says so
    Given I am an anonymous user
    When I search the forums for "nothingmatchesthisword"
    Then the search should find 0 matches
    And the forums should say "Oh, bother! No search results were found here."
    And the search results should not show "A community garden in spring"

  Scenario: The search has pages
    Given I am an anonymous user
    When I search the forums for "long conversation"
    Then the search should find 18 matches
    And I should be on page 1
    When I go to page 2
    Then I should be on page 2
    And the search should find 18 matches

  Scenario: The search shows an account only what it may read
    Given I am an anonymous user
    When I search the forums for "meetup"
    Then the search results should show "The spring meetup is over"
    But the search results should not show "Members only: the next meetup"
    Given I am a logged in user with the "participant" user
    When I search the forums for "meetup"
    Then the search results should show "Members only: the next meetup"
    When I search the forums for "moderation notes"
    Then the search should find 0 matches
    Given I am a logged in user with the "moderator" user
    When I search the forums for "moderation notes"
    Then the search results should show "Staff only: the moderation notes"

  Scenario: A topic tag has a page with its topics, from every forum
    Given I am an anonymous user
    When I open the topic "A community garden in spring" in "General discussion"
    Then the topic should be tagged "spring"
    When I open the topic tag "spring"
    Then the forum breadcrumbs should be "Home", "Forums" and "Topic Tag: spring"
    And the forum should have 2 topics
    And the forum should list the topic "A community garden in spring"
    And the forum should list the topic "The spring meetup is over"
    When I open the topic tag "howto"
    Then the forum should list the topic "How do I change my password?"
    And the forum should list the topic "A long conversation"
    And the forum should not list the topic "Forum rules"

  Scenario: The views of the forums
    Given I am an anonymous user
    When I open the forum view "Most popular topics"
    Then the first topic of the forum should be "A long conversation"
    And the forum breadcrumbs should be "Home", "Forums" and "Most popular topics"
    When I open the forum view "Topics with no replies"
    Then the forum should list the topic "Showcase entry 16"
    And the forum should not list the topic "Welcome to the forums"
    And the forum should have 18 topics
