'use strict';

// What an account keeps in the forums and its forum profile: subscribing to
// a topic or a forum, marking a topic as a favorite, the lists of the
// profile (topics started, replies created, engagements, favorites,
// subscriptions), removing a row from them, the profile itself (what it
// shows, the pages it offers, the forum role), and its edit form.
//
// Subscribe and Favorite are links the forums answer in place: the click
// posts to the page (`?bbp-ajax=true`), the forums mark the link's wrapper
// (`is-subscribed`, `is-favorite`) and turn its text into its opposite. A step
// waits for that mark. The `×` of a profile's list removes its row the same
// way.

const { Given, When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  resolveUser,
} = require('@webship-js/wordpress-steps/tests/step-definitions/wordpress-helpers');
const {
  FORUMS,
  budget,
  settle,
  navigate,
  visit,
  clean,
  listed,
  same,
  holds,
  eventually,
  clickAndLoad,
  forumsRoot,
  forumPage,
  forumNotices,
  listedForums,
  listedTopics,
  readingTopic,
} = require('./bbpress-helpers');

/** The login name of a handle of the users registry, or the name itself when the registry has no such handle. */
function loginOf(world, who) {
  const users = (world.parameters && world.parameters.users) || {};
  return users[who] ? resolveUser(world, who).username : who;
}

/** The login name of the account the browser is logged in as, read from the site's toolbar. */
async function currentLogin(world) {
  const login = await world.page.evaluate(() => {
    const own = document.querySelector('#wp-admin-bar-user-info .username, #wp-admin-bar-user-info .display-name');
    return own ? own.textContent.trim() : '';
  }).catch(() => '');
  if (login) return login;
  // No toolbar on the page (a blank page, a page of another site): ask the forums' own redirect.
  await navigate(world, forumsRoot(world));
  const again = await world.page.evaluate(() => {
    const own = document.querySelector('#wp-admin-bar-user-info .username, #wp-admin-bar-user-info .display-name');
    return own ? own.textContent.trim() : '';
  }).catch(() => '');
  if (!again) {
    throw friendly({ message: 'No account is logged in: the page has no toolbar of the site.', hint: 'Log in first: Given I am a logged in user with the "participant" user. A site that hides the toolbar from its members cannot tell the step whose profile "my" means.' });
  }
  return again;
}

const PROFILE_PAGES = {
  'profile': '',
  'topics started': 'topics/',
  'replies created': 'replies/',
  'engagements': 'engagements/',
  'favorites': 'favorites/',
  'subscriptions': 'subscriptions/',
  'edit': 'edit/',
};

/** Open a page of the forum profile of an account. */
async function openProfile(world, login, page) {
  const status = await visit(world, `${forumsRoot(world)}users/${encodeURIComponent(login)}/${PROFILE_PAGES[page || 'profile']}`);
  const state = await forumPage(world);
  if (state.kind !== 'profile') {
    throw friendly({
      message: `The forum profile of "${login}" did not open: the site answered ${status || 'nothing'} with ${state.heading ? `"${state.heading}"` : 'no page of the forums'} (${state.url}).`,
      hint: 'A profile is found by the login name of its account. A blocked account, and a site whose forums are not at "/forums/" (worldParameters.forums.root), get no profile here.',
    });
  }
}

/** The toggle of the page (subscribe or favorite): its link, and whether it is on. */
async function toggleState(world, kind) {
  return world.page.evaluate(([sel, kind]) => {
    const box = document.querySelector(`${sel} #${kind === 'favorite' ? 'favorite' : 'subscription'}-toggle`);
    if (!box) return null;
    const link = box.querySelector('a');
    const mark = box.querySelector(kind === 'favorite' ? '.is-favorite' : '.is-subscribed');
    return { on: Boolean(mark), text: link ? link.textContent.trim() : '' };
  }, [FORUMS, kind]);
}

