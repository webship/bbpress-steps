'use strict';

// The forum index and a forum: the forums an account sees and their counters
// and marks (a category, closed, private, hidden, a subforum), the topics of a
// forum (their order, their marks, their counters), the pages of a list, the
// forums' breadcrumbs, what the forums say in their notices, and whether the
// account may start a topic or reply.
//
// The lists are rendered on the server: a step reads the rows the forums
// print (`ul#bbp-forum-<id>`, `ul#bbp-topic-<id>`) and the classes they set
// on them, after the page settled.

const { Given, When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  FORUMS,
  settle,
  navigate,
  visit,
  supplied,
  clean,
  listed,
  same,
  holds,
  quotedList,
  eventually,
  gotoForumIndex,
  forumPage,
  forumNotices,
  listTotal,
  listedForums,
  forumNames,
  openForum,
  listedTopics,
} = require('./bbpress-helpers');

/** The forum of a list by its name, a row or a subforum under one; fails with the names that are there. */
async function forumRow(world, name) {
  const forums = await listedForums(world);
  const row = forums.find((f) => same(f.name, name));
  if (row) return row;
  const parent = forums.find((f) => f.subforums.some((s) => same(s.name, name)));
  if (parent) {
    throw friendly({
      message: `"${name}" is a subforum of "${parent.name}" on this page: the page shows its name and counters in one line, not its marks.`,
      hint: `Open "${parent.name}" first (When I open the forum "${parent.name}"): there "${name}" is a row of its own.`,
    });
  }
  throw friendly({
    message: `The page lists no forum "${name}". It lists: ${listed(forumNames(forums))}.`,
    hint: 'Open the forum index first: Given I am on the forum index. A private forum is listed for a logged-in participant, a hidden one for a moderator.',
  });
}

/** The topic of the list on the page by its title; fails with the titles that are there. */
async function topicRow(world, title) {
  const topics = await listedTopics(world);
  const row = topics.find((t) => same(t.title, title));
  if (!row) {
    throw friendly({
      message: `The list on the page has no topic "${title}". It lists: ${listed(topics.map((t) => t.title))}.`,
      hint: 'The step reads the page of the list that is open: When I go to page 2 opens the next one. A pending, spammed or trashed topic is left out of it, for a moderator too until it asks for them: When I show the hidden topics.',
    });
  }
  return row;
}

// ---------------------------------------------------------------------------
// The forum index
// ---------------------------------------------------------------------------

/**
 * Open the forum index: the page that lists the forums of the site
 * ("/forums/"; `worldParameters.forums.root` names another root).
 *
 * Example #1: Given I am on the forum index
 * Example #2: When I go to the forum index
 * Example #3: Given we are on the forum index
 * Example #4: And I go to the forum index
 * Example #5: When we go to the forum index
 */
Given(/^(?:(?:I am |we are )+on|(?:I |we )*go to) the forum index$/, async function () {
  await gotoForumIndex(this);
});

/**
 * Assert the forum index lists (or does not list) a forum by its name, as a
 * row or as a subforum under one; with a category, under that category.
 *
 * Example #1: Then the forum index should list the forum "Showcase"
 * Example #2: And the forum index should list the forum "General discussion" in the category "Community"
 * Example #3: Then the forum index should not list the forum "Staff room"
 * Example #4: And the forum index should not list the forum "Members lounge"
 * Example #5: Then the forum index should list the forum "Help and support" in the category "Community"
 */
