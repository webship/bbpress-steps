@must-fail @search
Feature: Assertions of the search, the administration and the notifications that must fail
  Each scenario asserts something that is not true on the test site. Its last step must fail with the message
  its description announces, and a hint (tests/check-must-fail.js runs them). They only read: the site is left as
  it was.

  Scenario: The matches of a search
    Fails with: Expected the search to find 5 match(es), but it found 2
    Given I am an anonymous user
    When I search the forums for "marigolds"
    Then the search should find 5 matches

  Scenario: A search that finds nothing
    Fails with: Expected the search to find 1 match(es), but it found 0: "Oh, bother! No search results were found here."
    Given I am an anonymous user
    When I search the forums for "nothingmatchesthisword"
    Then the search should find 1 match

  Scenario: The search is not the page
    Fails with: The page is not the forum search: it is "Forums"
    Given I am an anonymous user
    And I am on the forum index
    Then the search should find 1 match

  Scenario: What the results show
    Fails with: Expected the search results to show "Forum rules". They show:
    Given I am an anonymous user
    When I search the forums for "marigolds"
    Then the search results should show "Forum rules"

  Scenario: What the results do not show
    Fails with: Expected the search results not to show "A community garden in spring", but they do.
    Given I am an anonymous user
    When I search the forums for "marigolds"
    Then the search results should not show "A community garden in spring"

  Scenario: The kind of a result
    Fails with: The search results of "How do I change my password?" are "a topic", none a reply.
    Given I am an anonymous user
    When I search the forums for "cannot find where"
    Then the search result "How do I change my password?" should be a reply

  Scenario: The forum of a result
    Fails with: The search result "A community garden in spring" is in the forum "General discussion", not in "Showcase".
    Given I am an anonymous user
    When I search the forums for "marigolds"
    Then the search result "A community garden in spring" should be a topic in "Showcase"

  Scenario: A result the search does not have
    Fails with: The search results name no topic "Forum rules". They name: "A community garden in spring".
    Given I am an anonymous user
    When I search the forums for "marigolds"
    And I open the search result "Forum rules"

  @js-off
  Scenario: A tag no topic carries
    Fails with: The forums have no page for the topic tag "webship-test-no-such-tag": the site answered 404
    Given I am an anonymous user
    When I open the topic tag "webship-test-no-such-tag"

  @js-off
  Scenario: A view the forums do not have
    Fails with: The forums have no view "Webship test view": the site answered 404
    Given I am an anonymous user
    When I open the forum view "Webship test view"

  Scenario: A topic the administration does not list
    Fails with: Expected the topics list to include "Webship test topic that is not there". A search for it lists: (none).
    Given I am a logged in user with the "moderator" user
    Then the topics list should include "Webship test topic that is not there"

  Scenario: A topic the administration lists
    Fails with: Expected the topics list not to include "Forum rules", but it does.
    Given I am a logged in user with the "moderator" user
    Then the topics list should not include "Forum rules"

  @js-off
  Scenario: A participant has no lists in the administration
    Fails with: The topics list of the administration did not open for this account
    Given I am a logged in user with the "participant" user
    Then the topics list should include "Forum rules"

  Scenario: The state of a topic in the administration
    Fails with: Expected the topic "Welcome to the forums" to be closed, but its row says: sticky, open.
    Given I am a logged in user with the "moderator" user
    Then the topic "Welcome to the forums" should be closed in the topics list

  Scenario: A topic that is not in the administration
    Fails with: The topics list has no topic "Webship test topic that is not there", in the spam and the trash or out of them.
    Given I am a logged in user with the "moderator" user
    Then the topic "Webship test topic that is not there" should be closed in the topics list

  Scenario: An action a row does not offer
    Fails with: The row of the topic "A community garden in spring" offers no "open" action.
    Given I am a logged in user with the "moderator" user
    When I open the topic "A community garden in spring" from the topics list

  Scenario: Nothing in the trash to restore
    Fails with: The trash of the topics list has no topic "Forum rules". It holds: (none).
    Given I am a logged in user with the "moderator" user
    When I restore the topic "Forum rules" from the topics trash

  Scenario: A feature the settings do not have
    Fails with: The forums' settings have no feature "Webship test feature". They have:
    Given I am a logged in user with the "keymaster" user
    When I go to the "Forums settings" admin screen
    Then the forum feature "Webship test feature" should be on

  Scenario: The state of a feature
    Fails with: Expected the forum feature "Anonymous" to be on, but it is off.
    Given I am a logged in user with the "keymaster" user
    When I go to the "Forums settings" admin screen
    Then the forum feature "Anonymous" should be on

  Scenario: The settings are not the screen
    Fails with: The screen is not the forums' settings
    Given I am a logged in user with the "keymaster" user
    When I go to the "Dashboard" admin screen
    And I turn the forum feature "Favorites" off

  Scenario: A repair tool the forums do not have
    Fails with: The forums have no repair tool "Webship test tool". They have:
    Given I am a logged in user with the "keymaster" user
    When I run the forum repair tool "Webship test tool"

  Scenario: The forum role on the users screen
    Fails with: Expected the forum role "Keymaster" for "moderator", but the users screen shows "Moderator".
    Given I am a logged in user with the "admin" user
    Then the users screen should show the forum role "Keymaster" for "moderator"

  Scenario: A forum role that is not one
    Fails with: There is no forum role "Webship test role". The roles: "Keymaster", "Moderator", "Participant", "Spectator", "Blocked".
    Given I am a logged in user with the "admin" user
    When I change the forum role of "spectator" to "Webship test role"

  Scenario: A notification that was not sent
    Fails with: Expected a notification with "Webship test topic" in its subject to participant@example.com. Since the scenario began it got no mail.
    Given I am an anonymous user
    Then a forum notification with the subject "Webship test topic" should be sent to "participant"

  Scenario: A handle without an address
    Fails with: "webship-test-nobody" has no e-mail address in the users registry.
    Given I am an anonymous user
    Then no forum notification should be sent to "webship-test-nobody"

  Scenario: A notification that was sent
    Fails with: Expected no notification to participant@example.com, but since the scenario began it got: "[General discussion] Webship test must-fail topic".
    Given there is a topic "Webship test must-fail topic" in "General discussion" by "participant"
    And I am a logged in user with the "participant" user
    And I have no subscriptions
    When I open the topic "Webship test must-fail topic"
    And I subscribe to the topic
    Given "moderator" replied to the topic "Webship test must-fail topic" with "Webship test reply of the moderator."
    Then no forum notification should be sent to "participant"

  Scenario: The text of a notification
    Fails with: The notification "[General discussion] Webship test must-fail topic" does not contain "keymaster wrote:".
    Given there is a topic "Webship test must-fail topic" in "General discussion" by "participant"
    And I am a logged in user with the "participant" user
    And I have no subscriptions
    When I open the topic "Webship test must-fail topic"
    And I subscribe to the topic
    Given "moderator" replied to the topic "Webship test must-fail topic" with "Webship test reply of the moderator."
    Then the forum notification with the subject "Webship test must-fail topic" to "participant" should contain "keymaster wrote:"

  @must-fail-cleanup
  Scenario: The topic of the notification scenarios goes again
    Given there is no topic "Webship test must-fail topic"
