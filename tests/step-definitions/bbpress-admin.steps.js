'use strict';

// The forums in the site's administration: the lists of forums, topics and
// replies (what they list, the state of a row, the actions of a row), the
// features of the forums' settings screen, the repair tools, and the forum
// role of an account on the users screen.
//
// The screens themselves open by name through the WordPress pack ("Forums",
// "Topics", "Replies", "Topic Tags", "Forums settings", "Forum tools"), and
// its steps read the notices, the menus and a setting by its label. The lists
// are the site's own list tables: a row is found by the title in its first
// column, its state is the class the site gives the row (`status-closed`),
// and an action is the link the row shows on hover, which loads the list
// again with a notice ("Topic "…" successfully closed.").

const { When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  resolveUser,
} = require('@webship-js/wordpress-steps/tests/step-definitions/wordpress-helpers');
const {
  settle,
  visitAdmin,
  clean,
  listed,
  same,
  holds,
  clickAndLoad,
} = require('./bbpress-helpers');

const LISTS = {
  forums: { type: 'forum', one: 'forum' },
  topics: { type: 'topic', one: 'topic' },
  replies: { type: 'reply', one: 'reply' },
};

/**
 * Open a list of the forums' administration, with a search for a title, in a view: "all" (what is published,
 * closed or pending), "spam" or "trash", as the links above the list name them. A reply
 * has no title of its own (the list titles it "Reply To: <topic>"), so the replies list is not searched: its
 * pages are read one after the other (listRows).
 */
async function openList(world, list, title, view) {
  const query = new URLSearchParams({ post_type: LISTS[list].type, post_status: view || 'all' });
  if (title && list !== 'replies') query.set('s', title);
  const status = await visitAdmin(world, `/wp-admin/edit.php?${query.toString()}`);
  if (/\/wp-login\.php/.test(world.page.url()) || status === 403) {
    throw friendly({
      message: `The ${list} list of the administration did not open for this account (${status || ''} ${world.page.url()}).`,
      hint: 'A keymaster manages forums, topics and replies in the administration, a moderator topics and replies; log in as one first.',
    });
  }
}

/** The rows of the list table on the screen: title, state, the actions the row offers. */
async function listRows(world) {
  return world.page.evaluate(() => {
    const out = [];
    for (const row of document.querySelectorAll('#the-list tr')) {
      if (row.classList.contains('no-items')) continue;
      const cell = row.querySelector('.column-title');
      if (!cell) continue;
      const strong = cell.querySelector('strong');
      const link = cell.querySelector('a.row-title');
      // In the trash the title is no link, and carries a hidden "(Child of <forum>)"; the state of a topic
      // ("— Closed") follows the title in a span.
      let title = link ? link.textContent : '';
      if (!title && strong) {
        const copy = strong.cloneNode(true);
        copy.querySelectorAll('.post-state, .screen-reader-text').forEach((n) => n.remove());
        title = copy.textContent.replace(/\s+—\s*$/, '');
      }
      out.push({
        id: row.id,
        title: title.replace(/\s+/g, ' ').trim().replace(/^(?:—\s*)+/, ''),
        status: ([...row.classList].find((c) => c.startsWith('status-')) || '').replace('status-', ''),
        sticky: [...cell.querySelectorAll('.row-actions span.stick a')].some((a) => /^unstick/i.test(a.textContent.trim())),
        actions: [...cell.querySelectorAll('.row-actions span')].map((s) => {
          // The first link of an action is the action; "Stick" carries a second one, "(to front)".
          const a = s.querySelector('a');
          return { name: s.className, text: a ? a.textContent.replace(/\s+/g, ' ').trim() : '', href: a ? a.href : '' };
        }).filter((a) => a.href),
      });
    }
    return out;
  }).catch(() => []);
}

/** The row of a title in the list on the screen, or fail with the titles that are there. */
async function listRow(world, list, title) {
  const rows = await listRows(world);
  const row = rows.find((r) => same(r.title, title));
  if (!row) {
    throw friendly({
      message: `The ${list} list has no ${LISTS[list].one} "${title}". It lists: ${listed(rows.map((r) => r.title))}.`,
      hint: 'The list is searched by the title; a reply is titled "Reply To: <topic>".',
    });
  }
  return row;
}