Then(/^the forum index should( not)* list the forum "([^"]*)"(?: in the category "([^"]*)")?$/, async function (notCase, name, category) {
  await settle(this);
  const page = await forumPage(this);
  if (page.kind !== 'index') {
    if (notCase && page.kind === 'none') return;
    throw friendly({ message: `The page is not the forum index: it is "${page.heading}" (${page.url}).`, hint: 'Open it first: Given I am on the forum index.' });
  }
  const forums = await listedForums(this);
  let found;
  if (supplied(category)) {
    const parent = forums.find((f) => same(f.name, category));
    if (!parent) {
      throw friendly({ message: `The forum index lists no category "${category}". It lists: ${listed(forums.map((f) => f.name))}.`, hint: 'A category is a row of the index that holds forums.' });
    }
    found = parent.subforums.some((s) => same(s.name, name));
  } else {
    found = forumNames(forums).some((n) => same(n, name));
  }
  if (found === Boolean(notCase)) {
    throw friendly({
      message: notCase
        ? `Expected the forum index not to list the forum "${name}"${supplied(category) ? ` in the category "${category}"` : ''}, but it does.`
        : `Expected the forum index to list the forum "${name}"${supplied(category) ? ` in the category "${category}"` : ''}. It lists: ${listed(forumNames(forums))}.`,
      hint: 'A private forum is listed for a logged-in participant, a hidden one for a moderator or a keymaster.',
    });
  }
});

/**
 * Assert a counter of a forum's row: its topics, or its posts (topics and
 * replies together, the column the forums head "Posts").
 *
 * Example #1: Then the forum "Showcase" should have 16 topics in the list
 * Example #2: And the forum "Showcase" should have 16 posts in the list
 * Example #3: Then the forum "Archive" should have 1 topic in the list
 * Example #4: And the forum "Archive" should have 2 posts in the list
 * Example #5: Then the forum "Community" should have 7 topics in the list
 */
Then(/^the forum "([^"]*)" should have (\d+) (topics?|posts?) in the list$/, async function (name, count, what) {
  const key = what.startsWith('topic') ? 'topics' : 'posts';
  await eventually(this, () => forumRow(this, name), (row) => row[key] === Number(count), (row) => ({
    message: `Expected the forum "${name}" to show ${count} ${key}, but its row shows ${row ? row[key] : 'nothing'}.`,
    hint: 'The row counts what the account may read; "Posts" counts the topics and their replies together. A category counts the forums under it.',
  }), 1500);
});

/**
 * Assert a mark of a forum's row: a category, closed, private or hidden.
 *
 * Example #1: Then the forum "Archive" should be closed in the list
 * Example #2: And the forum "Community" should be a category in the list
 * Example #3: Then the forum "Members lounge" should be private in the list
 * Example #4: And the forum "Staff room" should be hidden in the list
 * Example #5: Then the forum "Showcase" should not be closed in the list
 */
Then(/^the forum "([^"]*)" should( not)* be (a category|closed|private|hidden) in the list$/, async function (name, notCase, mark) {
  const row = await forumRow(this, name);
  const is = { 'a category': row.category, closed: row.closed, private: row.private, hidden: row.hidden }[mark];
  if (is === Boolean(notCase)) {
    throw friendly({
      message: notCase ? `Expected the forum "${name}" not to be ${mark}, but its row says it is.` : `Expected the forum "${name}" to be ${mark}, but its row does not say so.`,
      hint: 'The marks are the ones the forum\'s own settings give it: its type (forum or category), its status (open or closed) and its visibility (public, private or hidden).',
    });
  }
});

// ---------------------------------------------------------------------------
// A forum
// ---------------------------------------------------------------------------

/**
 * Open a forum by its name, as a person does: from the page when it lists
 * the forum, else from the forum index.
 *
 * Example #1: When I open the forum "General discussion"
 * Example #2: And I open the forum "Showcase"
 * Example #3: When we open the forum "Help and support"
 * Example #4: When I open the forum "Members lounge"
 * Example #5: And we open the forum "Archive"
 */
When(/^(I |we )*open the forum "([^"]*)"$/, async function (pronounCase, name) {
  await openForum(this, name);
});

/**
 * Assert the page is a forum, by its name.
 *
 * Example #1: Then I should be in the forum "General discussion"
 * Example #2: And I should be in the forum "Showcase"
 * Example #3: Then we should be in the forum "Help and support"
 * Example #4: Then I should be in the forum "Members lounge"
 * Example #5: And we should be in the forum "Archive"
 */
