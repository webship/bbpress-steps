'use strict';

// Finding topics: the forum search (its form, its results, opening one), the
// pages of a topic tag, and the views of the forums ("Most popular topics",
// "Topics with no replies").
//
// The search answers with a page of its own (`/forums/search/<words>/`): its
// results are topics and replies together, each headed by the topic it
// belongs to.

const { When, Then } = require('@cucumber/cucumber');
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
  clickAndLoad,
  forumsRoot,
  gotoForumIndex,
  forumPage,
  forumNotices,
  listTotal,
  readingTopic,
} = require('./bbpress-helpers');

/** The results of the search page: a topic or a reply each, with its topic, its forum, its author and its text. */
async function searchResults(world) {
  return world.page.evaluate((sel) => {
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const out = [];
    for (const body of document.querySelectorAll(`${sel} #bbp-search-results li.bbp-body > div[id^="post-"]`)) {
      const header = body.previousElementSibling;
      const isTopic = body.classList.contains('type-topic');
      const link = header ? header.querySelector(isTopic ? '.bbp-topic-title h3 a' : '.bbp-reply-title h3 a') : null;
      out.push({
        kind: isTopic ? 'topic' : 'reply',
        topic: text(link),
        href: (isTopic ? (link && link.href) : ((header && header.querySelector('a.bbp-reply-permalink')) || {}).href) || '',
        forum: isTopic && header ? text(header.querySelector('.bbp-topic-title-meta a')) : '',
        author: text(body.querySelector('.bbp-author-name')),
        text: text(body.querySelector('.bbp-topic-content, .bbp-reply-content')),
      });
    }
    return out;
  }, FORUMS).catch(() => []);
}

/** Assert the page is the search's, or fail. */
async function onSearch(world) {
  const page = await forumPage(world);
  if (page.kind !== 'search') {
    throw friendly({ message: `The page is not the forum search: it is ${page.heading ? `"${page.heading}"` : 'no page of the forums'} (${page.url}).`, hint: 'Search first: When I search the forums for "…".' });
  }
}

/**
 * Search the forums with the search form of the forum index; the step waits
 * for the results page.
 *
 * Example #1: When I search the forums for "marigolds"
 * Example #2: And I search the forums for "password"
 * Example #3: When we search the forums for "long conversation"
 * Example #4: When I search the forums for "nothingmatchesthisword"
 * Example #5: And we search the forums for "Showcase entry 07"
 */
When(/^(I |we )*search the forums for "([^"]*)"$/, async function (pronounCase, words) {
  let field = this.page.locator(`${FORUMS} #bbp-search-form #bbp_search`);
  if (!(await field.count())) {
    await gotoForumIndex(this);
    field = this.page.locator(`${FORUMS} #bbp-search-form #bbp_search`);
  }
  if (!(await field.count())) {
    throw friendly({ message: `The forum index has no search form (${this.page.url()}).`, hint: 'The forums\' "Search" setting turns the forum-wide search on; a blocked account gets no forum index.' });
  }
  await field.fill(words);
  await clickAndLoad(this, this.page.locator(`${FORUMS} #bbp-search-form #bbp_search_submit`), 'search the forums');
  await onSearch(this);
});

/**
 * Assert how many results the forum search found in all, over its pages
 * ("Viewing 2 results - 1 through 2 (of 2 total)"); 0 when it found none.
 *
 * Example #1: Then the search should find 2 matches
 * Example #2: And the search should find 1 match
 * Example #3: Then the search should find 0 matches
 * Example #4: Then the search should find 18 matches
 * Example #5: And the search should find 3 matches
 */
Then(/^the search should find (\d+) match(?:es)?$/, async function (count) {
  await settle(this);
  await onSearch(this);
  const total = await listTotal(this);
  const actual = total && total.total !== null ? total.total : (await searchResults(this)).length;
  if (actual !== Number(count)) {
    const notices = (await forumNotices(this)).map((n) => n.text);
    throw friendly({
      message: `Expected the search to find ${count} match(es), but it found ${actual}${total ? ` ("${clean(total.text)}")` : (notices.length ? `: ${listed(notices)}` : '')}.`,
      hint: 'The search counts topics and replies, each a match of its own, in the forums the account may read.',
    });
  }
});

/**
 * Assert the results of the forum search show (or do not show) a text: the
 * title of a topic, or a part of a post.
 *
 * Example #1: Then the search results should show "A community garden in spring"
 * Example #2: And the search results should show "Marigolds keep the aphids away"
 * Example #3: Then the search results should not show "Staff only"
 * Example #4: Then the search results should show "How do I change my password?"
 * Example #5: And the search results should not show "Members only"
 */
Then(/^the search results should( not)* show "([^"]*)"$/, async function (notCase, text) {
  await settle(this);
  await onSearch(this);
  const results = await searchResults(this);
  const hit = results.some((r) => holds(r.topic, text) || holds(r.text, text));
  if (hit === Boolean(notCase)) {
    throw friendly({
      message: notCase
        ? `Expected the search results not to show "${text}", but they do.`
        : `Expected the search results to show "${text}". ${results.length ? `They show: ${listed(results.map((r) => `${r.kind} in "${r.topic}": ${r.text.slice(0, 60)}`))}` : 'The search found nothing'}.`,
      hint: 'The step reads the page of the results that is open: the topic each result belongs to, and its text.',
    });
  }
});

