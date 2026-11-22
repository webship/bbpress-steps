'use strict';

// Moderation, from the links the forums offer a moderator on a post: close
// and open a topic, stick it (in its forum, or on top of every forum),
// unapprove and approve, spam, trash, restore and delete a topic or a reply,
// merge a topic into another, split a topic at a reply, move a reply, and
// move a topic to another forum.
//
// Each link loads the page again, and the forums say what they did through
// the post itself: its status (a class of the post) and the link, which turns
// into its opposite (Close into Open, Trash into Restore and Delete). A step
// follows the link, waits for the page, and checks that turn.

const { When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  FORUMS,
  settle,
  navigate,
  supplied,
  clean,
  listed,
  same,
  clickAndLoad,
  forumPage,
  forumNotices,
  readingTopic,
  topicPosts,
  postOnPage,
  followPostLink,
} = require('./bbpress-helpers');

// What each action of a moderator is on the page: the link it follows (by the class the forums give it,
// for a topic and for a reply), the text that link must have, and the status the post has afterwards.
const ACTIONS = {
  close: { links: ['bbp-topic-close-link'], text: /^close$/i, status: 'closed' },
  open: { links: ['bbp-topic-close-link'], text: /^open$/i, status: 'publish' },
  stick: { links: ['bbp-topic-sticky-link'], text: /^stick$/i },
  unstick: { links: ['bbp-topic-sticky-link'], text: /^unstick$/i },
  unapprove: { links: ['bbp-topic-approve-link', 'bbp-reply-approve-link'], text: /^unapprove$/i, status: 'pending' },
  approve: { links: ['bbp-topic-approve-link', 'bbp-reply-approve-link'], text: /^approve$/i, status: 'publish' },
  spam: { links: ['bbp-topic-spam-link', 'bbp-reply-spam-link'], text: /^spam$/i, status: 'spam' },
  unspam: { links: ['bbp-topic-spam-link', 'bbp-reply-spam-link'], text: /^unspam$/i, status: 'publish' },
  trash: { links: ['bbp-topic-trash-link', 'bbp-reply-trash-link'], text: /^trash$/i, status: 'trash' },
  restore: { links: ['bbp-topic-restore-link', 'bbp-reply-restore-link'], text: /^restore$/i, status: 'publish' },
};

const STATUS_WORDS = { publish: 'open', closed: 'closed', pending: 'pending', spam: 'spam', trash: 'in the trash' };

/** Follow a moderation link of a post, and check the post took the status the action gives it. */
async function moderate(world, post, label, action) {
  const spec = ACTIONS[action];
  const link = post.links.find((l) => spec.links.includes(l.name));
  if (!link || !spec.text.test(link.text)) {
    throw friendly({
      message: `Could not ${action} ${label}: it offers no "${action[0].toUpperCase()}${action.slice(1)}" link. It offers: ${listed(post.links.map((l) => l.text))}.`,
      hint: `The post is ${STATUS_WORDS[post.status] || post.status}. The moderation links are offered to a moderator and a keymaster, and each turns into its opposite once followed.`,
    });
  }
  await followPostLink(world, post, [link.name], `${action} ${label}`);
  const after = (await topicPosts(world)).find((p) => p.id === post.id);
  if (!after) {
    throw friendly({ message: `After "${link.text}" the page no longer shows ${label} (${world.page.url()}).`, hint: 'The forums send a moderator back to the topic, with its hidden posts shown.' });
  }
  if (spec.status && after.status !== spec.status) {
    throw friendly({
      message: `Followed "${link.text}", but ${label} is ${STATUS_WORDS[after.status] || after.status}, not ${STATUS_WORDS[spec.status]}.`,
      hint: 'The forums refuse a link whose security token is too old: open the topic again.',
    });
  }
  if (!spec.status) {
    const turned = after.links.find((l) => spec.links.includes(l.name));
    if (!turned || spec.text.test(turned.text)) {
      throw friendly({ message: `Followed "${link.text}", but the topic still offers "${turned ? turned.text : 'no such link'}".`, hint: 'A sticky topic offers Unstick, any other Stick.' });
    }
  }
}

/** The lead post of the topic that is open (on its first page), or fail. */
async function leadPost(world) {
  await readingTopic(world);
  const lead = (await topicPosts(world)).find((p) => p.lead);
  if (!lead) {
    throw friendly({ message: 'The page does not show the topic\'s own post, which carries the topic\'s links.', hint: 'Go to the first page of the topic: When I go to page 1.' });
  }
  return lead;
}