Then(/^(I |we )*should be in the forum "([^"]*)"$/, async function (pronounCase, name) {
  await settle(this);
  const page = await forumPage(this);
  const heading = page.heading.replace(/^(?:(?:Private|Hidden|Protected):\s+)+/i, '');
  if (page.kind !== 'forum' || !same(heading, name)) {
    throw friendly({
      message: `The page is not the forum "${name}": it is ${page.kind === 'none' ? 'no page of the forums' : `"${page.heading}"`} (${page.url}).`,
      hint: 'Open it first: When I open the forum "…".',
    });
  }
});

/**
 * Assert the list on the page has (or has not) a topic, by its title, or the
 * forum a subforum, by its name. The list is the one of a forum, a topic
 * tag, a view or a page of a profile.
 *
 * Example #1: Then the forum should list the topic "Welcome to the forums"
 * Example #2: And the forum should not list the topic "Staff only: the moderation notes"
 * Example #3: Then the forum should list the subforum "General discussion"
 * Example #4: And the forum should list the topic "Forum rules"
 * Example #5: Then the forum should not list the subforum "Showcase"
 */
Then(/^the forum should( not)* list the (topic|subforum) "([^"]*)"$/, async function (notCase, what, name) {
  await settle(this);
  const names = what === 'topic'
    ? (await listedTopics(this)).map((t) => t.title)
    : (await listedForums(this)).map((f) => f.name);
  if (names.some((n) => same(n, name)) === Boolean(notCase)) {
    throw friendly({
      message: notCase
        ? `Expected no ${what} "${name}" on the page, but it is listed.`
        : `Expected the ${what} "${name}" on the page. It lists: ${listed(names)}.`,
      hint: what === 'topic'
        ? 'The step reads the page of the list that is open (15 topics a page). A super sticky topic is listed in every forum.'
        : 'A subforum is a row of the forum that holds it.',
    });
  }
});

/**
 * Assert a mark of a topic in the list on the page: sticky (in its forum),
 * super sticky (in every forum), closed, pending, spam or in the trash.
 *
 * Example #1: Then the topic "Welcome to the forums" should be sticky in the list
 * Example #2: And the topic "Forum rules" should be super sticky in the list
 * Example #3: Then the topic "The spring meetup is over" should be closed in the list
 * Example #4: And the topic "A community garden in spring" should not be sticky in the list
 * Example #5: Then the topic "A community garden in spring" should not be closed in the list
 */
Then(/^the topic "([^"]*)" should( not)* be (sticky|super sticky|closed|pending|spam|in the trash) in the list$/, async function (title, notCase, mark) {
  await settle(this);
  const row = await topicRow(this, title);
  const is = {
    sticky: row.sticky,
    'super sticky': row.superSticky,
    closed: row.status === 'closed',
    pending: row.status === 'pending',
    spam: row.status === 'spam',
    'in the trash': row.status === 'trash',
  }[mark];
  if (is === Boolean(notCase)) {
    throw friendly({
      message: notCase ? `Expected the topic "${title}" not to be ${mark}, but its row says it is.` : `Expected the topic "${title}" to be ${mark}, but its row says: ${row.superSticky ? 'super sticky' : (row.sticky ? 'sticky' : 'not sticky')}, status "${row.status}".`,
      hint: 'A sticky topic stays on top of its forum, a super sticky one on top of every forum. The status of a row is open ("publish"), closed, pending, spam or trash.',
    });
  }
});

/**
 * Assert what the row of a topic says: its replies (the "Posts" column
 * counts the topic's own post too), its voices (the accounts that wrote in
 * it), or who started it.
 *
 * Example #1: Then the topic "Welcome to the forums" should have 2 replies in the list
 * Example #2: And the topic "Welcome to the forums" should have 3 voices in the list
 * Example #3: Then the topic "Forum rules" should be by "keymaster" in the list
 * Example #4: And the topic "Forum rules" should have 0 replies in the list
 * Example #5: Then the topic "A community garden in spring" should have 1 reply in the list
 */