/** The notices the administration shows on the screen. */
async function adminNotices(world) {
  return world.page.evaluate(() => [...document.querySelectorAll('#wpbody-content .notice, #wpbody-content #message')]
    .filter((n) => n.getClientRects().length)
    .map((n) => {
      const copy = n.cloneNode(true);
      copy.querySelectorAll('button, .screen-reader-text').forEach((b) => b.remove());
      return { error: n.classList.contains('error') || n.classList.contains('notice-error'), text: copy.textContent.replace(/\s+/g, ' ').trim() };
    })
    .filter((n) => n.text)).catch(() => []);
}

// A closed topic carries its status on its row; a closed forum does not (a forum's status is apart from its
// visibility), so for both the row is closed when it offers "Open".
const offersOpen = (row) => row.actions.some((a) => /^open$/i.test(a.text));
const ROW_STATES = {
  open: (row) => row.status !== 'closed' && row.status !== 'trash' && row.status !== 'spam' && row.status !== 'pending' && !offersOpen(row),
  closed: (row) => row.status === 'closed' || offersOpen(row),
  sticky: (row) => row.sticky,
  pending: (row) => row.status === 'pending',
  spam: (row) => row.status === 'spam',
  'in the trash': (row) => row.status === 'trash',
};

// A row action by what a step calls it: the text its link has in the row.
const ROW_ACTIONS = {
  close: /^close$/i,
  open: /^open$/i,
  stick: /^stick$/i,
  unstick: /^unstick$/i,
  unapprove: /^unapprove$/i,
  approve: /^approve$/i,
  spam: /^spam$/i,
  unspam: /^(not spam|unspam)$/i,
  trash: /^trash$/i,
};

// ---------------------------------------------------------------------------
// The lists of the administration
// ---------------------------------------------------------------------------

/**
 * Assert the forums, topics or replies list of the administration has (or
 * has not) an item, by its title; the step opens the list, searched for the
 * title, with every item that is not in the trash.
 *
 * Example #1: Then the topics list should include "Welcome to the forums"
 * Example #2: And the forums list should include "General discussion"
 * Example #3: Then the topics list should not include "Webship test topic"
 * Example #4: Then the replies list should include "Reply To: Welcome to the forums"
 * Example #5: And the forums list should not include "Webship test forum"
 */
Then(/^the (forums|topics|replies) list should( not)* include "([^"]*)"$/, async function (list, notCase, title) {
  await openList(this, list, title, 'all');
  let rows = await listRows(this);
  // The replies list is not searched: its next pages are read until the title is found.
  for (let page = 1; list === 'replies' && page < 40 && !rows.some((r) => same(r.title, title)); page += 1) {
    const next = await this.page.evaluate(() => (document.querySelector('.tablenav.top a.next-page') || {}).href || '');
    if (!next) break;
    await visitAdmin(this, next);
    rows = rows.concat(await listRows(this));
  }
  if (rows.some((r) => same(r.title, title)) === Boolean(notCase)) {
    throw friendly({
      message: notCase ? `Expected the ${list} list not to include "${title}", but it does.` : `Expected the ${list} list to include "${title}". ${list === 'replies' ? 'It lists' : 'A search for it lists'}: ${listed([...new Set(rows.map((r) => r.title))])}.`,
      hint: 'The list holds what is published, closed or pending; the spam and the trash are views of their own.',
    });
  }
});

/**
 * Assert the state of a topic or a forum in its list of the administration:
 * open, closed, sticky (a topic), pending, spam, or in the trash.
 *
 * Example #1: Then the topic "The spring meetup is over" should be closed in the topics list
 * Example #2: And the topic "Welcome to the forums" should be sticky in the topics list
 * Example #3: Then the forum "Archive" should be closed in the forums list
 * Example #4: Then the topic "Webship test topic" should be in the trash in the topics list
 * Example #5: And the topic "A community garden in spring" should not be closed in the topics list
 */