/** Choose an option of a list of a moderation form by its text (the forums indent the forums of a list). */
async function chooseOption(world, select, wanted, what) {
  const options = await select.locator('option').evaluateAll((all) => all.map((o) => ({ value: o.value, text: o.textContent.replace(/ /g, ' ').replace(/\s+/g, ' ').trim(), disabled: o.disabled })));
  const match = options.find((o) => same(o.text, wanted) && !o.disabled);
  if (!match) {
    throw friendly({
      message: `The list has no ${what} "${wanted}". It has: ${listed(options.filter((o) => !o.disabled && o.value).map((o) => o.text))}.`,
      hint: 'Merge, split and move offer the topics of the same forum; the edit form offers the forums the account may post in (a category is not one).',
    });
  }
  await select.selectOption(match.value);
}

// ---------------------------------------------------------------------------
// A topic
// ---------------------------------------------------------------------------

/**
 * Follow a moderation link of the topic that is open: close or open it,
 * stick or unstick it, unapprove or approve it, mark it as spam or not, put
 * it in the trash or restore it. The step checks the topic took the state.
 *
 * Example #1: When I close the topic
 * Example #2: And I open the topic
 * Example #3: When I stick the topic
 * Example #4: When we unapprove the topic
 * Example #5: And I trash the topic
 * Example #6: When I restore the topic
 * Example #7: And we spam the topic
 * Example #8: When I unspam the topic
 * Example #9: And I approve the topic
 * Example #10: When we unstick the topic
 */
When(/^(I |we )*(close|open|stick|unstick|unapprove|approve|spam|unspam|trash|restore) the topic$/, async function (pronounCase, action) {
  await moderate(this, await leadPost(this), 'the topic', action);
});

/**
 * Stick the topic that is open to the front: on top of every forum (a super
 * sticky topic).
 *
 * Example #1: When I stick the topic to the front
 * Example #2: And I stick the topic to the front
 * Example #3: When we stick the topic to the front
 * Example #4: And we stick the topic to the front
 * Example #5: When I stick the topic to the front of every forum
 */
When(/^(I |we )*stick the topic to the front(?: of every forum)?$/, async function (pronounCase) {
  const lead = await leadPost(this);
  await followPostLink(this, lead, ['bbp-topic-super-sticky-link'], 'stick the topic to the front');
  const after = (await topicPosts(this)).find((p) => p.id === lead.id);
  const link = after && after.links.find((l) => l.name === 'bbp-topic-sticky-link');
  if (!link || !/^unstick$/i.test(link.text)) {
    throw friendly({ message: 'Followed "(to front)", but the topic does not offer Unstick.', hint: 'A topic that is sticky already offers Unstick only: unstick it first.' });
  }
});

/**
 * Delete the topic that is open for good, from the trash: the forums ask "are
 * you sure", the step says yes, and the topic and its replies are gone.
 *
 * Example #1: When I delete the topic permanently
 * Example #2: And I delete the topic permanently
 * Example #3: When we delete the topic permanently
 * Example #4: And we delete the topic permanently
 * Example #5: When I delete the topic permanently
 */
When(/^(I |we )*delete the topic permanently$/, async function (pronounCase) {
  let lead = await leadPost(this);
  if (lead.status !== 'trash') {
    await moderate(this, lead, 'the topic', 'trash');
    lead = await leadPost(this);
  }
  await followPostLink(this, lead, ['bbp-topic-delete-link'], 'delete the topic');
  const page = await forumPage(this);
  if (page.kind === 'topic' && (await topicPosts(this)).some((p) => p.id === lead.id)) {
    throw friendly({ message: 'Followed "Delete", but the topic is still there.', hint: 'Only a keymaster and a moderator may delete a topic; the forums ask for a confirmation the step gives.' });
  }
});

/**
 * Merge the topic that is open into another topic of the same forum: it
 * becomes a reply there, with its replies; the browser lands on that topic.
 *
 * Example #1: When I merge the topic into "Webship test topic"
 * Example #2: And I merge the topic into "A community garden in spring"
 * Example #3: When we merge the topic into "Welcome to the forums"
 * Example #4: When I merge the topic into "Webship test destination"
 * Example #5: And we merge the topic into "Forum rules"
 */