/**
 * Assert a result of the forum search is a topic or a reply, by the topic it
 * belongs to, and for a topic the forum the result names.
 *
 * Example #1: Then the search result "A community garden in spring" should be a topic in "General discussion"
 * Example #2: And the search result "A community garden in spring" should be a reply
 * Example #3: Then the search result "How do I change my password?" should be a topic in "Help and support"
 * Example #4: Then the search result "Welcome to the forums" should be a reply
 * Example #5: And the search result "A long conversation" should be a topic
 */
Then(/^the search result "([^"]*)" should be a (topic|reply)(?: in "([^"]*)")?$/, async function (title, kind, forum) {
  await settle(this);
  await onSearch(this);
  const results = (await searchResults(this)).filter((r) => same(r.topic, title));
  const found = results.find((r) => r.kind === kind);
  if (!found) {
    throw friendly({
      message: results.length
        ? `The search results of "${title}" are ${listed(results.map((r) => `a ${r.kind}`))}, none a ${kind}.`
        : `The search results name no topic "${title}".`,
      hint: 'A topic is a result when its title or its own post matches; a reply when the reply matches, headed "In reply to: <topic>".',
    });
  }
  if (supplied(forum) && !same(found.forum, forum)) {
    throw friendly({ message: `The search result "${title}" is in the forum "${found.forum || '(not named)'}", not in "${forum}".`, hint: 'A topic among the results names its forum; a reply names its topic only.' });
  }
});

/**
 * Open a result of the forum search, by the topic it belongs to: the topic
 * itself when it is among the results, else its first reply there.
 *
 * Example #1: When I open the search result "A community garden in spring"
 * Example #2: And I open the search result "How do I change my password?"
 * Example #3: When we open the search result "A long conversation"
 * Example #4: When I open the search result "Welcome to the forums"
 * Example #5: And we open the search result "Forum rules"
 */
When(/^(I |we )*open the search result "([^"]*)"$/, async function (pronounCase, title) {
  await settle(this);
  await onSearch(this);
  const results = await searchResults(this);
  const mine = results.filter((r) => same(r.topic, title));
  const result = mine.find((r) => r.kind === 'topic') || mine[0];
  if (!result || !result.href) {
    throw friendly({ message: `The search results name no topic "${title}". They name: ${listed([...new Set(results.map((r) => r.topic))])}.`, hint: 'A result is opened by the title of the topic it belongs to.' });
  }
  await navigate(this, result.href);
  await readingTopic(this, title);
});

/**
 * Open the page of a topic tag: the topics that carry it, from every forum
 * the account may read.
 *
 * Example #1: When I open the topic tag "spring"
 * Example #2: And I open the topic tag "howto"
 * Example #3: When we open the topic tag "showcase"
 * Example #4: When I open the topic tag "account"
 * Example #5: And we open the topic tag "welcome"
 */
When(/^(I |we )*open the topic tag "([^"]*)"$/, async function (pronounCase, tag) {
  // The tag of a topic that is open is a link; any other is reached by its address.
  const link = await this.page.evaluate(([sel, wanted]) => {
    const norm = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
    const found = [...document.querySelectorAll(`${sel} .bbp-topic-tags a`)].find((a) => norm(a.textContent) === norm(wanted));
    return found ? found.href : '';
  }, [FORUMS, tag]).catch(() => '');
  const slug = clean(tag).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const status = await visit(this, link || `${forumsRoot(this)}topic-tag/${slug}/`);
  const page = await forumPage(this);
  if (page.kind !== 'tag') {
    throw friendly({
      message: `The forums have no page for the topic tag "${tag}": the site answered ${status || 'nothing'} (${page.url}).`,
      hint: 'A tag has a page once a topic the account may read carries it. The forums\' "Topic tags" setting turns tags on.',
    });
  }
});

/**
 * Open a view of the forums by the name its page carries: "Most popular
 * topics", "Topics with no replies".
 *
 * Example #1: When I open the forum view "Most popular topics"
 * Example #2: And I open the forum view "Topics with no replies"
 * Example #3: When we open the forum view "Most popular topics"
 * Example #4: When we open the forum view "Topics with no replies"
 * Example #5: And I open the forum view "Most popular topics"
 */
When(/^(I |we )*open the forum view "([^"]*)"$/, async function (pronounCase, name) {
  const views = { 'most popular topics': 'popular', 'topics with no replies': 'no-replies' };
  const slug = views[clean(name).toLowerCase()] || clean(name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const status = await visit(this, `${forumsRoot(this)}view/${slug}/`);
  const page = await forumPage(this);
  if (page.kind !== 'view') {
    throw friendly({
      message: `The forums have no view "${name}": the site answered ${status || 'nothing'} (${page.url}).`,
      hint: `The views the forums come with: ${Object.keys(views).map((v) => `"${v[0].toUpperCase()}${v.slice(1)}"`).join(', ')}. A view a plugin adds is named by its address ("my-view" for /forums/view/my-view/).`,
    });
  }
});