/** Click the subscribe or favorite link of the page and wait for the forums to mark it. */
async function toggle(world, kind, on, what) {
  await settle(world);
  const state = await toggleState(world, kind);
  if (!state) {
    throw friendly({
      message: `The page offers this account no link to ${what}.`,
      hint: kind === 'favorite'
        ? 'A logged-in account gets "Favorite" above a topic, when the forums\' "Favorites" setting allows it.'
        : 'A logged-in account gets "Subscribe" above a topic and a forum, when the forums\' "Subscriptions" setting allows it.',
    });
  }
  if (state.on === on) return;
  const id = kind === 'favorite' ? 'favorite' : 'subscription';
  await world.page.locator(`${FORUMS} #${id}-toggle a`).first().click();
  await eventually(world, () => toggleState(world, kind), (now) => now && now.on === on, (now) => ({
    message: `Clicked "${state.text}", but the forums did not ${what}: the link still reads "${now ? now.text : ''}".`,
    hint: 'The forums answer the click in place and turn the link into its opposite; a link whose security token is too old is refused, so load the page again.',
  }), budget(world) * 3);
}

/** The rows of a list of the profile that is open: topics, or the subscribed forums. */
async function profileRows(world, list) {
  if (list === 'subscribed forums') return (await listedForums(world)).map((f) => ({ name: f.name, remove: f.remove, id: `bbp-forum-${f.id}` }));
  return (await listedTopics(world)).map((t) => ({ name: t.title, remove: t.remove, id: `bbp-topic-${t.id}` }));
}

const MY_LISTS = {
  'favorites': 'favorites',
  'subscribed topics': 'subscriptions',
  'subscribed forums': 'subscriptions',
  'topics started': 'topics started',
  'engagements': 'engagements',
};

// ---------------------------------------------------------------------------
// Subscriptions and favorites
// ---------------------------------------------------------------------------

/**
 * Subscribe the account to the topic or the forum that is open, or end the
 * subscription, with the link above it; nothing happens when it is that way
 * already.
 *
 * Example #1: When I subscribe to the topic
 * Example #2: And I unsubscribe from the topic
 * Example #3: When we subscribe to the forum
 * Example #4: When I unsubscribe from the forum
 * Example #5: And we subscribe to the topic
 */
When(/^(I |we )*(subscribe to|unsubscribe from) the (topic|forum)$/, async function (pronounCase, action, what) {
  const page = await forumPage(this);
  if (page.kind !== what) {
    throw friendly({ message: `The page is not a ${what}: it is ${page.heading ? `"${page.heading}"` : 'no page of the forums'} (${page.url}).`, hint: `Open the ${what} first.` });
  }
  await toggle(this, 'subscription', action === 'subscribe to', `${action} the ${what}`);
});

/**
 * Mark the topic that is open as a favorite of the account, or take the mark
 * away, with the link above it; nothing happens when it is that way already.
 *
 * Example #1: When I favorite the topic
 * Example #2: And I unfavorite the topic
 * Example #3: When we favorite the topic
 * Example #4: When we unfavorite the topic
 * Example #5: And I favorite the topic
 */
When(/^(I |we )*(favorite|unfavorite) the topic$/, async function (pronounCase, action) {
  await readingTopic(this);
  await toggle(this, 'favorite', action === 'favorite', `${action} the topic`);
});

/**
 * Assert the topic or the forum that is open is (or is not) subscribed to by
 * the account, or the topic a favorite of it: what the link above it says.
 *
 * Example #1: Then the topic should be subscribed to
 * Example #2: And the topic should be a favorite
 * Example #3: Then the forum should not be subscribed to
 * Example #4: Then the topic should not be a favorite
 * Example #5: And the forum should be subscribed to
 */