When(/^(I |we )*merge the topic into "([^"]*)"$/, async function (pronounCase, destination) {
  const lead = await leadPost(this);
  const link = lead.links.find((l) => l.name === 'bbp-topic-merge-link');
  if (!link) {
    throw friendly({ message: `The topic offers this account no Merge link. It offers: ${listed(lead.links.map((l) => l.text))}.`, hint: 'A moderator and a keymaster may merge topics.' });
  }
  await navigate(this, link.href);
  const form = this.page.locator(`${FORUMS} form#merge_topic`);
  if (!(await form.count())) throw friendly({ message: `The merge form did not open (${this.page.url()}).`, hint: 'The forums show it to a moderator and a keymaster.' });
  await chooseOption(this, form.locator('#bbp_destination_topic'), destination, 'topic');
  await clickAndLoad(this, form.locator('#bbp_merge_topic_submit'), 'merge the topic');
  await readingTopic(this, destination);
});

/**
 * Split the topic that is open at a post of the page: that reply and every
 * later one go to a new topic of the same forum with the title given; the
 * browser lands on the new topic.
 *
 * Example #1: When I split the topic from post 3 into "Webship test split"
 * Example #2: And I split the topic from post 2 into "Webship test: a new question"
 * Example #3: When we split the topic from post 4 into "Webship test split"
 * Example #4: When I split the topic from post 2 into "Webship test: off topic"
 * Example #5: And we split the topic from post 3 into "Webship test: the second half"
 */
When(/^(I |we )*split the topic from post (\d+) into "([^"]*)"$/, async function (pronounCase, number, title) {
  const { post, label } = await postOnPage(this, number);
  const link = post.links.find((l) => l.name === 'bbp-topic-split-link');
  if (!link) {
    throw friendly({
      message: `${label} offers no Split link. It offers: ${listed(post.links.map((l) => l.text))}.`,
      hint: 'A topic is split at a reply, by a moderator or a keymaster: the topic\'s own post (post 1 of the first page) has no Split link.',
    });
  }
  await navigate(this, link.href);
  const form = this.page.locator(`${FORUMS} form#split_topic`);
  if (!(await form.count())) throw friendly({ message: `The split form did not open (${this.page.url()}).`, hint: 'The forums show it to a moderator and a keymaster.' });
  await form.locator('#bbp_topic_split_option_reply').check();
  await form.locator('#bbp_topic_split_destination_title').fill(title);
  await clickAndLoad(this, form.locator('#bbp_merge_topic_submit'), 'split the topic');
  await readingTopic(this, title);
  this.forumTopics.push({ title, url: this.page.url().split('#')[0].split('?')[0] });
});

/**
 * Move the topic that is open to another forum, through its edit form.
 *
 * Example #1: When I move the topic to "Help and support"
 * Example #2: And I move the topic to "General discussion"
 * Example #3: When we move the topic to "Showcase"
 * Example #4: When I move the topic to "Staff room"
 * Example #5: And we move the topic to "Members lounge"
 */
When(/^(I |we )*move the topic to "([^"]*)"$/, async function (pronounCase, forum) {
  const lead = await leadPost(this);
  const link = lead.links.find((l) => l.name === 'bbp-topic-edit-link');
  if (!link) throw friendly({ message: `The topic offers this account no Edit link. It offers: ${listed(lead.links.map((l) => l.text))}.`, hint: 'A moderator and a keymaster may move a topic.' });
  await navigate(this, link.href);
  const select = this.page.locator(`${FORUMS} form#new-post #bbp_forum_id`);
  if (!(await select.count())) {
    throw friendly({ message: 'The edit form of the topic has no list of forums for this account.', hint: 'A moderator and a keymaster get it; a participant edits the title and the text only.' });
  }
  await chooseOption(this, select, forum, 'forum');
  await clickAndLoad(this, this.page.locator(`${FORUMS} form#new-post #bbp_topic_submit`), 'save the topic');
  const errors = (await forumNotices(this)).filter((n) => n.kind === 'error').map((n) => n.text);
  if (errors.length) throw friendly({ message: `The forums refused to move the topic: ${listed(errors)}.`, hint: 'A topic cannot go into a category or a forum the account may not post in.' });
  const crumbs = await this.page.evaluate((sel) => [...document.querySelectorAll(`${sel} .bbp-breadcrumb a`)].map((a) => a.textContent.trim()), FORUMS);
  if (!crumbs.some((c) => same(c, forum))) {
    throw friendly({ message: `The topic was saved, but its breadcrumbs do not name "${forum}": ${listed(crumbs)}.`, hint: 'The breadcrumbs of a topic name the forum it is in.' });
  }
});

