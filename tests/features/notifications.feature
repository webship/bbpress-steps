@notifications
Feature: The notifications of the forums
  As a participant of the forums
  I want an e-mail when somebody replies to a topic I follow
  So that I do not have to look for the answer

  Scenario: A subscriber of a topic is notified of a reply, its author is not
    Given there is a topic "Webship test topic" in "General discussion" by "participant"
    And I am a logged in user with the "participant" user
    And I have no subscriptions
    When I open the topic "Webship test topic"
    And I subscribe to the topic
    Then the topic should be subscribed to
    Given "moderator" replied to the topic "Webship test topic" with "Webship test reply of the moderator."
    Then a forum notification with the subject "[General discussion] Webship test topic" should be sent to "participant"
    And the forum notification with the subject "Webship test topic" to "participant" should contain "moderator wrote:"
    And the forum notification with the subject "Webship test topic" to "participant" should contain "Webship test reply of the moderator."
    And the forum notification with the subject "Webship test topic" to "participant" should contain "Post Link:"
    And the forum notification with the subject "Webship test topic" to "participant" should contain "You are receiving this email because you subscribed to a forum topic."
    But no forum notification should be sent to "moderator"
    And there is no topic "Webship test topic"

  Scenario: A subscriber of a forum is notified of a new topic
    Given there is no topic "Webship test question"
    And I am a logged in user with the "participant" user
    And I have no subscriptions
    When I open the forum "Help and support"
    And I subscribe to the forum
    Then the forum should be subscribed to
    Given there is a topic "Webship test question" in "Help and support" by "moderator"
    Then a forum notification with the subject "[Help and support] Webship test question" should be sent to "participant"
    And the forum notification with the subject "Webship test question" to "participant" should contain "Topic Link:"
    And the forum notification with the subject "Webship test question" to "participant" should contain "You are receiving this email because you subscribed to a forum."
    Given I am a logged in user with the "participant" user
    And I have no subscriptions
    And there is no topic "Webship test question"

  Scenario: Nobody is notified of a reply to a topic nobody follows
    Given there is a topic "Webship test topic" in "General discussion" by "participant"
    And "moderator" replied to the topic "Webship test topic" with "Webship test reply of the moderator."
    Then no forum notification should be sent to "participant"
    And no forum notification should be sent to "moderator"
    And there is no topic "Webship test topic"
