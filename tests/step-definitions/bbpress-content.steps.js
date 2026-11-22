'use strict';

// Test content a scenario starts from, and its removal: a topic posted by
// the account that owns it, a reply by another account, and no topic of a
// title (whatever an earlier run left: open, closed, pending, spam or in the
// trash).
//
// The content is made the way a person makes it, in the browser: the account
// that owns it logs in (once in a run; later steps take its session over),
// posts through the forums' own forms, and the scenario's session comes back.
// Removal is the work of the account `worldParameters.forums.moderator` names,
// in the topics list of the administration: to the trash, then deleted for
// good, with the replies the topic has. No step here creates or deletes an
// account.

const { Given } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  FORUMS,
  visitAdmin,
  listed,
  same,
  clickAndLoad,
  contentModerator,
  forumNotices,
  openForum,
  openTopic,
  readingTopic,
  asAccount,
} = require('./bbpress-helpers');

/** The rows of the topics list of the administration whose title is the one given, with their trash and delete links. */
async function topicRows(world, title, view) {
  const query = new URLSearchParams({ post_type: 'topic', post_status: view, s: title });
  const status = await visitAdmin(world, `/wp-admin/edit.php?${query.toString()}`);
  if (/\/wp-login\.php/.test(world.page.url()) || status === 403) {
    throw friendly({
      message: `The account "${contentModerator(world)}" may not open the topics list of the administration (${status || ''} ${world.page.url()}).`,
      hint: 'worldParameters.forums.moderator in cucumber.js names the account that removes test content: a moderator or a keymaster of the forums.',
    });
  }
  return world.page.evaluate((wanted) => {
    const norm = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
    const out = [];
    for (const row of document.querySelectorAll('#the-list tr')) {
      const cell = row.querySelector('.column-title');
      if (!cell) continue;
      const link = cell.querySelector('a.row-title');
      let title = link ? link.textContent : '';
      if (!title && cell.querySelector('strong')) {
        const copy = cell.querySelector('strong').cloneNode(true);
        copy.querySelectorAll('.post-state, .screen-reader-text').forEach((n) => n.remove());
        title = copy.textContent.replace(/\s+—\s*$/, '');
      }
      if (norm(title) !== norm(wanted)) continue;
      const href = (name) => (cell.querySelector(`.row-actions span.${name} a`) || {}).href || '';
      out.push({ trash: href('trash'), remove: href('delete') });
    }
    return out;
  }, title);
}

/**
 * Remove every topic of a title: out of the list and out of the spam (a view of its own) into the trash, then
 * out of the trash for good.
 */
async function removeTopics(world, title) {
  for (const view of ['all', 'spam']) {
    for (let round = 0; round < 20; round += 1) {
      const rows = await topicRows(world, title, view);
      if (!rows.length) break;
      if (!rows[0].trash) throw friendly({ message: `The topics list offers "${contentModerator(world)}" no Trash link for the topic "${title}".`, hint: 'The account that removes test content must be a moderator or a keymaster of the forums.' });
      await visitAdmin(world, rows[0].trash);
    }
  }
  for (let round = 0; round < 20; round += 1) {
    const rows = await topicRows(world, title, 'trash');
    if (!rows.length) return;
    if (!rows[0].remove) throw friendly({ message: `The trash of the topics list offers "${contentModerator(world)}" no "Delete Permanently" link for the topic "${title}".`, hint: 'The account that removes test content must be a moderator or a keymaster of the forums.' });
    await visitAdmin(world, rows[0].remove);
  }
  throw friendly({ message: `Could not remove every topic "${title}": the trash still lists it after 20 removals.`, hint: 'Look at the topics list of the administration.' });
}

/** Post a topic through the forum's own form, as the account that is logged in. */
async function postTopic(world, title, forum, text) {
  await openForum(world, forum);
  const form = world.page.locator(`${FORUMS} form#new-post`);
  if (!(await form.locator('#bbp_topic_title').count())) {
    const notices = (await forumNotices(world)).filter((n) => n.kind !== 'info').map((n) => n.text);
    throw friendly({
      message: `The forum "${forum}" offers the account no form for a new topic${notices.length ? `: the forums say ${listed(notices)}` : ''}.`,
      hint: 'The account that owns the topic must be allowed to post in that forum.',
    });
  }
  await form.locator('#bbp_topic_title').fill(title);
  await form.locator('#bbp_topic_content').fill(text);
  await clickAndLoad(world, form.locator('#bbp_topic_submit'), 'post the topic');
  const errors = (await forumNotices(world)).filter((n) => n.kind === 'error').map((n) => n.text);
  if (errors.length) throw friendly({ message: `The forums refused the topic "${title}": ${listed(errors)}.`, hint: 'The forums refuse a post sent right after another when their flood protection is on: the test site turns it off.' });
  await readingTopic(world, title);
  return world.page.url().split('#')[0].split('?')[0];
}

