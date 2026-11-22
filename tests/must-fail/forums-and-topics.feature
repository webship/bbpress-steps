@must-fail @forums
Feature: Assertions of the forum index, a forum and a topic that must fail
  Each scenario asserts something that is not true on the test site. Its last step must fail with the message
  its description announces, and a hint (tests/check-must-fail.js runs them). They only read: the site is left as
  it was.

  Scenario: A forum the index does not list
    Fails with: Expected the forum index to list the forum "Webship test forum that is not there"
    Given I am an anonymous user
    And I am on the forum index
    Then the forum index should list the forum "Webship test forum that is not there"

  Scenario: A forum the index lists
    Fails with: Expected the forum index not to list the forum "Showcase", but it does.
    Given I am an anonymous user
    And I am on the forum index
    Then the forum index should not list the forum "Showcase"

  Scenario: A forum under another category
    Fails with: Expected the forum index to list the forum "General discussion" in the category "Showcase".
    Given I am an anonymous user
    And I am on the forum index
    Then the forum index should list the forum "General discussion" in the category "Showcase"

  Scenario: The index is not the page
    Fails with: The page is not the forum index: it is "General discussion"
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the forum index should list the forum "Showcase"

  Scenario: The topics a forum's row counts
    Fails with: Expected the forum "Showcase" to show 3 topics, but its row shows 16.
    Given I am an anonymous user
    And I am on the forum index
    Then the forum "Showcase" should have 3 topics in the list

  Scenario: A subforum has no row of its own on the index
    Fails with: "General discussion" is a subforum of "Community" on this page
    Given I am an anonymous user
    And I am on the forum index
    Then the forum "General discussion" should have 4 topics in the list

  Scenario: The marks of a forum's row
    Fails with: Expected the forum "Showcase" to be closed, but its row does not say so.
    Given I am an anonymous user
    And I am on the forum index
    Then the forum "Showcase" should be closed in the list

  Scenario: A forum that is not there
    Fails with: The forums list no forum "Webship test forum that is not there"
    Given I am an anonymous user
    When I open the forum "Webship test forum that is not there"

  Scenario: Another forum
    Fails with: The page is not the forum "Showcase": it is "General discussion"
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then I should be in the forum "Showcase"

  Scenario: A topic the forum does not list
    Fails with: Expected the topic "Showcase entry 01" on the page.
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the forum should list the topic "Showcase entry 01"

  Scenario: A topic the forum lists
    Fails with: Expected no topic "Forum rules" on the page, but it is listed.
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the forum should not list the topic "Forum rules"

  Scenario: The marks of a topic's row
    Fails with: Expected the topic "A community garden in spring" to be sticky, but its row says: not sticky, status "publish".
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the topic "A community garden in spring" should be sticky in the list

  Scenario: A row that is not on the page
    Fails with: The list on the page has no topic "Showcase entry 01".
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the topic "Showcase entry 01" should be closed in the list

  Scenario: The replies a topic's row counts
    Fails with: Expected the topic "Welcome to the forums" to have 9 replies, but its row shows 2.
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the topic "Welcome to the forums" should have 9 replies in the list

  Scenario: The author of a topic's row
    Fails with: Expected the topic "Welcome to the forums" to be by "participant", but its row says "keymaster".
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the topic "Welcome to the forums" should be by "participant" in the list

  Scenario: The topics of a forum
    Fails with: Expected 9 topic(s), but the list counts 4
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the forum should have 9 topics

  Scenario: The first topic of a forum
    Fails with: Expected the list to begin with the topic "A community garden in spring", but it begins with "Forum rules".
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the first topic of the forum should be "A community garden in spring"

  Scenario: A page the list does not have
    Fails with: The list has no page 2: it fits on one page.
    Given I am an anonymous user
    When I open the forum "General discussion"
    And I go to page 2

  Scenario: Another page of the list
    Fails with: Expected page 2 of the list, but the browser shows page 1
    Given I am an anonymous user
    When I open the forum "Showcase"
    Then I should be on page 2

  Scenario: The breadcrumbs
    Fails with: Expected the breadcrumbs "Home", "Forums", "General discussion", but the page shows "Home", "Forums", "Community", "General discussion".
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the forum breadcrumbs should be "Home", "Forums" and "General discussion"

  Scenario: A notice the forums do not show
    Fails with: Expected a notice of the forums saying "This forum is closed"
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the forums should say "This forum is closed"

  Scenario: A notice the forums show
    Fails with: Expected no notice of the forums saying "You must be logged in", but one says: "You must be logged in to create new topics."
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the forums should not say "You must be logged in"

  Scenario: A visitor may not start a topic
    Fails with: Expected the form to start a topic, but the page has none: the forums say "You must be logged in to create new topics."
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then I should be able to start a topic

  Scenario: A participant may reply
    Fails with: Expected no form to reply, but the page has one
    Given I am a logged in user with the "participant" user
    When I open the topic "A community garden in spring" in "General discussion"
    Then I should not be able to reply

  Scenario: A page the site does not refuse
    Fails with: Expected the site to refuse "/forums/forum/showcase/", but it answered 200 with "Showcase - Webship Forums"
    Given I am an anonymous user
    Then I should not be allowed to open "/forums/forum/showcase/"

  Scenario: A visitor cannot start a topic
    Fails with: The forum "General discussion" offers this account no form for a new topic: the forums say "You must be logged in to create new topics."
    Given I am an anonymous user
    When I start a new topic in "General discussion"

  Scenario: A topic the forum does not have
    Fails with: The forum "General discussion" lists no topic "Webship test topic that is not there"
    Given I am an anonymous user
    When I open the topic "Webship test topic that is not there" in "General discussion"

  Scenario: A topic the search does not find
    Fails with: The forum search finds no topic "Webship test topic that is not there" for this account.
    Given I am an anonymous user
    When I open the topic "Webship test topic that is not there"

  Scenario: Another topic
    Fails with: The page is not the topic "Forum rules": it is the topic "Welcome to the forums".
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    Then I should be reading the topic "Forum rules"

  Scenario: A forum is not a topic
    Fails with: The page is not a topic: it is "General discussion"
    Given I am an anonymous user
    When I open the forum "General discussion"
    Then the topic should have 1 post

  Scenario: The posts of a topic
    Fails with: Expected the topic to have 5 post(s), but it has 3
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    Then the topic should have 5 posts

  Scenario: The author of a post
    Fails with: Post 1 is by "keymaster", not by "participant".
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    Then post 1 should be by "participant"

  Scenario: A post the page does not have
    Fails with: The page has no post 9: it shows 3 post(s).
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    Then post 9 should be by "participant"

  Scenario: The forum role of an author
    Fails with: The last post is by "moderator", whose forum role reads "Moderator", not "Keymaster".
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    Then the author of the last post should be a "Keymaster"

  Scenario: The text of a post
    Fails with: Post 2 does not read "Welcome aboard". It reads: "Hello everyone, glad to be here.".
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    Then post 2 should read "Welcome aboard"

  Scenario: The format of a post
    Fails with: Post 2 does not show "Hello everyone" in bold. It shows nothing in bold
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    Then post 2 should show "Hello everyone" in bold

  Scenario: A post without an edit log
    Fails with: The edit log of post 1 does not show "Reason: Typo". The post has no edit log.
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    Then the edit log of post 1 should show "Reason: Typo"

  Scenario: The state of a topic
    Fails with: Expected the topic to be closed, but it is open.
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    Then the topic should be closed

  Scenario: A visitor cannot tell whether a topic is sticky from its page
    Fails with: The topic's page does not say whether it is sticky for this account.
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    Then the topic should be sticky

  Scenario: The tags of a topic
    Fails with: Expected the topic to be tagged "howto". Its tags: "welcome".
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    Then the topic should be tagged "howto"

  Scenario: A visitor has no form to write in
    Fails with: The page has no topic or reply form: the forums say "You must be logged in to reply to this topic."
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    And I write "Webship test reply." in the editor

  Scenario: A button the toolbar does not have
    Fails with: "link" is not a button of the toolbar that wraps a text.
    Given I am a logged in user with the "participant" user
    When I open the topic "A community garden in spring" in "General discussion"
    And I add "the documentation" to the editor with the "link" button

  Scenario: What the editor holds
    Fails with: The editor does not contain "Webship test". It holds: "".
    Given I am a logged in user with the "participant" user
    When I open the topic "A community garden in spring" in "General discussion"
    Then the editor should contain "Webship test"

  Scenario: A participant has no list for the topic's type
    Fails with: The form has no list for the topic's type.
    Given I am a logged in user with the "participant" user
    When I start a new topic in "General discussion"
    And I choose the topic type "Sticky"

  Scenario: The reply form has no title
    Fails with: The form on the page has no topic title: it is the form of a reply.
    Given I am a logged in user with the "participant" user
    When I open the topic "A community garden in spring" in "General discussion"
    And I write the topic title "Webship test topic"

  Scenario: The forums refuse an empty topic
    Fails with: The forums refused the post: "Error: Your topic needs a title.", "Error: Your topic cannot be empty.".
    Given I am a logged in user with the "participant" user
    When I start a new topic in "General discussion"
    And I submit the post

  Scenario: An error the forums do not show
    Fails with: Expected the error "Duplicate topic detected". The forums say: "Error: Your topic needs a title.", "Error: Your topic cannot be empty."
    Given I am a logged in user with the "participant" user
    When I start a new topic in "General discussion"
    And I try to submit the post
    Then the editor should show the error "Duplicate topic detected"

  Scenario: A visitor cannot reply
    Fails with: The topic offers this account no reply form: the forums say "You must be logged in to reply to this topic."
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    And I reply to the topic with "Webship test reply."

  Scenario: A post an account may not edit
    Fails with: Post 1 offers this account no Edit link. It offers: "Reply".
    Given I am a logged in user with the "participant" user
    When I open the topic "Welcome to the forums" in "General discussion"
    And I edit post 1

  Scenario: The links of a post
    Fails with: Expected post 1 to offer "Trash". It offers: "Reply".
    Given I am a logged in user with the "participant" user
    When I open the topic "Welcome to the forums" in "General discussion"
    Then post 1 should offer the link "Trash"
