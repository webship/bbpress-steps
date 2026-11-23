<p align="center"><img src="https://raw.githubusercontent.com/webship/bbpress-steps/2.0.x/assets/logo.svg" alt="bbPress logo" width="96"></p>

# bbpress-steps

[![Test](https://github.com/webship/bbpress-steps/actions/workflows/test.yml/badge.svg)](https://github.com/webship/bbpress-steps/actions/workflows/test.yml)

Cucumber step definitions for testing forums on WordPress with bbPress, with
[webship-js](https://webship.co/docs/webship-js/2.0.x), a BDD browser automation
harness built on Playwright and Cucumber-js.

`@webship-js/bbpress-steps` is an extension of
[`@webship-js/wordpress-steps`](https://github.com/webship/wordpress-steps): it
depends on it and loads it, so a project with forums installs this one pack and
has both. The WordPress pack gives the login by a handle of the users registry,
the administration screens, menus and notices, a setting by its label and the
rest of the site; this pack adds the forums:

- **the forum index and a forum**: the forums an account sees, under their
  category, their counters and marks (a category, closed, private, hidden), the
  topics of a forum in their order (super sticky, sticky, then by their last
  post), their marks, replies, voices and authors, the pages of a list, the
  forums' breadcrumbs and what the forums say in their notices;
- **a topic**: its posts by their number on the page (who wrote them, the
  author's forum role, what they say and how it is formatted, their edit log),
  whether it is open, closed, sticky, pending, spam or in the trash, its tags;
- **the forms**: a new topic, a reply and an edit, with the editor's toolbar
  (bold, italics, a quote, code, struck through), the tags, the topic's type and
  status, the reason of an edit, and the errors the forums answer with;
- **subscriptions and favorites**: subscribing to a topic or a forum, marking a
  topic as a favorite, the lists of the profile, and removing a row from them;
- **the forum profile**: what it shows, the pages it offers, the forum role of an
  account, and its edit form;
- **the forum search, topic tags and views**: the results (topics and replies),
  opening one, the page of a tag, "Most popular topics" and "Topics with no
  replies";
- **moderation**: close and open, stick (in its forum, or to the front of every
  forum), unapprove and approve, spam, trash, restore and delete a topic or a
  reply, merge a topic into another, split a topic at a reply, move a reply, move
  a topic to another forum, and what the forums hide until a moderator asks;
- **the forum roles**: what a visitor, a spectator, a participant, a moderator, a
  keymaster and a blocked account reach, by the steps above;
- **the forums in the administration**: the lists of forums, topics and replies
  and the actions of their rows, the features of the forums' settings screen, the
  repair tools, the forum role of an account on the users screen, and the
  forums' screens by name ("Topics", "Forums settings", "Forum tools");
- **the notification e-mails**, read in the local mail catcher;
- **test content**: a topic and a reply a scenario starts from, posted by the
  account that owns them, and their removal.

No step phrase names the platform: a scenario reads `When I start a new topic in
"General discussion"` and `Then the topic should be closed`.

CI builds a real site with [DDEV](https://ddev.com) on the runner (the latest
WordPress with the latest bbPress from the plugin directory, the accounts of the
suite, the test content), on a block theme and on a classic theme, and runs the
whole suite against it twice on every push and pull request, then the assertions
that must fail; see [The test site](#the-test-site) and
[`.github/workflows/test.yml`](.github/workflows/test.yml).

## From nothing to a green run

What the machine needs: Docker, [DDEV](https://ddev.com), git, python3, and Node.js 24 or later with npm. PHP, WP-CLI, the database and the mail catcher run in DDEV's containers.

**1. The site.** The pack's own build script (the one CI runs) makes the site in a DDEV project of type `wordpress`: the latest WordPress, bbPress from the plugin directory, the theme WordPress installs with, the six accounts of [Test users](#test-users) and the test content (see [The test site](#the-test-site)). It takes about two minutes.

```bash
git clone https://github.com/webship/bbpress-steps.git
SITE_DIR="$PWD/bbpress-site" bbpress-steps/.github/scripts/build-ddev-site.sh
```

The forums answer at `https://bbpresssteps.ddev.site/forums/` and the mail catcher at `https://bbpresssteps.ddev.site:8026`. The accounts are `administrator`, `keymaster`, `moderator`, `participant`, `spectator` and `blocked`, each with the password `dD.123123ddd` (step 3 names them).

In the [Webship Workspace](https://github.com/webship/workspace), its bbPress plugin builds the same site instead, on top of its WordPress plugin, in a sites folder of the workspace (`dev/` here, the one `--with-needs` adds to a new workspace; `test/`, `sandboxes/` and `demos/` work the same):

```bash
bash core/scripts/plugins.sh --require bbpress --with-needs
bash core/scripts/plugins.sh --activate bbpress --with-needs
bash core/scripts/plugins.sh --install bbpress
bash dev/cmd-bbpress-project.sh bbpsite --install --add-users --sample-content
```

Those forums answer at `https://bbpsite.ddev.site/forums/` and the mail catcher at `https://bbpsite.ddev.site:8026`. `--sample-content` adds the forums and topics the features name. Its accounts are the plugin's, the same six with the workspace's shared password `dD.123123ddd` (step 3 names them); the workspace's own account is the installer's, one more keymaster of the forums.

**2. A test project.**

```bash
mkdir bbpress-tests && cd bbpress-tests
npm init -y
npm install --save-dev webship-js @webship-js/bbpress-steps
npx init-webship-js
```

`npx init-webship-js` writes `cucumber.js`, `playwright.config.ts`, the `tests/` folders with a first feature and the `npm test` scripts, and installs Chromium. npm usually runs it already when it installs webship-js; a second run changes nothing. npm installs `@webship-js/wordpress-steps` along with the pack.

**3. `cucumber.js`.** Replace the file with the wiring of the pack: the step files of webship-js and of the pack (which loads the WordPress pack's itself), the tags that keep the assertions that must fail out of a normal run, the address of the site and of its mail catcher, the account that removes test content, and the accounts (the JSON of [Test users](#test-users)). The first lines are the starter's own: a feature named on the command line runs alone.

```javascript
// A feature file or a scenario (file:line) named on the command line runs alone:
// cucumber-js 12 would add it to the paths below, so `paths` is left empty then.
const OPTIONS_WITH_A_VALUE = new Set([
  '-c', '--config', '-f', '--format', '--format-options', '--i18n-keywords',
  '-i', '--import', '-l', '--loader', '--language', '--name', '--order',
  '-p', '--profile', '--parallel', '--plugin', '--plugin-options',
  '-r', '--require', '--require-module', '--retry', '--retry-tag-filter',
  '--shard', '-t', '--tags', '--world-parameters',
]);

function commandLinePaths() {
  if (!/cucumber(-js|\.js)?$/.test(String(process.argv[1] || ''))) return [];
  const args = process.argv.slice(2);
  const paths = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i].startsWith('-')) {
      if (OPTIONS_WITH_A_VALUE.has(args[i])) i += 1;
    } else {
      paths.push(args[i]);
    }
  }
  return paths;
}

const launchUrl = (process.env.LAUNCH_URL || 'https://bbpresssteps.ddev.site').replace(/\/+$/, '');

module.exports = {
  default: {
    requireModule: ['tsx/cjs'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',
      'node_modules/@webship-js/bbpress-steps/tests/step-definitions/**/*.js',
      'tests/step-definitions/**/*.js',
    ],
    paths: commandLinePaths().length ? [] : ['tests/features/**/*.feature'],
    // Work in progress and the assertions that must fail stay out of a normal run.
    tags: process.env.CUCUMBER_TAGS || 'not @wip and not @must-fail',
    format: ['@cucumber/pretty-formatter', 'json:tests/reports/cucumber_report.json'],
    worldParameters: {
      launchUrl,
      // The mail catcher of the site (the notification steps read it): the Mailpit of the DDEV project.
      mailUrl: `${launchUrl}:8026`,
      // Where the forums start, and the account that removes test content for the Given steps.
      forums: { root: '/forums/', moderator: 'moderator' },
      // The waits webship-js adds around each page, scenario and step (milliseconds).
      minWaitTime: { page: 3000, before_scenario: 0, after_scenario: 0, before_step: 0, after_step: 0 },
      // "admin" is the handle the WordPress pack's features give the administrator.
      users: {
        admin: { username: 'administrator', password: 'dD.123123ddd', email: 'administrator@example.com' },
        keymaster: { username: 'keymaster', password: 'dD.123123ddd', email: 'keymaster@example.com' },
        moderator: { username: 'moderator', password: 'dD.123123ddd', email: 'moderator@example.com' },
        participant: { username: 'participant', password: 'dD.123123ddd', email: 'participant@example.com' },
        spectator: { username: 'spectator', password: 'dD.123123ddd', email: 'spectator@example.com' },
        blocked: { username: 'blocked', password: 'dD.123123ddd', email: 'blocked@example.com' },
      },
    },
  },
};
```

On a site from the Webship Workspace (step 1) the accounts are the same; its address goes in `LAUNCH_URL` (step 5), and `mailUrl` follows it. No console noise of the browser needs to be ignored: the forums' pages log no error. The scenarios of a page the forums answer with "not found" or the administration with "forbidden" carry `@js-off`, because the browser logs "Failed to load resource" for it.

**4. A first feature**, `tests/features/first-run.feature`:

```gherkin
Feature: First run
  Scenario: A visitor reads a topic of the forums
    Given I am an anonymous user
    And I am on the forum index
    Then the forum index should list the forum "General discussion" in the category "Community"
    When I open the topic "Welcome to the forums" in "General discussion"
    Then the topic should have 3 posts
    And post 1 should be by "keymaster"
    And I should not be able to reply

  Scenario: The moderator has the moderator tools
    Given I am a logged in user with the "moderator" user
    When I open the topic "A community garden in spring" in "General discussion"
    Then I should see the moderator tools
    And the author of the last post should be a "Moderator"
```

**5. Run it.** Set `LAUNCH_URL` to the address of the site: `https://bbpresssteps.ddev.site` for the build script's site, `https://bbpsite.ddev.site` for the Workspace's.

```bash
LAUNCH_URL=https://bbpresssteps.ddev.site npm test
```

A green first run prints every step, then the summary (the starter feature of `npx init-webship-js` and the two scenarios above, passed) and the HTML report it wrote:

```
3 scenarios (3 passed)
13 steps (13 passed)
0m09.000s (executing steps: 0m09.000s)
[webship-js] HTML report → …/bbpress-tests/tests/reports/cucumber_report.html
```

From there, copy the features of [`tests/features/`](tests/features/) (they also ship in the package, under `node_modules/@webship-js/bbpress-steps/tests/features/`): together they use every step of the pack. They read no file of their own, and they run as they are on the site of either way of step 1. One feature runs alone when it is named: `LAUNCH_URL=… npx cucumber-js tests/features/moderation.feature`.

### What the suite tests

The features of this repository run every step of the pack against the test site, twice in a row in CI on every change, then the assertions that must fail:

- **`accessibility.feature`**: an accessibility audit of the pages a visitor reads (a category, a forum, a topic and its second page, a view, a profile): no critical violation, a declared language, one main heading.
- **`forum-index.feature`**: the public forums under their category, the counters and marks of the index, a category and its forums, a forum's list in its order (the super sticky topic, the sticky one, the closed one), the row of a topic (author, replies, voices), a forum of two pages, a visitor asked to log in before posting, a closed forum.
- **`topics.feature`**: a topic read by a visitor (its posts, their authors and forum roles, its tags), a topic of two pages, a closed topic, a participant starting a topic with tags and a moderator replying, the refusals of an empty topic and an empty reply, the editor's toolbar, an edit with its reason in the edit log.
- **`subscriptions-and-favorites.feature`**: a favorite marked and unmarked, a subscription to a topic and to a forum removed from the profile, a spectator who may not reply but may mark a favorite, the lists of the profile.
- **`profiles.feature`**: a profile read by a visitor, its pages, the forum role of each of the six accounts, an account editing its own profile and putting it back, an account kept out of another's.
- **`search-and-tags.feature`**: a search that finds a topic and a reply and opens one, a search with no match, the pages of the results, a search that shows an account only what it may read, the page of a topic tag, the two views.
- **`moderation.feature`**: what a participant and a moderator are offered, a topic closed and opened, stuck in its forum and to the front of every forum, unapproved and approved, spammed, trashed, restored and deleted, a reply hidden and deleted, a topic split, a reply moved, the topics merged again, a reply moved into a topic of its own, a topic moved to another forum and edited with a reason.
- **`forum-roles.feature`**: the private forum for a participant, the hidden one for a moderator and a keymaster, neither for a visitor, a spectator who writes nothing, a blocked account that gets no forum at all, the keymaster posting in a closed forum, the administration by role.
- **`administration.feature`**: the forums' screens by name, the lists of forums, topics and replies, a moderator working on a topic from the topics list (close, stick, unapprove, spam, trash, restore, delete), a forum closed from the forums list, the forums' settings, a feature turned off and on again, the repair tools, the forum roles on the users screen and one changed and put back.
- **`notifications.feature`**: the mail a subscriber of a topic gets of a reply (and its author does not), the mail a subscriber of a forum gets of a new topic, no mail when nobody follows.

Every scenario that makes a topic removes it again (deleted for good, with its replies), a setting or a forum role it changes it puts back, and a favorite or a subscription it adds it removes: the suite leaves the site as it found it.

The accessibility audit leaves out the pages that carry a search field of the forums (the forum index, the search page, the page of a topic tag, the lists of a profile) and the topic and reply forms: on bbPress 2.6.22 the search field's label is hidden from every reader and the editor has no label, which the audit reports as critical (`label`). A site that fixes them in its theme can audit those pages with webship-js's own step, `Then the page should have no critical accessibility violations`.

Not tested: threaded replies (the setting is off, as the plugin sets it), anonymous posting (off by default; the suite would have to post as a guest), the visual editor of a post (the forums print the plain editor with its toolbar), per-forum moderators, the forums' widgets, shortcodes and blocks on other pages of the site, the importers of Tools > Forums, the forums' feeds, and Akismet's spam check (it needs an account).

## Requirements

- Node.js 24 or later
- A webship-js 2.0 test project (webship-js 2.0.16 or later)
- A site on WordPress with bbPress 2.6, and accounts on it for the suite

## Install

```bash
npm install --save-dev @webship-js/bbpress-steps
```

npm installs `@webship-js/wordpress-steps` with it. List only this pack's step files in `cucumber.js`: it loads the WordPress pack's itself. A project that also lists the WordPress pack's glob is fine while npm installed one copy of it (Node loads a file once); a second, nested copy (the project pins another release line of the WordPress pack) would register every WordPress step twice, so drop that glob then.

## What is included

| File | Steps | Covers |
| --- | --- | --- |
| `bbpress-forums.steps.js` | 17 | The forum index (the forums it lists, under their category, their counters and marks), a forum (opening it, its topics, their marks, replies, voices and authors, its total, its first topic), the pages of a list, the forums' breadcrumbs and notices, whether the account may start a topic or reply, and a page the forums do not let it open. |
| `bbpress-topics.steps.js` | 23 | A topic (opening it, its posts, their authors and forum roles, their text and format, their edit log, its state and tags) and the forms: a new topic, the title, the editor and its toolbar, the tags, the type and status, the reason of an edit, submitting, the errors, a reply, editing a post, the links a post offers. |
| `bbpress-moderation.steps.js` | 12 | The moderation links of a topic and of a reply (close, open, stick, unstick, to the front, unapprove, approve, spam, unspam, trash, restore, delete), merge, split, move a reply, move a topic, the state of a post, what the forums hide, the moderator tools. |
| `bbpress-profile.steps.js` | 12 | Subscribing to a topic or a forum, marking a favorite, the lists of the account's profile and removing a row from them, emptying them, the forum profile (opening it, its pages, what it shows, the forum role of an account), saving its edit form. |
| `bbpress-search.steps.js` | 7 | The forum search, its count, what its results show, the kind of a result, opening one, the page of a topic tag, a view of the forums. |
| `bbpress-admin.steps.js` | 9 | The forums, topics and replies lists of the administration, the state of a row, the actions of a row, the trash, the features of the forums' settings, the repair tools, the forum role of an account on the users screen (read and changed). |
| `bbpress-mail.steps.js` | 3 | The forums' notifications in the mail catcher: sent, not sent, and what one says. |
| `bbpress-content.steps.js` | 4 | Test content: no topic of a title, a topic by an account (with its text as a doc string), a reply by an account. |
| `bbpress-defaults.js` | | Loads the WordPress pack's steps, adds the forums' screens to its named administration screens, and keeps per scenario the moment it began and the topics its Given steps made. It registers no step. |
| `bbpress-helpers.js` | | Shared plumbing: the forums' root, what a page lists (forums, topics, posts, notices), the way to a forum and a topic, the links of a post, the session of another account, the mail catcher. It registers no step. |

Text, links, fields, buttons, dialogs, the status code and the headers of a page and the accessibility audit are webship-js's own steps (`I should see "..."`, `I fill in "Biographical Info" with "..."`, `I check "Notify me of follow-up replies via email"`); the login, the administration's screens, menus, notices and settings are the WordPress pack's (`I am a logged in user with the "moderator" user`, `I go to the "Topics" admin screen`, `the admin menu should list "Forums"`, `I should see a success notice "Settings saved."`, `the "Forum Root" setting should be "forums"`, `I save the settings`). This pack adds only what the forums decide.

## How the steps find things and wait

- **By what a person reads.** A forum is found by the name the index shows (without the "Private: " the site puts before a private forum), a topic by its title in the forum's list, a post by its number on the page, a link of a post by its text, a field by its label, a feature of the settings by the name of its row. What the forums print the same way on every theme is the fallback, all of it inside `#bbpress-forums`: the rows of a list (`ul#bbp-forum-<id>`, `ul#bbp-topic-<id>`) and the classes the forums set on them (`status-category`, `bbp-forum-status-closed`, `bbp-forum-visibility-private`, `sticky`, `super-sticky`, `status-closed`), a post's header and body (`#post-<id>`, `.post-<id>` with `status-…`), its author and role (`.bbp-author-name`, `.bbp-author-role`), its links (`.bbp-admin-links a.bbp-topic-close-link`, …), the forms (`form#new-post`, `#bbp_topic_title`, `#bbp_reply_content`), the notices (`.bbp-template-notice`).
- **No fixed sleeps.** The steps wait on the forums' own signals:
  - the pages of the forums are rendered on the server: a step that opens one waits for the page to be quiet, then reads the rows;
  - a form of the forums loads a page: a step that submits waits for that page, then for the forums' answer on it, the new topic's own page, the reply under its address (`…/#post-<id>`), or the error notice above the form;
  - a moderation link loads the page again, and the forums say what they did through the post itself: its status (a class of the post) and the link, which turns into its opposite; the step checks that turn;
  - "Subscribe" and "Favorite" are answered in place: the forums mark the link's wrapper (`is-subscribed`, `is-favorite`) and turn its text, and the step waits for that mark; the `×` of a profile's list removes its row the same way;
  - a screen of the administration keeps a timer running (its heartbeat) and is whole when it arrives: the list steps read it at once, and a row action is followed to the list and its notice;
  - the mail in the mail catcher, polled until it arrives. The forums send it in the request that takes the post, so its absence is read at once.
- **Test content, made the way a person makes it.** `Given there is a topic "…" in "…" by "participant"` logs that account in (once in a run; later steps take its session over), posts through the forum's own form, and gives the scenario's own session back. `Given there is no topic "…"` is the work of the account `worldParameters.forums.moderator` names, in the topics list of the administration: to the trash, then deleted for good.
- **Failures say what was found.** `Expected the topic to have 5 post(s), but it has 3 ("Viewing 3 posts - 1 through 3 (of 3 total)").` with a hint on where to look.

## Accounts

The suite never creates or deletes an account. Accounts are configuration: list the ones the site has in `worldParameters.users`, by a handle the scenarios use, each with its `username` and `password`, and its `email` for the notification steps (a handle stands for its address there). Each account logs in through the site's login screen (the WordPress pack's step).

```javascript
users: {
  admin: { username: 'administrator', password: process.env.WP_ADMIN_PASSWORD, email: 'administrator@example.com' },
  moderator: { username: 'moderator', password: process.env.WP_MODERATOR_PASSWORD, email: 'moderator@example.com' },
  participant: { username: 'participant', password: process.env.WP_PARTICIPANT_PASSWORD, email: 'participant@example.com' },
},
```

The Given steps that make and remove test content need one more thing: `worldParameters.forums.moderator`, the handle of an account that may moderate every forum and open the topics list of the administration (a moderator or a keymaster; `moderator` by default). `worldParameters.forums.root` is where the forums start (`/forums/`, as the plugin sets it).

## Test users

The accounts this repository's suite logs in as, exactly as `cucumber.js` lists them in `worldParameters.users` (the default values; the `WP_<HANDLE>_USER`, `WP_<HANDLE>_PASSWORD` and `WP_<HANDLE>_EMAIL` variables replace them). The build script creates them, each named after its forum role, with one password; the Workspace's bbPress plugin creates the same six.

```json
{
  "admin": { "username": "administrator", "password": "dD.123123ddd", "email": "administrator@example.com" },
  "keymaster": { "username": "keymaster", "password": "dD.123123ddd", "email": "keymaster@example.com" },
  "moderator": { "username": "moderator", "password": "dD.123123ddd", "email": "moderator@example.com" },
  "participant": { "username": "participant", "password": "dD.123123ddd", "email": "participant@example.com" },
  "spectator": { "username": "spectator", "password": "dD.123123ddd", "email": "spectator@example.com" },
  "blocked": { "username": "blocked", "password": "dD.123123ddd", "email": "blocked@example.com" }
}
```

`admin` is the site's administrator (the installer's account in the build script) and, as every administrator, a keymaster of the forums. The other five are subscribers of the site, each with the forum role it is named after: `keymaster` runs the forums (their lists, settings and tools in the administration), `moderator` moderates every topic and reply and reads the hidden forums, `participant` starts topics and replies and reads the private forums, `spectator` reads the public forums, and `blocked` gets no forum at all. They are placeholder credentials of a throwaway test site, not of any real one.

## The test site

[`.github/scripts/build-ddev-site.sh`](.github/scripts/build-ddev-site.sh) builds the site the suite of this repository runs against, in a DDEV project of type `wordpress` with PHP 8.4 and Node.js 24 (`WORDPRESS_VERSION`, `BBPRESS_VERSION`, `PHP_VERSION` and `THEME` choose others):

- the latest WordPress, with pretty addresses, and the theme it installs with (a block theme), or the classic theme `THEME` names;
- bbPress from the plugin directory, its settings left as the plugin sets them but for two a suite cannot work with: no wait between two posts of an account (the flood protection), and no time limit on editing one's own post;
- the six accounts of [Test users](#test-users), each with its forum role;
- the test content, written by [`site/forum-site.php`](site/forum-site.php) with the forums' own functions, so the counters of every forum and topic are the ones the forums keep:

| Forum | What it holds |
| --- | --- |
| Community (a category) | General discussion and Help and support |
| General discussion | "Forum rules" (super sticky), "Welcome to the forums" (sticky, two replies), "A community garden in spring", "The spring meetup is over" (closed) |
| Help and support | "How do I change my password?", "Where do the avatars come from?", "A long conversation" (seventeen replies: two pages) |
| Showcase | sixteen topics (two pages with the super sticky one) |
| Archive (closed) | "The forums opened" |
| Members lounge (private) | "Members only: the next meetup" |
| Staff room (hidden) | "Staff only: the moderation notes" |

Topic tags: `rules`, `welcome`, `garden`, `spring`, `meetup`, `account`, `howto`, `showcase`.

CI builds it twice, see [`.github/workflows/test.yml`](.github/workflows/test.yml): on the block theme WordPress installs with and PHP 8.4 (with the assertions that must fail), and on a classic theme (Twenty Twenty-One) and PHP 8.2.

After a run that was stopped half way, `RESET_ONLY=1 SITE_DIR="$PWD/bbpress-site" bbpress-steps/.github/scripts/build-ddev-site.sh` puts the forums back as the build left them: the topics and replies of the run go, the favorites and subscriptions of the accounts too.

## Steps

One example of each step; the JSDoc block above each definition holds five.

### `bbpress-forums.steps.js` (17)

- `Given I am on the forum index`
- `Then the forum index should list the forum "Showcase"`
- `Then the forum "Showcase" should have 16 topics in the list`
- `Then the forum "Archive" should be closed in the list`
- `When I open the forum "General discussion"`
- `Then I should be in the forum "General discussion"`
- `Then the forum should list the topic "Welcome to the forums"`
- `Then the topic "Welcome to the forums" should be sticky in the list`
- `Then the topic "Welcome to the forums" should have 2 replies in the list`
- `Then the forum should have 4 topics`
- `Then the first topic of the forum should be "Forum rules"`
- `When I go to page 2`
- `Then I should be on page 2`
- `Then the forum breadcrumbs should be "Home", "Forums" and "Showcase"`
- `Then the forums should say "You must be logged in to reply to this topic."`
- `Then I should be able to start a topic`
- `Then I should not be allowed to open "/forums/forum/staff-room/"`

### `bbpress-topics.steps.js` (23)

- `When I open the topic "Welcome to the forums" in "General discussion"`
- `Then I should be reading the topic "Welcome to the forums"`
- `Then the topic should have 3 posts`
- `Then post 1 should be by "keymaster"`
- `Then the author of post 1 should be a "Keymaster"`
- `Then post 1 should read "Say hello and tell us what you are working on."`
- `Then the last post should show "bold words" in bold`
- `Then the edit log of post 1 should show "Reason: Clearer title"`
- `Then the topic should be closed`
- `Then the topic should be tagged "welcome"`
- `When I start a new topic in "General discussion"`
- `When I write the topic title "Webship test topic"`
- `When I write "Webship test: the first post of the topic." in the editor`
- `When I add "bold words" to the editor with the "b" button`
- `Then the editor should contain "Webship test: the first post of the topic."`
- `When I tag the topic with "webship, test"`
- `When I choose the topic type "Sticky"`
- `When I give the edit reason "Clearer title"`
- `When I submit the post`
- `Then the editor should show the error "Your topic needs a title."`
- `When I reply to the topic with "Webship test reply."`
- `When I edit post 1`
- `Then post 1 should offer the link "Edit"`

### `bbpress-moderation.steps.js` (12)

- `When I close the topic`
- `When I stick the topic to the front`
- `When I delete the topic permanently`
- `When I merge the topic into "Webship test topic"`
- `When I split the topic from post 3 into "Webship test split"`
- `When I move the topic to "Help and support"`
- `When I unapprove the last post`
- `When I delete the last post permanently`
- `Then the last post should be pending`
- `When I move the last post to a new topic "Webship test: moved reply"`
- `When I show the hidden posts`
- `Then I should see the moderator tools`

### `bbpress-profile.steps.js` (12)

- `When I subscribe to the topic`
- `When I favorite the topic`
- `Then the topic should be subscribed to`
- `Then my favorites should list "Welcome to the forums"`
- `When I remove "Welcome to the forums" from my favorites`
- `Given I have no favorites`
- `When I open the forum profile of "participant"`
- `When I open "Topics Started" in the forum profile`
- `Then the forum profile should offer the page "Subscriptions"`
- `Then the forum profile should show "Forum Role: Participant"`
- `Then the forum role of "moderator" should be "Moderator"`
- `When I save my forum profile`

### `bbpress-search.steps.js` (7)

- `When I search the forums for "marigolds"`
- `Then the search should find 2 matches`
- `Then the search results should show "A community garden in spring"`
- `Then the search result "A community garden in spring" should be a topic in "General discussion"`
- `When I open the search result "A community garden in spring"`
- `When I open the topic tag "spring"`
- `When I open the forum view "Most popular topics"`

### `bbpress-admin.steps.js` (9)

- `Then the topics list should include "Welcome to the forums"`
- `Then the topic "The spring meetup is over" should be closed in the topics list`
- `When I close the topic "Webship test topic" from the topics list`
- `When I restore the topic "Webship test topic" from the topics trash`
- `When I turn the forum feature "Favorites" off`
- `Then the forum feature "Favorites" should be on`
- `When I run the forum repair tool "Recount topics in each forum"`
- `Then the users screen should show the forum role "Moderator" for "moderator"`
- `When I change the forum role of "spectator" to "Participant"`

### `bbpress-mail.steps.js` (3)

- `Then a forum notification with the subject "Webship test topic" should be sent to "participant"`
- `Then no forum notification should be sent to "moderator"`
- `Then the forum notification with the subject "Webship test topic" to "participant" should contain "moderator wrote:"`

### `bbpress-content.steps.js` (4)

- `Given there is no topic "Webship test topic"`
- `Given there is a topic "Webship test topic" in "General discussion" by "participant"`
- `Given there is a topic "Webship test topic" in "General discussion" by "participant" with:`
- `Given "moderator" replied to the topic "Webship test topic" with "Webship test reply of the moderator."`

## Phrases shared with other packs

The phrases of a forum (a forum and its topics, a topic and its posts, a reply, the editor, moderation, the
test content) are the ones of the other forum packs, so a scenario of a forum reads the same on every system (one
`cucumber.js` profile per system; the platform packs are not meant to be loaded together). Loaded beside each of
the 40 other packs, these phrases of this pack also match one of theirs:

| Phrase of this pack | Also in |
| --- | --- |
| `I should not be allowed to open "…"` | aspnet-core, discourse, django, django-cms, payload, phpbb, spring-boot, strapi, wagtail |
| `I open the search result "…"` | docusaurus, hubspot-cms, joomla, nextcloud, phpbb |
| `I reply to the topic with "…"` | discourse, phpbb |
| `I should be reading the topic "…"` | discourse, phpbb |
| `I write "…" in the editor` | ghost, phpbb |
| `post 1 should be by "…"` | discourse, phpbb |
| `post 1 should read "…"` | discourse, phpbb |
| `the editor should contain "…"` | ghost, phpbb |
| `the search results should show "…"` | discourse, phpbb |
| `the topic should have 3 posts` | discourse, phpbb |
| `there is a topic "…" in "…" by "…"` | discourse, phpbb |
| `there is a topic "…" in "…" by "…" with:` | discourse, phpbb |
| `there is no topic "…"` | discourse, phpbb |
| `"…" replied to the topic "…" with "…"` | discourse |
| `I close the topic` | discourse |
| `I delete the last post permanently` | phpbb |
| `I delete the topic permanently` | phpbb |
| `I edit post 1` | phpbb |
| `I go to page 2` | phpbb |
| `I move the topic to "…"` | phpbb |
| `I open the forum "…"` | phpbb |
| `I open the topic "…"` | discourse |
| `I open the topic "…" in "…"` | phpbb |
| `I should be in the forum "…"` | phpbb |
| `I should be on page 2` | phpbb |
| `I should not be able to reply` | phpbb |
| `I should see the moderator tools` | phpbb |
| `I split the topic from post 3 into "…"` | phpbb |
| `I start a new topic in "…"` | phpbb |
| `I submit the post` | phpbb |
| `I subscribe to the topic` | phpbb |
| `the editor should show the error "…"` | phpbb |
| `the first topic of the forum should be "…"` | phpbb |
| `the forum should have 4 topics` | phpbb |
| `the forum should list the topic "…"` | phpbb |
| `the search should find 2 matches` | phpbb |
| `the topic should be closed` | discourse |
| `the topic should be open` | phpbb |
| `the topic should be subscribed to` | phpbb |

The session phrases every platform pack has (`I am a logged in user with the "…" user`, `I log out`, `I should be
logged in`) are not in this table: here they are the WordPress pack's, which this pack loads.

None of this pack's phrases matches a step of webship-js, of the WordPress pack it loads, or of the other
extension of that pack (WooCommerce), so a site with a shop and forums loads both extensions in one profile. None
matches a phrase of the component pack (Bootstrap), of the Diffy pack or of the Shopify pack either, which can be
loaded beside this one.

## Testing this package

```bash
npm ci
npm run test:examples    # every step's JSDoc examples match it and nothing else; every feature step resolves
npm run test:paths       # a feature named on the command line runs alone
npx cucumber-js --dry-run
SITE_DIR="$PWD/../bbpress-site" .github/scripts/build-ddev-site.sh
npx cucumber-js          # the whole suite
npm run test:must-fail   # the assertions that must fail, each with its message and a hint
THEME=twentytwentyone PHP_VERSION=8.2 SITE_DIR="$PWD/../bbpress-site-classic" .github/scripts/build-ddev-site.sh
npx cucumber-js
```

The second build makes a project of the same name: remove the first one before it (`ddev delete -Oy bbpresssteps`).

## How the steps were written

Every step was written from a round of manual testing of the real local site in the browser first: each page it touches was opened as the account the step works as, its lists, labels and messages noted, and the signal it gives while it works found (the class a moderation link leaves on a post, the mark of a subscription, the address a reply lands on). The failures of the first runs went back to the browser before the step changed: a forum's address that answers "not found" until the rewrite rules are written again, a private forum whose heading says "Private:" twice, a pending topic a moderator does not see in its forum until it follows "(+1 hidden)", a spammed topic that lives in a view of its own in the administration, a row in the trash whose title carries a hidden "(Child of …)", an edit that leaves no line in the log when only the topic's status changed, and the author of a closed topic who still gets the reply form although the forums refuse what it sends.

## License

MIT, see [LICENSE](LICENSE).

## Logo

The logo in this README is the bbPress mark the plugin itself ships (`includes/admin/assets/icons/logo.svg` of bbPress 2.6.22, GPL-2.0-or-later), with its fill set to black; it stays under that licence, and is not part of the npm package. Simple Icons, the source of the other packs' logos, has none for bbPress. The bbPress name and logo belong to their owner; this pack is not affiliated with or endorsed by them.