Then(/^the (topic|forum) "([^"]*)" should( not)* be (open|closed|sticky|pending|spam|in the trash) in the (?:topics|forums) list$/, async function (what, title, notCase, state) {
  const list = what === 'topic' ? 'topics' : 'forums';
  // The view the state names first, then the others, to say where the item is when it is elsewhere.
  const first = { 'in the trash': 'trash', spam: 'spam' }[state] || 'all';
  let row;
  for (const view of [first, ...['all', 'spam', 'trash'].filter((v) => v !== first)]) {
    await openList(this, list, title, view);
    row = (await listRows(this)).find((r) => same(r.title, title));
    if (row) break;
  }
  if (!row) {
    throw friendly({ message: `The ${list} list has no ${what} "${title}", in the spam and the trash or out of them.`, hint: 'The list is searched by the title.' });
  }
  if (ROW_STATES[state](row) === Boolean(notCase)) {
    const found = `${row.sticky ? 'sticky, ' : ''}${ROW_STATES.closed(row) ? 'closed' : ({ publish: 'open', private: 'open', hidden: 'open', pending: 'pending', spam: 'spam', trash: 'in the trash' }[row.status] || row.status)}`;
    throw friendly({
      message: notCase ? `Expected the ${what} "${title}" not to be ${state}, but its row says it is.` : `Expected the ${what} "${title}" to be ${state}, but its row says: ${found}.`,
      hint: 'The row carries the status of the item; a sticky topic offers "Unstick" among its actions.',
    });
  }
});

/**
 * Follow an action of a row of the topics or forums list of the
 * administration: close or open, stick or unstick a topic, unapprove or
 * approve it, mark it as spam or not, move it to the trash. The step waits
 * for the list and its notice.
 *
 * Example #1: When I close the topic "Webship test topic" from the topics list
 * Example #2: And I open the topic "Webship test topic" from the topics list
 * Example #3: When I stick the topic "Webship test topic" from the topics list
 * Example #4: When we trash the topic "Webship test topic" from the topics list
 * Example #5: And I close the forum "Showcase" from the forums list
 * Example #6: When I open the forum "Showcase" from the forums list
 */
When(/^(I |we )*(close|open|stick|unstick|unapprove|approve|spam|unspam|trash) the (topic|forum) "([^"]*)" from the (?:topics|forums) list$/, async function (pronounCase, action, what, title) {
  const list = what === 'topic' ? 'topics' : 'forums';
  // A spammed topic is in a view of its own: that is where "unspam" finds it.
  await openList(this, list, title, action === 'unspam' ? 'spam' : 'all');
  const row = await listRow(this, list, title);
  const link = row.actions.find((a) => ROW_ACTIONS[action].test(a.text));
  if (!link) {
    throw friendly({
      message: `The row of the ${what} "${title}" offers no "${action}" action. It offers: ${listed(row.actions.map((a) => a.text))}.`,
      hint: 'A row offers the opposite of its state: Open for a closed item, Unstick for a sticky topic, Approve for a pending one. A forum is closed and opened only.',
    });
  }
  await visitAdmin(this, link.href);
  const errors = (await adminNotices(this)).filter((n) => n.error);
  if (errors.length) {
    throw friendly({ message: `The administration refused to ${action} the ${what} "${title}": ${listed(errors.map((n) => n.text))}.`, hint: 'The account may not have the right to do this.' });
  }
});

/**
 * Restore a topic from the trash of the topics list, or delete it there for
 * good.
 *
 * Example #1: When I restore the topic "Webship test topic" from the topics trash
 * Example #2: And I delete the topic "Webship test topic" from the topics trash
 * Example #3: When we restore the topic "Webship test question" from the topics trash
 * Example #4: When we delete the topic "Webship test question" from the topics trash
 * Example #5: And I restore the topic "Webship test announcement" from the topics trash
 */
When(/^(I |we )*(restore|delete) the topic "([^"]*)" from the topics trash$/, async function (pronounCase, action, title) {
  await openList(this, 'topics', title, 'trash');
  const rows = await listRows(this);
  const row = rows.find((r) => same(r.title, title));
  if (!row) {
    throw friendly({ message: `The trash of the topics list has no topic "${title}". It holds: ${listed(rows.map((r) => r.title))}.`, hint: 'Move the topic to the trash first.' });
  }
  const link = row.actions.find((a) => a.name.split(' ').includes(action === 'restore' ? 'untrash' : 'delete'));
  if (!link) {
    throw friendly({ message: `The row of "${title}" in the trash offers no "${action}" action. It offers: ${listed(row.actions.map((a) => a.text))}.`, hint: 'A moderator and a keymaster may restore and delete topics.' });
  }
  await visitAdmin(this, link.href);
});

// ---------------------------------------------------------------------------
// Settings, tools, users
// ---------------------------------------------------------------------------