// ---------------------------------------------------------------------------
// A reply
// ---------------------------------------------------------------------------

/**
 * Follow a moderation link of a post of the page, by its number or the last
 * one: unapprove or approve it, mark it as spam or not, put it in the trash
 * or restore it. The step checks the post took the state.
 *
 * Example #1: When I unapprove the last post
 * Example #2: And I approve the last post
 * Example #3: When I spam post 2
 * Example #4: When we unspam post 2
 * Example #5: And I trash the last post
 * Example #6: When I restore the last post
 */
When(/^(I |we )*(unapprove|approve|spam|unspam|trash|restore) (?:post (\d+)|the last post)$/, async function (pronounCase, action, number) {
  const { post, label } = await postOnPage(this, number);
  await moderate(this, post, label.toLowerCase(), action);
});

/**
 * Delete a post of the page for good, by its number or the last one: it goes
 * to the trash first when it is not there, then the forums ask "are you
 * sure" and the step says yes.
 *
 * Example #1: When I delete the last post permanently
 * Example #2: And I delete post 2 permanently
 * Example #3: When we delete the last post permanently
 * Example #4: When I delete post 3 permanently
 * Example #5: And we delete post 2 permanently
 */
When(/^(I |we )*delete (?:post (\d+)|the last post) permanently$/, async function (pronounCase, number) {
  let { post, label } = await postOnPage(this, number);
  if (post.lead) {
    throw friendly({ message: `${label} is the topic's own post.`, hint: 'Delete the topic instead: When I delete the topic permanently.' });
  }
  if (post.status !== 'trash') {
    await moderate(this, post, label.toLowerCase(), 'trash');
    post = (await topicPosts(this)).find((p) => p.id === post.id);
  }
  await followPostLink(this, post, ['bbp-reply-delete-link'], `delete ${label.toLowerCase()}`);
  if ((await topicPosts(this)).some((p) => p.id === post.id)) {
    throw friendly({ message: `Followed "Delete", but ${label.toLowerCase()} is still there.`, hint: 'Only a keymaster and a moderator may delete a reply.' });
  }
});

/**
 * Assert the state of a post of the page as a moderator reads it: published,
 * pending, spam, or in the trash.
 *
 * Example #1: Then the last post should be pending
 * Example #2: And the last post should be published
 * Example #3: Then post 2 should be spam
 * Example #4: Then the last post should be in the trash
 * Example #5: And post 2 should not be spam
 */
Then(/^(?:post (\d+)|the last post) should( not)* be (published|pending|spam|in the trash)$/, async function (number, notCase, state) {
  await settle(this);
  const { post, label } = await postOnPage(this, number);
  const wanted = { published: ['publish', 'closed'], pending: ['pending'], spam: ['spam'], 'in the trash': ['trash'] }[state];
  if (wanted.includes(post.status) === Boolean(notCase)) {
    throw friendly({
      message: notCase ? `Expected ${label.toLowerCase()} not to be ${state}, but it is.` : `Expected ${label.toLowerCase()} to be ${state}, but it is ${STATUS_WORDS[post.status] === 'open' ? 'published' : (STATUS_WORDS[post.status] || post.status)}.`,
      hint: 'A moderator sees the pending, spammed and trashed posts of a topic; another account does not see them at all.',
    });
  }
});

/**
 * Move a reply of the page out of its topic, by its number or the last one:
 * into a new topic of the same forum with the title given, or into another
 * topic of that forum. The browser lands on the topic the reply went to.
 *
 * Example #1: When I move the last post to a new topic "Webship test: moved reply"
 * Example #2: And I move post 2 to the topic "Webship test destination"
 * Example #3: When we move post 3 to a new topic "Webship test: a question of its own"
 * Example #4: When I move the last post to the topic "A community garden in spring"
 * Example #5: And we move post 2 to a new topic "Webship test: split off"
 */