Then(/^the topic "([^"]*)" should (?:have (\d+) (repl(?:y|ies)|voices?)|be by "([^"]*)") in the list$/, async function (title, count, what, author) {
  await settle(this);
  const row = await topicRow(this, title);
  if (supplied(author)) {
    if (!same(row.author, author)) {
      throw friendly({ message: `Expected the topic "${title}" to be by "${author}", but its row says "${row.author}".`, hint: 'The row names the display name of the account that started the topic.' });
    }
    return;
  }
  const actual = what.startsWith('repl') ? row.posts - 1 : row.voices;
  if (actual !== Number(count)) {
    throw friendly({
      message: `Expected the topic "${title}" to have ${count} ${what}, but its row shows ${actual}.`,
      hint: 'The "Posts" column counts the topic\'s own post and its replies; "Voices" counts the accounts that wrote in the topic.',
    });
  }
});

/**
 * Assert how many topics the list of the page counts in all, over its pages
 * ("Viewing 15 topics - 1 through 15 (of 17 total)").
 *
 * Example #1: Then the forum should have 4 topics
 * Example #2: And the forum should have 17 topics
 * Example #3: Then the forum should have 1 topic
 * Example #4: Then the forum should have 0 topics
 * Example #5: And the forum should have 3 topics
 */
Then(/^the forum should have (\d+) topics?$/, async function (count) {
  await settle(this);
  const page = await forumPage(this);
  if (page.kind === 'none' || page.kind === 'topic') {
    throw friendly({ message: `The page is not a list of topics: it is ${page.heading ? `"${page.heading}"` : 'no page of the forums'} (${page.url}).`, hint: 'Open a forum first: When I open the forum "…".' });
  }
  const total = await listTotal(this);
  const actual = total && total.total !== null ? total.total : (await listedTopics(this)).length;
  if (actual !== Number(count)) {
    throw friendly({
      message: `Expected ${count} topic(s), but the list counts ${actual}${total ? ` ("${clean(total.text)}")` : ''}.`,
      hint: 'The list counts what the account may read. A super sticky topic counts in every forum.',
    });
  }
});

/**
 * Assert which topic the list on the page shows first.
 *
 * Example #1: Then the first topic of the forum should be "Forum rules"
 * Example #2: And the first topic of the forum should be "Welcome to the forums"
 * Example #3: Then the first topic of the forum should be "Showcase entry 16"
 * Example #4: Then the first topic of the forum should be "A long conversation"
 * Example #5: And the first topic of the forum should be "The forums opened"
 */
Then(/^the first topic of the forum should be "([^"]*)"$/, async function (title) {
  await settle(this);
  const topics = await listedTopics(this);
  if (!topics.length || !same(topics[0].title, title)) {
    throw friendly({
      message: `Expected the list to begin with the topic "${title}", but it ${topics.length ? `begins with "${topics[0].title}"` : 'is empty'}.`,
      hint: 'A forum lists the super sticky topics first, then its sticky ones, then the others by their last post.',
    });
  }
});

// ---------------------------------------------------------------------------
// The pages of a list
// ---------------------------------------------------------------------------

/**
 * Go to a page of the list that is open (the topics of a forum, the posts of
 * a topic, the search results), through the page links the forums print.
 *
 * Example #1: When I go to page 2
 * Example #2: And I go to page 1
 * Example #3: When we go to page 2
 * Example #4: When I go to page 3
 * Example #5: And we go to page 1
 */
