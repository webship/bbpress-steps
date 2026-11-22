@must-fail @moderation
Feature: Assertions of moderation, subscriptions, favorites and profiles that must fail
  Each scenario asserts something that is not true on the test site. Its last step must fail with the message
  its description announces, and a hint (tests/check-must-fail.js runs them). They only read: the site is left as
  it was.

  Scenario: A participant cannot close a topic
    Fails with: Could not close the topic: it offers no "Close" link. It offers: "Reply".
    Given I am a logged in user with the "participant" user
    When I open the topic "Welcome to the forums" in "General discussion"
    And I close the topic

  Scenario: A topic that is open cannot be opened
    Fails with: Could not open the topic: it offers no "Open" link.
    Given I am a logged in user with the "moderator" user
    When I open the topic "A community garden in spring" in "General discussion"
    And I open the topic

  Scenario: A topic that is not sticky cannot be unstuck
    Fails with: Could not unstick the topic: it offers no "Unstick" link.
    Given I am a logged in user with the "moderator" user
    When I open the topic "A community garden in spring" in "General discussion"
    And I unstick the topic

  Scenario: A participant cannot stick a topic to the front
    Fails with: Could not stick the topic to the front: the post offers no such link.
    Given I am a logged in user with the "participant" user
    When I open the topic "Welcome to the forums" in "General discussion"
    And I stick the topic to the front

  Scenario: A participant cannot delete a topic
    Fails with: Could not trash the topic: it offers no "Trash" link. It offers: "Edit", "Reply".
    Given I am a logged in user with the "participant" user
    When I open the topic "A community garden in spring" in "General discussion"
    And I delete the topic permanently

  Scenario: A participant cannot merge topics
    Fails with: The topic offers this account no Merge link. It offers: "Edit", "Reply".
    Given I am a logged in user with the "participant" user
    When I open the topic "A community garden in spring" in "General discussion"
    And I merge the topic into "Welcome to the forums"

  Scenario: A topic of another forum is no destination of a merge
    Fails with: The list has no topic "Showcase entry 01".
    Given I am a logged in user with the "moderator" user
    When I open the topic "A community garden in spring" in "General discussion"
    And I merge the topic into "Showcase entry 01"

  Scenario: The topic's own post has no Split link
    Fails with: Post 1 offers no Split link.
    Given I am a logged in user with the "moderator" user
    When I open the topic "A community garden in spring" in "General discussion"
    And I split the topic from post 1 into "Webship test split"

  Scenario: A category takes no topic
    Fails with: The list has no forum "Community".
    Given I am a logged in user with the "moderator" user
    When I open the topic "A community garden in spring" in "General discussion"
    And I move the topic to "Community"

  Scenario: A participant cannot trash a reply
    Fails with: Could not trash the last post: it offers no "Trash" link. It offers: "Reply".
    Given I am a logged in user with the "participant" user
    When I open the topic "A community garden in spring" in "General discussion"
    And I trash the last post

  Scenario: The topic's own post is not deleted as a reply
    Fails with: Post 1 is the topic's own post.
    Given I am a logged in user with the "moderator" user
    When I open the topic "A community garden in spring" in "General discussion"
    And I delete post 1 permanently

  Scenario: The state of a reply
    Fails with: Expected the last post to be spam, but it is published.
    Given I am a logged in user with the "moderator" user
    When I open the topic "A community garden in spring" in "General discussion"
    Then the last post should be spam

  Scenario: A participant cannot move a reply
    Fails with: The last post offers no Move link. It offers: "Reply".
    Given I am a logged in user with the "participant" user
    When I open the topic "A community garden in spring" in "General discussion"
    And I move the last post to a new topic "Webship test: moved reply"

  Scenario: A participant has no moderator tools
    Fails with: Expected the moderator tools on the topic. Its posts offer: "Edit", "Reply"
    Given I am a logged in user with the "participant" user
    When I open the topic "A community garden in spring" in "General discussion"
    Then I should see the moderator tools

  Scenario: A moderator has the moderator tools
    Fails with: Expected no moderator tools on the topic, but it offers:
    Given I am a logged in user with the "moderator" user
    When I open the topic "A community garden in spring" in "General discussion"
    Then I should not see the moderator tools

  Scenario: A visitor cannot subscribe
    Fails with: The page offers this account no link to subscribe to the topic.
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    And I subscribe to the topic

  Scenario: A forum is not a topic to subscribe to
    Fails with: The page is not a topic: it is "General discussion"
    Given I am a logged in user with the "participant" user
    When I open the forum "General discussion"
    And I subscribe to the topic

  Scenario: A visitor cannot mark a favorite
    Fails with: The page offers this account no link to favorite the topic.
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    And I favorite the topic

  Scenario: A topic that is not a favorite
    Fails with: Expected the topic to be a favorite, but its link reads "Favorite".
    Given I am a logged in user with the "participant" user
    And I have no favorites
    When I open the topic "Welcome to the forums" in "General discussion"
    Then the topic should be a favorite

  Scenario: A forum that is not subscribed to
    Fails with: Expected the forum to be subscribed to, but its link reads "Subscribe".
    Given I am a logged in user with the "participant" user
    And I have no subscriptions
    When I open the forum "General discussion"
    Then the forum should be subscribed to

  Scenario: A favorite the profile does not list
    Fails with: Expected my favorites to list "Forum rules". They list: (none).
    Given I am a logged in user with the "participant" user
    And I have no favorites
    Then my favorites should list "Forum rules"

  Scenario: A topic the account started
    Fails with: Expected my topics started not to list "A community garden in spring", but they do.
    Given I am a logged in user with the "participant" user
    Then my topics started should not list "A community garden in spring"

  Scenario: Nothing to remove from the favorites
    Fails with: My favorites do not list "Forum rules". They list: (none).
    Given I am a logged in user with the "participant" user
    And I have no favorites
    When I remove "Forum rules" from my favorites

  Scenario: A visitor has no profile of its own
    Fails with: No account is logged in: the page has no toolbar of the site.
    Given I am an anonymous user
    When I open my forum profile

  @js-off
  Scenario: A profile that is not there
    Fails with: The forum profile of "webship-test-nobody" did not open: the site answered 404
    Given I am an anonymous user
    When I open the forum profile of "webship-test-nobody"

  Scenario: A page the profile of another does not offer
    Fails with: The forum profile offers no page "Subscriptions". It offers: "Profile", "Topics Started", "Replies Created", "Engagements", "Favorites".
    Given I am an anonymous user
    When I open the forum profile of "participant"
    And I open "Subscriptions" in the forum profile

  Scenario: The pages a profile offers
    Fails with: Expected the forum profile to offer "Edit". It offers: "Profile", "Topics Started", "Replies Created", "Engagements", "Favorites".
    Given I am an anonymous user
    When I open the forum profile of "participant"
    Then the forum profile should offer the page "Edit"

  Scenario: What a profile shows
    Fails with: Expected the forum profile to show "Forum Role: Keymaster". It shows: "@participant
    Given I am an anonymous user
    When I open the forum profile of "participant"
    Then the forum profile should show "Forum Role: Keymaster"

  Scenario: What a profile does not show
    Fails with: Expected the forum profile not to show "Forum Role: Participant", but it does.
    Given I am an anonymous user
    When I open the forum profile of "participant"
    Then the forum profile should not show "Forum Role: Participant"

  Scenario: The forum role of an account
    Fails with: Expected the forum role of "participant" to be "Moderator", but the profile says "Participant".
    Given I am an anonymous user
    Then the forum role of "participant" should be "Moderator"

  Scenario: No profile form to save
    Fails with: The page has no edit form of a forum profile
    Given I am a logged in user with the "participant" user
    When I open my forum profile
    And I save my forum profile