/** The checkbox of a feature of the forums' settings screen, by the name of its row. */
async function featureBox(world, name) {
  const found = await world.page.evaluate((wanted) => {
    const norm = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
    const rows = [...document.querySelectorAll('#wpbody-content form .form-table tr')]
      .map((tr) => ({ name: tr.querySelector('th') ? tr.querySelector('th').textContent.replace(/\s+/g, ' ').trim() : '', box: tr.querySelector('td input[type="checkbox"]') }))
      .filter((r) => r.name && r.box);
    const row = rows.find((r) => norm(r.name) === norm(wanted));
    return { id: row ? row.box.id : '', names: rows.map((r) => r.name) };
  }, name).catch(() => ({ id: '', names: [] }));
  if (!found.id) {
    throw friendly({
      message: found.names.length ? `The forums' settings have no feature "${name}". They have: ${listed(found.names)}.` : `The screen is not the forums' settings (${world.page.url()}).`,
      hint: 'Open the screen first: Given I am on the "Forums settings" admin screen. A feature is named as its row is: Favorites, Subscriptions, Topic tags, Search, Revisions, Anonymous, …',
    });
  }
  return world.page.locator(`#${found.id}`);
}

/**
 * Turn a feature of the forums on or off on their settings screen, by the
 * name of its row (Favorites, Subscriptions, Topic tags, Search, Revisions,
 * Reply Threading, Anonymous, Flooding, Editing, …), without saving. Follow
 * it with "I save the settings".
 *
 * Example #1: When I turn the forum feature "Favorites" off
 * Example #2: And I turn the forum feature "Favorites" on
 * Example #3: When we turn the forum feature "Subscriptions" off
 * Example #4: When I turn the forum feature "Search" off
 * Example #5: And we turn the forum feature "Topic tags" on
 */
When(/^(I |we )*turn the forum feature "([^"]*)" (on|off)$/, async function (pronounCase, name, state) {
  const box = await featureBox(this, name);
  await box.setChecked(state === 'on');
});

/**
 * Assert a feature of the forums is on (or off) on their settings screen, by
 * the name of its row.
 *
 * Example #1: Then the forum feature "Favorites" should be on
 * Example #2: And the forum feature "Anonymous" should be off
 * Example #3: Then the forum feature "Subscriptions" should be on
 * Example #4: Then the forum feature "Search" should be on
 * Example #5: And the forum feature "Reply Threading" should be off
 */
Then(/^the forum feature "([^"]*)" should be (on|off)$/, async function (name, state) {
  const box = await featureBox(this, name);
  const on = await box.isChecked();
  if (on !== (state === 'on')) {
    throw friendly({ message: `Expected the forum feature "${name}" to be ${state}, but it is ${on ? 'on' : 'off'}.`, hint: 'The step reads the checkbox of the feature\'s row on the forums\' settings screen, as it was last saved or changed.' });
  }
});

/**
 * Run a repair tool of the forums by its name on the tools screen, and wait
 * for its answer ("… Complete!").
 *
 * Example #1: When I run the forum repair tool "Recount topics in each forum"
 * Example #2: And I run the forum repair tool "Recount replies in each topic"
 * Example #3: When we run the forum repair tool "Recalculate last activity in each topic and forum"
 * Example #4: When I run the forum repair tool "Recount topics for each user"
 * Example #5: And we run the forum repair tool "Recalculate private and hidden forums"
 */
When(/^(I |we )*run the forum repair tool "([^"]*)"$/, async function (pronounCase, name) {
  await visitAdmin(this, '/wp-admin/tools.php?page=bbp-repair');
  const tools = await this.page.evaluate(() => [...document.querySelectorAll('#wpbody-content .wp-list-table tbody tr')].map((tr) => ({
    name: tr.querySelector('td strong') ? tr.querySelector('td strong').textContent.replace(/\s+/g, ' ').trim() : '',
    href: (tr.querySelector('.row-actions .run a') || {}).href || '',
  })).filter((t) => t.name)).catch(() => []);
  const tool = tools.find((t) => same(t.name, name));
  if (!tool || !tool.href) {
    throw friendly({
      message: tools.length ? `The forums have no repair tool "${name}". They have: ${listed(tools.map((t) => t.name))}.` : `The repair tools did not open for this account (${this.page.url()}).`,
      hint: 'The tools are for a keymaster, under Tools > Forums.',
    });
  }
  await visitAdmin(this, tool.href);
  const notices = await adminNotices(this);
  if (!notices.some((n) => !n.error && /complete/i.test(n.text))) {
    throw friendly({ message: `The repair tool "${name}" did not answer "Complete!". The screen says: ${listed(notices.map((n) => n.text))}.`, hint: 'A tool answers with a notice that names what it did and ends with "Complete!".' });
  }
});