When(/^(I |we )*go to page (\d+)$/, async function (pronounCase, number) {
  await settle(this);
  const state = await this.page.evaluate(([sel, wanted]) => {
    const box = document.querySelector(`${sel} .bbp-pagination-links`);
    if (!box) return { links: null };
    const current = box.querySelector('.current');
    const link = [...box.querySelectorAll('a.page-numbers')].find((a) => a.textContent.replace(/[^\d]/g, '') === wanted && !a.classList.contains('next') && !a.classList.contains('prev'));
    return { links: [...box.querySelectorAll('.page-numbers')].map((a) => a.textContent.trim()), current: current ? current.textContent.trim() : '', href: link ? link.href : '' };
  }, [FORUMS, String(number)]);
  if (state.links && state.current === String(number)) return;
  if (!state.links || !state.href) {
    throw friendly({
      message: `The list has no page ${number}${state.links && state.links.length ? `: its pages are ${listed(state.links.filter((l) => /^\d+$/.test(l)))}` : ': it fits on one page'}.`,
      hint: 'A forum shows 15 topics a page and a topic 15 posts, unless the forums\' settings say otherwise.',
    });
  }
  await navigate(this, state.href);
});

/**
 * Assert which page of a list the browser shows.
 *
 * Example #1: Then I should be on page 2
 * Example #2: And I should be on page 1
 * Example #3: Then we should be on page 2
 * Example #4: Then I should be on page 3
 * Example #5: And we should be on page 1
 */
Then(/^(I |we )*should be on page (\d+)$/, async function (pronounCase, number) {
  await settle(this);
  const current = await this.page.evaluate((sel) => {
    const box = document.querySelector(`${sel} .bbp-pagination-links`);
    const mark = box && box.querySelector('.current');
    return mark ? mark.textContent.replace(/[^\d]/g, '') : '1';
  }, FORUMS);
  if (current !== String(number)) {
    throw friendly({ message: `Expected page ${number} of the list, but the browser shows page ${current} (${this.page.url()}).`, hint: 'The page is the one the page links of the list mark as current.' });
  }
});

// ---------------------------------------------------------------------------
// Breadcrumbs, notices, what the account may do
// ---------------------------------------------------------------------------

/**
 * Assert the breadcrumbs the forums print above a page, in order.
 *
 * Example #1: Then the forum breadcrumbs should be "Home", "Forums" and "Showcase"
 * Example #2: And the forum breadcrumbs should be "Home" and "Forums"
 * Example #3: Then the forum breadcrumbs should be "Home", "Forums", "Community" and "General discussion"
 * Example #4: Then the forum breadcrumbs should be "Home", "Forums", "Community", "General discussion" and "Forum rules"
 * Example #5: And the forum breadcrumbs should be "Home", "Forums" and "Topic Tag: spring"
 */
Then(/^the forum breadcrumbs should be ("[^"]*"(?:(?:, | and )"[^"]*")*)$/, async function (list) {
  const expected = quotedList(list);
  const read = () => this.page.evaluate((sel) => {
    const box = document.querySelector(`${sel} .bbp-breadcrumb`);
    if (!box) return null;
    return [...box.querySelectorAll('a, .bbp-breadcrumb-current')].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
  }, FORUMS);
  await eventually(this, read, (crumbs) => Array.isArray(crumbs) && crumbs.length === expected.length && crumbs.every((c, i) => same(c, expected[i])), (crumbs) => ({
    message: crumbs ? `Expected the breadcrumbs ${listed(expected)}, but the page shows ${listed(crumbs)}.` : `The page shows no breadcrumbs of the forums (${this.page.url()}).`,
    hint: 'The breadcrumbs are the line above a page of the forums: the site, the forums\' root, the forums on the way, the page itself.',
  }), 1500);
});

/**
 * Assert a notice of the forums on the page holds (or holds not) a text:
 * what a forum or a topic says about itself ("This forum has 4 topics, …"),
 * a refusal ("You must be logged in to reply to this topic."), a mark ("This
 * topic is marked as spam."), an empty list.
 *
 * Example #1: Then the forums should say "You must be logged in to reply to this topic."
 * Example #2: And the forums should say "This forum has 4 topics, 4 replies"
 * Example #3: Then the forums should not say "You cannot reply to this topic."
 * Example #4: And the forums should say "is closed to new replies"
 * Example #5: Then the forums should say "Oh, bother! No topics were found here."
 */
