@accessibility
Feature: The forums for every visitor
  As a visitor who uses a screen reader or a keyboard
  I want the pages of the forums I read to have no critical accessibility fault
  So that I can follow the community like anybody else

  # The pages a visitor reads. The pages with a search field of the forums are left out (the forum index, the
  # search page, the page of a topic tag, the lists of a profile): the field has no accessible label, its label
  # being hidden from every reader. So are the topic and reply forms, whose editor has none either. See "What the
  # suite tests" in the README.
  Scenario Outline: A page of the forums a visitor reads has no critical accessibility violation
    Given I am an anonymous user
    When I go to "<page>"
    Then the page should have no critical accessibility violations

    Examples:
      | page                                        |
      | /forums/forum/community/                    |
      | /forums/forum/community/general-discussion/ |
      | /forums/topic/welcome-to-the-forums/        |
      | /forums/topic/a-long-conversation/page/2/   |
      | /forums/view/popular/                       |
      | /forums/users/participant/                  |

  Scenario: A page of the forums declares its language and has one main heading
    Given I am an anonymous user
    When I open the topic "Welcome to the forums" in "General discussion"
    Then the page should declare a language
    And the page should have exactly one h1