/** The row of an account on the users screen, by its login name. */
function userRow(world, login) {
  return world.page.locator('#the-list tr').filter({ has: world.page.locator('.column-username strong a', { hasText: new RegExp(`^${login.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) }).first();
}

/**
 * Assert the forum role the users screen of the administration shows for an
 * account (a handle of the users registry, or a login name), in its "Forum
 * Role" column.
 *
 * Example #1: Then the users screen should show the forum role "Moderator" for "moderator"
 * Example #2: And the users screen should show the forum role "Keymaster" for "admin"
 * Example #3: Then the users screen should show the forum role "Blocked" for "blocked"
 * Example #4: Then the users screen should show the forum role "Spectator" for "spectator"
 * Example #5: And the users screen should show the forum role "Participant" for "participant"
 */
Then(/^the users screen should show the forum role "([^"]*)" for "([^"]*)"$/, async function (role, who) {
  const users = (this.parameters && this.parameters.users) || {};
  const login = users[who] ? resolveUser(this, who).username : who;
  await visitAdmin(this, `/wp-admin/users.php?s=${encodeURIComponent(login)}`);
  const row = userRow(this, login);
  if (!(await row.count())) {
    throw friendly({ message: `The users screen lists no account "${login}" (${this.page.url()}).`, hint: 'The users screen is for an administrator of the site: Given I am a logged in user with the "admin" user.' });
  }
  const cell = row.locator('td.column-bbp_user_role');
  const actual = (await cell.count()) ? clean(await cell.textContent()) : '';
  if (!same(actual, role)) {
    throw friendly({ message: `Expected the forum role "${role}" for "${login}", but the users screen shows "${actual || '(no Forum Role column)'}".`, hint: 'The column comes with the forums plugin; the roles are Keymaster, Moderator, Participant, Spectator and Blocked.' });
  }
});

/**
 * Change the forum role of an account on the users screen of the
 * administration, with "Change forum role to…". Put it back in the same
 * scenario: accounts are configuration.
 *
 * Example #1: When I change the forum role of "spectator" to "Participant"
 * Example #2: And I change the forum role of "spectator" to "Spectator"
 * Example #3: When we change the forum role of "participant" to "Moderator"
 * Example #4: When I change the forum role of "participant" to "Participant"
 * Example #5: And we change the forum role of "blocked" to "Blocked"
 */
When(/^(I |we )*change the forum role of "([^"]*)" to "([^"]*)"$/, async function (pronounCase, who, role) {
  const users = (this.parameters && this.parameters.users) || {};
  const login = users[who] ? resolveUser(this, who).username : who;
  await visitAdmin(this, `/wp-admin/users.php?s=${encodeURIComponent(login)}`);
  const row = userRow(this, login);
  if (!(await row.count())) {
    throw friendly({ message: `The users screen lists no account "${login}" (${this.page.url()}).`, hint: 'The users screen is for an administrator of the site: Given I am a logged in user with the "admin" user.' });
  }
  const select = this.page.locator('#bbp-new-role');
  if (!(await select.count())) {
    throw friendly({ message: 'The users screen has no "Change forum role to…" list.', hint: 'It comes with the forums plugin, for an account that may promote users.' });
  }
  const options = await select.locator('option').evaluateAll((all) => all.map((o) => ({ value: o.value, text: o.textContent.trim() })));
  const option = options.find((o) => o.value && same(o.text, role));
  if (!option) throw friendly({ message: `There is no forum role "${role}". The roles: ${listed(options.filter((o) => o.value).map((o) => o.text))}.`, hint: 'Use the role as the list shows it.' });
  await row.locator('input[name="users[]"]').check();
  await select.selectOption(option.value);
  await clickAndLoad(this, this.page.locator('#bbp-change-role'), 'change the forum role', true);
  const after = userRow(this, login).locator('td.column-bbp_user_role');
  const actual = (await after.count()) ? clean(await after.textContent()) : '';
  if (!same(actual, role)) {
    throw friendly({ message: `Changed the forum role of "${login}" to "${role}", but the users screen shows "${actual}".`, hint: 'An account cannot change its own forum role here, and only a keymaster makes another keymaster.' });
  }
});