Then(/^the forums should( not)* say "([^"]*)"$/, async function (notCase, text) {
  if (notCase) {
    await settle(this);
    const notices = await forumNotices(this);
    const hit = notices.find((n) => holds(n.text, text));
    if (hit) throw friendly({ message: `Expected no notice of the forums saying "${text}", but one says: "${hit.text}".`, hint: 'The notices are the boxes the forums print on a page.' });
    return;
  }
  await eventually(this, () => forumNotices(this), (notices) => notices.some((n) => holds(n.text, text)), (notices) => ({
    message: `Expected a notice of the forums saying "${text}". ${(notices || []).length ? `The page says: ${listed((notices || []).map((n) => n.text))}` : 'The page shows no notice of the forums'} (${this.page.url()}).`,
    hint: 'The text is matched as a part of a notice, letter case aside.',
  }), 3000);
});

/**
 * Assert the account may (or may not) start a topic or reply on the page:
 * whether the forums print the form for it.
 *
 * Example #1: Then I should be able to start a topic
 * Example #2: And I should not be able to reply
 * Example #3: Then I should not be able to start a topic
 * Example #4: And we should be able to reply
 * Example #5: Then we should not be able to reply
 */
Then(/^(I |we )*should( not)* be able to (start a topic|reply)$/, async function (pronounCase, notCase, what) {
  await settle(this);
  const field = what === 'reply' ? '#bbp_reply_content' : '#bbp_topic_title';
  const has = await this.page.locator(`${FORUMS} form#new-post ${field}`).count() > 0;
  if (has === Boolean(notCase)) {
    const notices = (await forumNotices(this)).filter((n) => n.kind !== 'info').map((n) => n.text);
    throw friendly({
      message: notCase
        ? `Expected no form to ${what}, but the page has one (${this.page.url()}).`
        : `Expected the form to ${what}, but the page has none${notices.length ? `: the forums say ${listed(notices)}` : ''} (${this.page.url()}).`,
      hint: what === 'reply'
        ? 'A topic offers its reply form to a participant; a visitor, a spectator and a closed topic get a notice instead.'
        : 'A forum offers its topic form to a participant; a visitor, a spectator, a category and a closed forum get a notice instead.',
    });
  }
});

/**
 * Assert the forums do not let the account open a page: the address answers
 * "not found" or "forbidden", or sends the browser to the login page.
 *
 * Example #1: Then I should not be allowed to open "/forums/forum/staff-room/"
 * Example #2: And I should not be allowed to open "/forums/forum/members-lounge/"
 * Example #3: Then we should not be allowed to open "/forums/"
 * Example #4: Then I should not be allowed to open "/wp-admin/edit.php?post_type=topic"
 * Example #5: And I should not be allowed to open "/forums/topic/forum-rules/edit/"
 */
Then(/^(I |we )*should not be allowed to open "([^"]*)"$/, async function (pronounCase, address) {
  const status = await visit(this, address);
  const url = new URL(this.page.url());
  const wanted = new URL(address, this.launchUrl.replace(/\/+$/, '') + '/');
  const refused = status === 403 || status === 404 || /\/wp-login\.php/.test(url.pathname)
    || (url.pathname !== wanted.pathname && !url.pathname.startsWith(wanted.pathname));
  if (!refused) {
    throw friendly({
      message: `Expected the site to refuse "${address}", but it answered ${status} with "${clean(await this.page.title())}" (${this.page.url()}).`,
      hint: 'A refusal is a "not found" page (a private or hidden forum, every forum for a blocked account), a "forbidden" page of the administration, the login page, or the page the forums send the account back to.',
    });
  }
});