Then(/^the (topic|forum) should( not)* be (subscribed to|a favorite)$/, async function (what, notCase, state) {
  await settle(this);
  const kind = state === 'a favorite' ? 'favorite' : 'subscription';
  const now = await toggleState(this, kind);
  if (!now) {
    throw friendly({ message: `The page offers this account no ${kind} link (${this.page.url()}).`, hint: 'A logged-in account gets the links above a topic (Favorite, Subscribe) and a forum (Subscribe), when the forums\' settings allow them.' });
  }
  if (now.on === Boolean(notCase)) {
    throw friendly({
      message: notCase ? `Expected the ${what} not to be ${state}, but its link reads "${now.text}".` : `Expected the ${what} to be ${state}, but its link reads "${now.text}".`,
      hint: 'A reply sent with "Notify me of follow-up replies via email" unchecked ends the subscription to its topic.',
    });
  }
});

/**
 * Assert a list of the account's own forum profile has (or has not) a topic
 * or a forum: its favorites, the topics or the forums it subscribed to, the
 * topics it started, the topics it wrote in (engagements).
 *
 * Example #1: Then my favorites should list "Welcome to the forums"
 * Example #2: And my subscribed topics should list "A community garden in spring"
 * Example #3: Then my subscribed forums should list "Help and support"
 * Example #4: Then my topics started should not list "Forum rules"
 * Example #5: And my engagements should list "Welcome to the forums"
 */
Then(/^my (favorites|subscribed topics|subscribed forums|topics started|engagements) should( not)* list "([^"]*)"$/, async function (list, notCase, name) {
  await openProfile(this, await currentLogin(this), MY_LISTS[list]);
  const rows = await profileRows(this, list);
  if (rows.some((r) => same(r.name, name)) === Boolean(notCase)) {
    throw friendly({
      message: notCase ? `Expected my ${list} not to list "${name}", but they do.` : `Expected my ${list} to list "${name}". They list: ${listed(rows.map((r) => r.name))}.`,
      hint: 'The list is the one of the account\'s own forum profile, on its first page (15 topics a page).',
    });
  }
});

/**
 * Remove a topic or a forum from a list of the account's own forum profile,
 * with the `×` of its row: its favorites, its subscribed topics or forums.
 *
 * Example #1: When I remove "Welcome to the forums" from my favorites
 * Example #2: And I remove "A community garden in spring" from my subscribed topics
 * Example #3: When we remove "Help and support" from my subscribed forums
 * Example #4: When I remove "Forum rules" from my favorites
 * Example #5: And we remove "A long conversation" from my subscribed topics
 */
When(/^(I |we )*remove "([^"]*)" from my (favorites|subscribed topics|subscribed forums)$/, async function (pronounCase, name, list) {
  await openProfile(this, await currentLogin(this), MY_LISTS[list]);
  const rows = await profileRows(this, list);
  const row = rows.find((r) => same(r.name, name));
  if (!row) {
    throw friendly({ message: `My ${list} do not list "${name}". They list: ${listed(rows.map((r) => r.name))}.`, hint: 'Only what the list shows can be removed from it.' });
  }
  await this.page.locator(`${FORUMS} #${row.id} .bbp-row-actions a`).first().click();
  await eventually(this, () => profileRows(this, list), (now) => !now.some((r) => same(r.name, name)), () => ({
    message: `Clicked the × of "${name}", but my ${list} still list it.`,
    hint: 'The forums take the row away in place.',
  }), budget(this) * 3);
});

/**
 * Empty the account's favorites or subscriptions (topics and forums), so a
 * scenario starts from none whatever an earlier run left.
 *
 * Example #1: Given I have no favorites
 * Example #2: And I have no subscriptions
 * Example #3: Given we have no favorites
 * Example #4: Given we have no subscriptions
 * Example #5: And I have no favorites
 */
Given(/^(I |we )*have no (favorites|subscriptions)$/, async function (pronounCase, what) {
  const login = await currentLogin(this);
  for (let round = 0; round < 60; round += 1) {
    await openProfile(this, login, what);
    const row = this.page.locator(`${FORUMS} #bbp-user-body .bbp-row-actions a`).first();
    if (!(await row.count())) return;
    // Each removal is a link of its own: followed as a page, so the next round reads the list again.
    await navigate(this, await row.evaluate((a) => a.href));
  }
  throw friendly({ message: `Could not empty my ${what}: the list still has rows after 60 removals.`, hint: 'Look at the list in the profile.' });
});