When(/^(I |we )*move (?:post (\d+)|the last post) to (a new topic|the topic) "([^"]*)"$/, async function (pronounCase, number, where, title) {
  const { post, label } = await postOnPage(this, number);
  const link = post.links.find((l) => l.name === 'bbp-reply-move-link');
  if (!link) {
    throw friendly({
      message: `${label} offers no Move link. It offers: ${listed(post.links.map((l) => l.text))}.`,
      hint: 'A reply is moved by a moderator or a keymaster; the topic\'s own post moves with its topic (When I move the topic to "…").',
    });
  }
  await navigate(this, link.href);
  const form = this.page.locator(`${FORUMS} form#move_reply`);
  if (!(await form.count())) throw friendly({ message: `The move form did not open (${this.page.url()}).`, hint: 'The forums show it to a moderator and a keymaster.' });
  if (where === 'a new topic') {
    await form.locator('#bbp_reply_move_option_reply').check();
    await form.locator('#bbp_reply_move_destination_title').fill(title);
  } else {
    await form.locator('#bbp_reply_move_option_existing').check();
    await chooseOption(this, form.locator('#bbp_destination_topic'), title, 'topic');
  }
  await clickAndLoad(this, form.locator('#bbp_move_reply_submit'), 'move the reply');
  await readingTopic(this, title);
  if (where === 'a new topic') this.forumTopics.push({ title, url: this.page.url().split('#')[0].split('?')[0] });
});

/**
 * Show what the forums hide from the members on the page that is open: the
 * pending, spammed and trashed replies of a topic, or topics of a forum. A
 * moderator reads "(+1 hidden)" in the line that describes the page, and
 * follows it.
 *
 * Example #1: When I show the hidden posts
 * Example #2: And I show the hidden topics
 * Example #3: When we show the hidden posts
 * Example #4: When we show the hidden topics
 * Example #5: And I show the hidden posts
 */
When(/^(I |we )*show the hidden (posts|topics)$/, async function (pronounCase, what) {
  await settle(this);
  const box = what === 'posts' ? '.bbp-topic-description' : '.bbp-forum-description';
  const state = await this.page.evaluate(([sel, box]) => {
    const line = document.querySelector(`${sel} ${box}`);
    const link = line && line.querySelector('a[href*="view=all"]');
    return { line: line ? line.textContent.replace(/\s+/g, ' ').trim() : '', href: link ? link.href : '' };
  }, [FORUMS, box]);
  if (!state.href) {
    throw friendly({
      message: state.line ? `The page hides no ${what} from this account: it says "${state.line}".` : `The page is not a ${what === 'posts' ? 'topic' : 'forum'} (${this.page.url()}).`,
      hint: 'A moderator and a keymaster read "(+1 hidden)" on a topic with a pending, spammed or trashed reply, and on a forum with such a topic.',
    });
  }
  await navigate(this, state.href);
});

// ---------------------------------------------------------------------------
// What an account is offered
// ---------------------------------------------------------------------------

/**
 * Assert the topic that is open offers (or does not offer) the account the
 * moderator's tools: the links that close, stick, trash and merge it.
 *
 * Example #1: Then I should see the moderator tools
 * Example #2: And I should not see the moderator tools
 * Example #3: Then we should see the moderator tools
 * Example #4: Then we should not see the moderator tools
 * Example #5: But I should not see the moderator tools
 */
Then(/^(I |we )*should( not)* see the moderator tools$/, async function (pronounCase, notCase) {
  await settle(this);
  await readingTopic(this);
  const posts = await topicPosts(this);
  const tools = ['bbp-topic-close-link', 'bbp-topic-sticky-link', 'bbp-topic-trash-link', 'bbp-topic-merge-link', 'bbp-reply-trash-link', 'bbp-reply-move-link', 'bbp-topic-split-link'];
  const offered = [...new Set(posts.flatMap((p) => p.links.filter((l) => tools.includes(l.name)).map((l) => l.text)))];
  if (Boolean(offered.length) === Boolean(notCase)) {
    throw friendly({
      message: notCase
        ? `Expected no moderator tools on the topic, but it offers: ${listed(offered)}.`
        : `Expected the moderator tools on the topic. Its posts offer: ${listed([...new Set(posts.flatMap((p) => p.links.map((l) => l.text)))])} (${clean(this.page.url())}).`,
      hint: 'The tools are offered to a moderator and a keymaster of the forums.',
    });
  }
});