/**
 * Make sure the forums have no topic of a title, whatever state it is in:
 * each goes to the trash and is deleted for good, with its replies. The
 * account `worldParameters.forums.moderator` names does it in the
 * administration; the scenario's own session stays.
 *
 * Example #1: Given there is no topic "Webship test topic"
 * Example #2: And there is no topic "Webship test question"
 * Example #3: Given there is no topic "Webship test split"
 * Example #4: Then there is no topic "Webship test topic"
 * Example #5: And there is no topic "Webship test: moved reply"
 */
Given(/^there is no topic "([^"]*)"$/, async function (title) {
  await asAccount(this, contentModerator(this), () => removeTopics(this, title));
  this.forumTopics = this.forumTopics.filter((t) => !same(t.title, title));
});

/**
 * Make sure a forum has one topic of a title, posted by an account (a handle
 * of the users registry) through the forum's own form: a topic an earlier
 * run left under that title is removed first. The doc string is the text of
 * the topic; without one it gets a line that says it is test content.
 *
 * Example #1: Given there is a topic "Webship test topic" in "General discussion" by "participant"
 * Example #2: And there is a topic "Webship test question" in "Help and support" by "participant"
 * Example #3: Given there is a topic "Webship test announcement" in "General discussion" by "moderator"
 * Example #4: Given there is a topic "Webship test destination" in "General discussion" by "moderator"
 * Example #5: And there is a topic "Webship test members topic" in "Members lounge" by "participant"
 */
Given(/^there is a topic "([^"]*)" in "([^"]*)" by "([^"]*)"$/, async function (title, forum, author) {
  await asAccount(this, contentModerator(this), () => removeTopics(this, title));
  const url = await asAccount(this, author, () => postTopic(this, title, forum, `Webship test: the first post of "${title}".`));
  this.forumTopics = this.forumTopics.filter((t) => !same(t.title, title)).concat([{ title, url }]);
});

/**
 * The same, with the text of the topic given as a doc string.
 *
 * Example #1: Given there is a topic "Webship test topic" in "General discussion" by "participant" with:
 * Example #2: And there is a topic "Webship test question" in "Help and support" by "participant" with:
 * Example #3: Given there is a topic "Webship test announcement" in "General discussion" by "moderator" with:
 * Example #4: Given there is a topic "Webship test destination" in "General discussion" by "moderator" with:
 * Example #5: And there is a topic "Webship test members topic" in "Members lounge" by "participant" with:
 */
Given(/^there is a topic "([^"]*)" in "([^"]*)" by "([^"]*)" with:$/, async function (title, forum, author, text) {
  await asAccount(this, contentModerator(this), () => removeTopics(this, title));
  const url = await asAccount(this, author, () => postTopic(this, title, forum, String(text)));
  this.forumTopics = this.forumTopics.filter((t) => !same(t.title, title)).concat([{ title, url }]);
});

/**
 * Have an account (a handle of the users registry) reply to a topic through
 * its own reply form: a topic a Given step of the scenario made, or any
 * topic the account finds by its title.
 *
 * Example #1: Given "moderator" replied to the topic "Webship test topic" with "Webship test reply of the moderator."
 * Example #2: And "participant" replied to the topic "Webship test topic" with "Webship test: thank you."
 * Example #3: Given "keymaster" replied to the topic "Webship test question" with "Webship test: see the forum rules."
 * Example #4: Given "moderator" replied to the topic "Webship test question" with "Webship test: open your profile."
 * Example #5: And "participant" replied to the topic "Webship test announcement" with "Webship test: noted."
 */
Given(/^"([^"]*)" replied to the topic "([^"]*)" with "([^"]*)"$/, async function (author, title, text) {
  await asAccount(this, author, async () => {
    await openTopic(this, title);
    const area = this.page.locator(`${FORUMS} form#new-post #bbp_reply_content`);
    if (!(await area.count())) {
      const notices = (await forumNotices(this)).filter((n) => n.kind !== 'info').map((n) => n.text);
      throw friendly({ message: `The topic "${title}" offers "${author}" no reply form${notices.length ? `: the forums say ${listed(notices)}` : ''}.`, hint: 'The account must be allowed to reply: a participant in an open topic, a moderator in any.' });
    }
    await area.fill(text);
    await clickAndLoad(this, this.page.locator(`${FORUMS} form#new-post #bbp_reply_submit`), 'post the reply');
    const errors = (await forumNotices(this)).filter((n) => n.kind === 'error').map((n) => n.text);
    if (errors.length) throw friendly({ message: `The forums refused the reply of "${author}": ${listed(errors)}.`, hint: 'The forums refuse the same reply twice in a topic.' });
  });
});