// ---------------------------------------------------------------------------
// The forum profile
// ---------------------------------------------------------------------------

/**
 * Open the forum profile of an account, by a handle of the users registry or
 * its login name; "my forum profile" is the logged-in account's.
 *
 * Example #1: When I open the forum profile of "participant"
 * Example #2: And I open the forum profile of "moderator"
 * Example #3: When we open the forum profile of "keymaster"
 * Example #4: When I open my forum profile
 * Example #5: And we open my forum profile
 */
When(/^(I |we )*open (?:the forum profile of "([^"]*)"|my forum profile)$/, async function (pronounCase, who) {
  await openProfile(this, who ? loginOf(this, who) : await currentLogin(this));
});

/**
 * Open a page of the forum profile that is open, by the name its menu gives
 * it: Profile, Topics Started, Replies Created, Engagements, Favorites,
 * Subscriptions, Edit.
 *
 * Example #1: When I open "Topics Started" in the forum profile
 * Example #2: And I open "Replies Created" in the forum profile
 * Example #3: When we open "Favorites" in the forum profile
 * Example #4: When I open "Subscriptions" in the forum profile
 * Example #5: And I open "Edit" in the forum profile
 */
When(/^(I |we )*open "([^"]*)" in the forum profile$/, async function (pronounCase, name) {
  await settle(this);
  const links = await this.page.evaluate((sel) => [...document.querySelectorAll(`${sel} #bbp-user-navigation li a`)].map((a) => ({ text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.href })), FORUMS);
  const link = links.find((l) => same(l.text, name));
  if (!link) {
    throw friendly({
      message: links.length ? `The forum profile offers no page "${name}". It offers: ${listed(links.map((l) => l.text))}.` : `The page is not a forum profile (${this.page.url()}).`,
      hint: 'Open a profile first: When I open the forum profile of "…". Subscriptions and Edit are offered on the account\'s own profile only.',
    });
  }
  await navigate(this, link.href);
});

/**
 * Assert the forum profile that is open offers (or does not offer) a page
 * in its menu.
 *
 * Example #1: Then the forum profile should offer the page "Subscriptions"
 * Example #2: And the forum profile should not offer the page "Edit"
 * Example #3: Then the forum profile should offer the page "Favorites"
 * Example #4: Then the forum profile should not offer the page "Subscriptions"
 * Example #5: And the forum profile should offer the page "Topics Started"
 */
Then(/^the forum profile should( not)* offer the page "([^"]*)"$/, async function (notCase, name) {
  await settle(this);
  const page = await forumPage(this);
  if (page.kind !== 'profile') throw friendly({ message: `The page is not a forum profile: it is ${page.heading ? `"${page.heading}"` : 'no page of the forums'} (${page.url}).`, hint: 'Open one first: When I open the forum profile of "…".' });
  const links = await this.page.evaluate((sel) => [...document.querySelectorAll(`${sel} #bbp-user-navigation li a`)].map((a) => a.textContent.replace(/\s+/g, ' ').trim()), FORUMS);
  if (links.some((l) => same(l, name)) === Boolean(notCase)) {
    throw friendly({
      message: notCase ? `Expected the forum profile not to offer "${name}", but it does.` : `Expected the forum profile to offer "${name}". It offers: ${listed(links)}.`,
      hint: 'Subscriptions and Edit are offered on the account\'s own profile, and to an account that may edit users.',
    });
  }
});

/**
 * Assert the forum profile that is open shows (or does not show) a text: the
 * account's name, its counters ("Topics Started: 12"), its forum role
 * ("Forum Role: Moderator"), the rows of the list that is open.
 *
 * Example #1: Then the forum profile should show "Forum Role: Participant"
 * Example #2: And the forum profile should show "@participant"
 * Example #3: Then the forum profile should not show "Forum Role: Keymaster"
 * Example #4: Then the forum profile should show "Topics Started: 12"
 * Example #5: And the forum profile should show "Oh, bother! No topics were found here."
 */
