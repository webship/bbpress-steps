@engagement
Feature: Subscriptions and favorites
  As a participant of the forums
  I want to mark the topics I like and follow the ones I care about
  So that I find them again and hear of their replies

  Scenario: A participant marks a topic as a favorite and takes the mark away
    Given I am a logged in user with the "participant" user
    And I have no favorites
    When I open the topic "A community garden in spring" in "General discussion"
    Then the topic should not be a favorite
    When I favorite the topic
    Then the topic should be a favorite
    And my favorites should list "A community garden in spring"
    When I open the topic "A community garden in spring" in "General discussion"
    Then the topic should be a favorite
    When I unfavorite the topic
    Then the topic should not be a favorite
    And my favorites should not list "A community garden in spring"

  Scenario: A participant subscribes to a topic and a forum, and removes both from the profile
    Given I am a logged in user with the "participant" user
    And I have no subscriptions
    When I open the forum "Help and support"
    Then the forum should not be subscribed to
    When I subscribe to the forum
    Then the forum should be subscribed to
    When I open the topic "Where do the avatars come from?" in "Help and support"
    Then the topic should not be subscribed to
    When I subscribe to the topic
    Then the topic should be subscribed to
    And my subscribed forums should list "Help and support"
    And my subscribed topics should list "Where do the avatars come from?"
    When I remove "Where do the avatars come from?" from my subscribed topics
    Then my subscribed topics should not list "Where do the avatars come from?"
    When I remove "Help and support" from my subscribed forums
    Then my subscribed forums should not list "Help and support"
    When I open the forum "Help and support"
    Then the forum should not be subscribed to

  Scenario: A favorite is removed from the list of the profile
    Given I am a logged in user with the "participant" user
    And I have no favorites
    When I open the topic "Forum rules" in "General discussion"
    And I favorite the topic
    Then my favorites should list "Forum rules"
    When I remove "Forum rules" from my favorites
    Then my favorites should not list "Forum rules"
    When I open my forum profile
    And I open "Favorites" in the forum profile
    Then the forum profile should show "Oh, bother! No topics were found here."

  Scenario: A spectator reads a topic but cannot reply; it may still mark a favorite
    Given I am a logged in user with the "spectator" user
    And I have no favorites
    When I open the topic "Welcome to the forums" in "General discussion"
    Then I should not be able to reply
    When I favorite the topic
    Then the topic should be a favorite
    When I unfavorite the topic
    Then the topic should not be a favorite

  Scenario: The profile lists what the account started and where it wrote
    Given I am a logged in user with the "participant" user
    Then my topics started should list "A community garden in spring"
    And my topics started should not list "Forum rules"
    And my engagements should list "Welcome to the forums"