Then(/^the forum profile should( not)* show "([^"]*)"$/, async function (notCase, text) {
  const read = async () => {
    const page = await forumPage(this);
    if (page.kind !== 'profile') return null;
    return this.page.evaluate((sel) => document.querySelector(`${sel} #bbp-user-body`).innerText.replace(/\s+/g, ' ').trim(), FORUMS);
  };
  if (notCase) {
    await settle(this);
    const body = await read();
    if (body === null) throw friendly({ message: `The page is not a forum profile (${this.page.url()}).`, hint: 'Open one first: When I open the forum profile of "…".' });
    if (holds(body, text)) throw friendly({ message: `Expected the forum profile not to show "${text}", but it does.`, hint: 'The text is matched as a part of the profile\'s body, letter case aside.' });
    return;
  }
  await eventually(this, read, (body) => body !== null && holds(body, text), (body) => ({
    message: body === null || body === undefined ? `The page is not a forum profile (${this.page.url()}).` : `Expected the forum profile to show "${text}". It shows: "${clean(body).slice(0, 300)}".`,
    hint: 'The text is matched as a part of the profile\'s body, letter case aside.',
  }), 3000);
});

/**
 * Assert the forum role of an account, as its forum profile states it:
 * Keymaster, Moderator, Participant, Spectator or Blocked.
 *
 * Example #1: Then the forum role of "moderator" should be "Moderator"
 * Example #2: And the forum role of "participant" should be "Participant"
 * Example #3: Then the forum role of "keymaster" should be "Keymaster"
 * Example #4: Then the forum role of "spectator" should be "Spectator"
 * Example #5: And the forum role of "admin" should be "Keymaster"
 */
Then(/^the forum role of "([^"]*)" should be "([^"]*)"$/, async function (who, role) {
  await openProfile(this, loginOf(this, who));
  const actual = await this.page.evaluate((sel) => {
    const line = [...document.querySelectorAll(`${sel} #bbp-user-body p.bbp-user-forum-role`)].map((p) => p.textContent.replace(/\s+/g, ' ').trim()).find((t) => /^Forum Role:/i.test(t));
    return line ? line.replace(/^Forum Role:\s*/i, '') : '';
  }, FORUMS);
  if (!same(actual, role)) {
    throw friendly({
      message: `Expected the forum role of "${who}" to be "${role}", but the profile says "${actual || '(none)'}".`,
      hint: 'The forum role is apart from the role on the site: an administrator is a Keymaster, a new account a Participant unless the forums\' settings say otherwise.',
    });
  }
});

/**
 * Save the edit form of the forum profile that is open ("Update Profile"),
 * and wait for the forums' answer: "User updated."
 *
 * Example #1: When I save my forum profile
 * Example #2: And I save my forum profile
 * Example #3: When we save my forum profile
 * Example #4: And we save my forum profile
 * Example #5: When I save my forum profile
 */
When(/^(I |we )*save my forum profile$/, async function (pronounCase) {
  const button = this.page.locator(`${FORUMS} form#bbp-your-profile #bbp_user_edit_submit`);
  if (!(await button.count())) {
    throw friendly({ message: `The page has no edit form of a forum profile (${this.page.url()}).`, hint: 'Open it first: When I open my forum profile, then When I open "Edit" in the forum profile.' });
  }
  await clickAndLoad(this, button, 'save the forum profile');
  const notices = await forumNotices(this);
  const errors = notices.filter((n) => n.kind === 'error').map((n) => n.text);
  if (errors.length) throw friendly({ message: `The forums refused the profile: ${listed(errors)}.`, hint: 'The email must be an address no other account has; a new password must be typed twice.' });
});
