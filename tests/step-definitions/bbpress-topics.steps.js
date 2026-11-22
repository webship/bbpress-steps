'use strict';

// A topic and its posts: opening one, its posts by their number on the page
// (who wrote them, the author's forum role, what they say and how it is
// formatted, their edit log), its marks and tags; and the forms: a new topic,
// a reply, an edit, with the editor's toolbar, the tags, the topic's type and
// status, and the errors the forums answer with.
//
// The forms are plain forms: submitting one loads a page. A step that
// submits waits for that page, then for the forums' answer on it: the new
// topic's own page, the reply under its address (`#post-<id>`), or the error
// notice above the form.

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
  holds,
  eventually,
  clickAndLoad,
  forumPage,
  forumNotices,
  listTotal,
  openForum,
  openTopic,
  readingTopic,
  topicPosts,
  postOnPage,
  followPostLink,
} = require('./bbpress-helpers');

/** The form of the forums on the page (a new topic, a reply, an edit), or fail. */
async function postForm(world) {
  const form = world.page.locator(`${FORUMS} form#new-post`).first();
  if (!(await form.count())) {
    const notices = (await forumNotices(world)).filter((n) => n.kind !== 'info').map((n) => n.text);
    throw friendly({
      message: `The page has no topic or reply form${notices.length ? `: the forums say ${listed(notices)}` : ''} (${world.page.url()}).`,
      hint: 'Open a forum to start a topic, a topic to reply, or edit a post first. A visitor, a spectator, a closed topic and a closed forum get no form.',
    });
  }
  return form;
}

/** The text area of the form on the page: the topic's or the reply's. */
async function editorArea(world) {
  const form = await postForm(world);
  return form.locator('textarea#bbp_topic_content, textarea#bbp_reply_content').first();
}

/** The errors the forums print above a form they refused. */
async function formErrors(world) {
  return (await forumNotices(world)).filter((n) => n.kind === 'error').map((n) => n.text);
}

// ---------------------------------------------------------------------------
// Reading a topic
// ---------------------------------------------------------------------------

/**
 * Open a topic by its title: in a forum (through the pages of its list), or
 * without one from the list on the page, a topic a Given step of the scenario
 * made, or the forum search.
 *
 * Example #1: When I open the topic "Welcome to the forums" in "General discussion"
 * Example #2: And I open the topic "A long conversation" in "Help and support"
 * Example #3: When we open the topic "Forum rules"
 * Example #4: When I open the topic "Showcase entry 01" in "Showcase"
 * Example #5: And I open the topic "The forums opened" in "Archive"
 */
When(/^(I |we )*open the topic "([^"]*)"(?: in "([^"]*)")?$/, async function (pronounCase, title, forum) {
  await openTopic(this, title, forum);
});

/**
 * Assert the page is a topic, by its title.
 *
 * Example #1: Then I should be reading the topic "Welcome to the forums"
 * Example #2: And I should be reading the topic "Forum rules"
 * Example #3: Then we should be reading the topic "A long conversation"
 * Example #4: Then I should be reading the topic "Showcase entry 01"
 * Example #5: And we should be reading the topic "The forums opened"
 */
Then(/^(I |we )*should be reading the topic "([^"]*)"$/, async function (pronounCase, title) {
  await settle(this);
  await readingTopic(this, title);
});

/**
 * Assert how many posts the topic has over all its pages: its own post and
 * its replies ("Viewing 15 posts - 1 through 15 (of 18 total)").
 *
 * Example #1: Then the topic should have 3 posts
 * Example #2: And the topic should have 18 posts
 * Example #3: Then the topic should have 1 post
 * Example #4: Then the topic should have 2 posts
 * Example #5: And the topic should have 4 posts
 */
Then(/^the topic should have (\d+) posts?$/, async function (count) {
  await settle(this);
  await readingTopic(this);
  const total = await listTotal(this);
  const actual = total && total.total !== null ? total.total : (await topicPosts(this)).length;
  if (actual !== Number(count)) {
    throw friendly({
      message: `Expected the topic to have ${count} post(s), but it has ${actual}${total ? ` ("${clean(total.text)}")` : ''}.`,
      hint: 'The topic\'s own post counts as the first. A moderator also counts the pending, spammed and trashed replies.',
    });
  }
});

/**
 * Assert who wrote a post of the page, by its number on the page (1 is the
 * topic's own post on the first page) or the last one.
 *
 * Example #1: Then post 1 should be by "keymaster"
 * Example #2: And post 2 should be by "participant"
 * Example #3: Then the last post should be by "moderator"
 * Example #4: Then post 3 should be by "moderator"
 * Example #5: And the last post should be by "participant"
 */
Then(/^(?:post (\d+)|the last post) should be by "([^"]*)"$/, async function (number, author) {
  await settle(this);
  const { post, label } = await postOnPage(this, number);
  if (!same(post.author, author)) {
    throw friendly({ message: `${label} is by "${post.author}", not by "${author}".`, hint: 'A post names the display name of its author.' });
  }
});

/**
 * Assert the forum role the forums print under the author of a post
 * (Keymaster, Moderator, Participant, Spectator, Blocked).
 *
 * Example #1: Then the author of post 1 should be a "Keymaster"
 * Example #2: And the author of post 2 should be a "Participant"
 * Example #3: Then the author of the last post should be a "Moderator"
 * Example #4: Then the author of post 3 should be a "Moderator"
 * Example #5: And the author of the last post should be a "Participant"
 */
Then(/^the author of (?:post (\d+)|the last post) should be a "([^"]*)"$/, async function (number, role) {
  await settle(this);
  const { post, label } = await postOnPage(this, number);
  if (!same(post.role, role)) {
    throw friendly({ message: `${label} is by "${post.author}", whose forum role reads "${post.role}", not "${role}".`, hint: 'The forum roles are Keymaster, Moderator, Participant, Spectator and Blocked.' });
  }
});

/**
 * Assert what a post says: its text holds the given text (the edit log under
 * it aside).
 *
 * Example #1: Then post 1 should read "Say hello and tell us what you are working on."
 * Example #2: And post 2 should read "Hello everyone"
 * Example #3: Then the last post should read "Welcome aboard."
 * Example #4: Then the last post should read "Webship test reply"
 * Example #5: And post 3 should read "Ask in Help and support"
 */
Then(/^(?:post (\d+)|the last post) should read "([^"]*)"$/, async function (number, text) {
  await eventually(this, async () => (await postOnPage(this, number)), (found) => holds(found.post.text, text), (found) => ({
    message: found ? `${found.label} does not read "${text}". It reads: "${clean(found.post.text).slice(0, 300)}".` : `The topic shows no such post (${this.page.url()}).`,
    hint: 'The text is matched as a part of the post, letter case aside.',
  }), 3000);
});

/**
 * Assert a post shows a text with a format: in bold, in italics, as a quote,
 * as code, as a link, or struck through.
 *
 * Example #1: Then the last post should show "bold words" in bold
 * Example #2: And the last post should show "a quoted line" as a quote
 * Example #3: Then post 2 should show "important" in italics
 * Example #4: Then the last post should show "wp-config.php" as code
 * Example #5: And the last post should show "the documentation" as a link
 */
Then(/^(?:post (\d+)|the last post) should show "([^"]*)" (in bold|in italics|as a quote|as code|as a link|struck through)$/, async function (number, text, format) {
  await settle(this);
  const { post, label } = await postOnPage(this, number);
  const tags = { 'in bold': 'strong, b', 'in italics': 'em, i', 'as a quote': 'blockquote', 'as code': 'code, pre', 'as a link': 'a', 'struck through': 'del, s' }[format];
  const found = await this.page.evaluate(([html, selector]) => {
    const box = document.createElement('div');
    box.innerHTML = html;
    return [...box.querySelectorAll(selector)].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
  }, [post.html, tags]);
  if (!found.some((f) => holds(f, text))) {
    throw friendly({
      message: `${label} does not show "${text}" ${format}. ${found.length ? `It shows ${format}: ${listed(found)}` : `It shows nothing ${format}`}; the post reads: "${clean(post.text).slice(0, 200)}".`,
      hint: 'The forums keep the formatting their editor\'s toolbar writes (b, i, b-quote, del, code, link) and drop what the account may not post.',
    });
  }
});

/**
 * Assert the edit log under a post holds a text: who changed it and the
 * reason given ("This topic was modified … by moderator. Reason: Clearer title").
 *
 * Example #1: Then the edit log of post 1 should show "Reason: Clearer title"
 * Example #2: And the edit log of the last post should show "This reply was modified"
 * Example #3: Then the edit log of post 1 should show "by moderator"
 * Example #4: Then the edit log of the last post should show "Reason: Typo"
 * Example #5: And the edit log of post 2 should show "by participant"
 */
Then(/^the edit log of (?:post (\d+)|the last post) should show "([^"]*)"$/, async function (number, text) {
  await settle(this);
  const { post, label } = await postOnPage(this, number);
  if (!post.log.some((line) => holds(line, text))) {
    throw friendly({
      message: `The edit log of ${label.toLowerCase()} does not show "${text}". ${post.log.length ? `It shows: ${listed(post.log)}` : 'The post has no edit log'}.`,
      hint: 'A post gets a line in its log when it is edited with "Keep a log of this edit" checked, which the forums\' "Revisions" setting allows.',
    });
  }
});

/**
 * Assert a mark of the topic that is open: open or closed, sticky, pending,
 * spam, in the trash.
 *
 * Example #1: Then the topic should be closed
 * Example #2: And the topic should be open
 * Example #3: Then the topic should be sticky
 * Example #4: Then the topic should not be sticky
 * Example #5: And the topic should be pending
 */
Then(/^the topic should( not)* be (open|closed|sticky|pending|spam|in the trash)$/, async function (notCase, mark) {
  await settle(this);
  await readingTopic(this);
  const posts = await topicPosts(this);
  const lead = posts.find((p) => p.lead);
  let is;
  let found;
  if (mark === 'sticky') {
    // The topic's own page says it through the link it offers a moderator, its body through a class of the lists.
    const state = await this.page.evaluate((sel) => {
      const link = document.querySelector(`${sel} .bbp-admin-links a.bbp-topic-sticky-link`);
      return link ? link.textContent.trim() : null;
    }, FORUMS);
    if (state === null) {
      throw friendly({ message: 'The topic\'s page does not say whether it is sticky for this account.', hint: 'A moderator reads it from the topic\'s links (Stick or Unstick); any account from the forum\'s list: Then the topic "…" should be sticky in the list.' });
    }
    is = /unstick/i.test(state);
    found = is ? 'sticky' : 'not sticky';
  } else {
    if (!lead) {
      throw friendly({ message: 'The page does not show the topic\'s own post, which carries its status.', hint: 'Go to the first page of the topic: When I go to page 1.' });
    }
    const status = { open: 'publish', closed: 'closed', pending: 'pending', spam: 'spam', 'in the trash': 'trash' }[mark];
    is = lead.status === status;
    found = { publish: 'open', closed: 'closed', pending: 'pending', spam: 'spam', trash: 'in the trash' }[lead.status] || lead.status;
  }
  if (is === Boolean(notCase)) {
    throw friendly({
      message: notCase ? `Expected the topic not to be ${mark}, but it is.` : `Expected the topic to be ${mark}, but it is ${found}.`,
      hint: 'A topic is open, closed (no new replies), pending (waits for a moderator), spam or in the trash; sticky comes on top of that.',
    });
  }
});

/**
 * Assert the topic carries (or does not carry) a tag, in the "Tagged:" line
 * above its posts.
 *
 * Example #1: Then the topic should be tagged "welcome"
 * Example #2: And the topic should be tagged "spring"
 * Example #3: Then the topic should not be tagged "howto"
 * Example #4: Then the topic should be tagged "garden"
 * Example #5: And the topic should not be tagged "rules"
 */
Then(/^the topic should( not)* be tagged "([^"]*)"$/, async function (notCase, tag) {
  await settle(this);
  await readingTopic(this);
  const tags = await this.page.evaluate((sel) => [...document.querySelectorAll(`${sel} .bbp-topic-tags a`)].map((a) => a.textContent.trim()), FORUMS);
  if (tags.some((t) => same(t, tag)) === Boolean(notCase)) {
    throw friendly({
      message: notCase ? `Expected the topic not to be tagged "${tag}", but it is.` : `Expected the topic to be tagged "${tag}". Its tags: ${listed(tags)}.`,
      hint: 'A spammed topic loses its tags until it is marked as not spam.',
    });
  }
});

// ---------------------------------------------------------------------------
// The forms: a new topic, a reply, an edit
// ---------------------------------------------------------------------------

/**
 * Open a forum and its form for a new topic.
 *
 * Example #1: When I start a new topic in "General discussion"
 * Example #2: And I start a new topic in "Help and support"
 * Example #3: When we start a new topic in "Showcase"
 * Example #4: When I start a new topic in "Members lounge"
 * Example #5: And we start a new topic in "Staff room"
 */
When(/^(I |we )*start a new topic in "([^"]*)"$/, async function (pronounCase, forum) {
  await openForum(this, forum);
  const title = this.page.locator(`${FORUMS} form#new-post #bbp_topic_title`);
  if (!(await title.count())) {
    const notices = (await forumNotices(this)).filter((n) => n.kind !== 'info').map((n) => n.text);
    throw friendly({
      message: `The forum "${forum}" offers this account no form for a new topic${notices.length ? `: the forums say ${listed(notices)}` : ''}.`,
      hint: 'A participant may start a topic in an open forum; a visitor, a spectator, a category and a closed forum get a notice instead.',
    });
  }
});

/**
 * Write the title of the topic in the form (a new topic, or the edit of one).
 *
 * Example #1: When I write the topic title "Webship test topic"
 * Example #2: And I write the topic title "Webship test topic, renamed"
 * Example #3: When we write the topic title "Webship test question"
 * Example #4: When I write the topic title ""
 * Example #5: And we write the topic title "Webship test announcement"
 */
When(/^(I |we )*write the topic title "([^"]*)"$/, async function (pronounCase, title) {
  const form = await postForm(this);
  const field = form.locator('#bbp_topic_title');
  if (!(await field.count())) {
    throw friendly({ message: 'The form on the page has no topic title: it is the form of a reply.', hint: 'Start a topic first (When I start a new topic in "…"), or edit the topic\'s own post (When I edit post 1).' });
  }
  await field.fill(title);
});

/**
 * Write a text in the editor of the form (it replaces what the editor
 * holds), or add one to what is there.
 *
 * Example #1: When I write "Webship test: the first post of the topic." in the editor
 * Example #2: And I add " A second sentence." to the editor
 * Example #3: When we write "Webship test reply." in the editor
 * Example #4: When I write "" in the editor
 * Example #5: And I write "A reply with <strong>bold</strong> words." in the editor
 */
When(/^(I |we )*(write|add) "([^"]*)" (?:in|to) the editor$/, async function (pronounCase, how, text) {
  const area = await editorArea(this);
  if (how === 'add') {
    await area.evaluate((el, more) => { el.value += more; el.dispatchEvent(new Event('input', { bubbles: true })); }, text);
  } else {
    await area.fill(text);
  }
});

/**
 * Add a text to the editor through a button of its toolbar: the button opens
 * the format, the text is typed, the button closes it again. The buttons that
 * wrap a text: "b", "i", "b-quote", "del", "code".
 *
 * Example #1: When I add "bold words" to the editor with the "b" button
 * Example #2: And I add "a quoted line" to the editor with the "b-quote" button
 * Example #3: When we add "important" to the editor with the "i" button
 * Example #4: When I add "wp-config.php" to the editor with the "code" button
 * Example #5: And I add "no longer true" to the editor with the "del" button
 */
When(/^(I |we )*add "([^"]*)" to the editor with the "([^"]*)" button$/, async function (pronounCase, text, name) {
  const wrapping = ['b', 'i', 'b-quote', 'del', 'code'];
  if (!wrapping.includes(name)) {
    throw friendly({ message: `"${name}" is not a button of the toolbar that wraps a text.`, hint: `The buttons that do: ${wrapping.join(', ')}. The link and image buttons ask for an address; write their HTML in the editor instead.` });
  }
  const area = await editorArea(this);
  const toolbar = this.page.locator(`${FORUMS} form#new-post .quicktags-toolbar`);
  const button = toolbar.locator(`input[type="button"][value="${name}"]`).first();
  try {
    await button.waitFor({ state: 'visible', timeout: 10000 });
  } catch (err) {
    const buttons = await toolbar.locator('input[type="button"]').evaluateAll((all) => all.map((b) => b.value)).catch(() => []);
    throw friendly({ message: `The editor's toolbar has no "${name}" button. It has: ${listed(buttons)}.`, hint: 'The toolbar comes with the forums\' "Post Formatting" setting.' });
  }
  // The caret goes to the end of the text: the toolbar writes where the caret is.
  await area.evaluate((el) => { el.focus(); el.setSelectionRange(el.value.length, el.value.length); });
  await button.click();
  await this.page.keyboard.type(text);
  await toolbar.locator(`input[type="button"][value="/${name}"]`).first().click();
});

/**
 * Assert what the editor of the form holds: the text of a post that is being
 * edited, or what was written.
 *
 * Example #1: Then the editor should contain "Webship test: the first post of the topic."
 * Example #2: And the editor should contain "<strong>bold words</strong>"
 * Example #3: Then the editor should contain "Webship test reply."
 * Example #4: Then the editor should contain "Say hello"
 * Example #5: And the editor should contain "<blockquote>a quoted line</blockquote>"
 */
Then(/^the editor should contain "([^"]*)"$/, async function (text) {
  const area = await editorArea(this);
  const value = await area.inputValue();
  if (!clean(value).includes(clean(text))) {
    throw friendly({ message: `The editor does not contain "${text}". It holds: "${clean(value).slice(0, 300)}".`, hint: 'The editor holds the HTML of the post, as the toolbar writes it.' });
  }
});

/**
 * Give the topic its tags in the form, separated by commas (it replaces the
 * tags the field holds).
 *
 * Example #1: When I tag the topic with "webship, test"
 * Example #2: And I tag the topic with "howto"
 * Example #3: When we tag the topic with "spring, garden"
 * Example #4: When I tag the topic with ""
 * Example #5: And we tag the topic with "account"
 */
When(/^(I |we )*tag the topic with "([^"]*)"$/, async function (pronounCase, tags) {
  const form = await postForm(this);
  const field = form.locator('#bbp_topic_tags');
  if (!(await field.count())) {
    throw friendly({ message: 'The form has no field for the topic\'s tags.', hint: 'The forums\' "Topic tags" setting allows them; a participant may tag a topic it starts or replies to.' });
  }
  await field.fill(tags);
});

/**
 * Choose the type (Normal, Sticky, Super Sticky) or the status (Open,
 * Closed, Spam, Trash, Pending) of the topic in the form, as a moderator.
 *
 * Example #1: When I choose the topic type "Sticky"
 * Example #2: And I choose the topic status "Closed"
 * Example #3: When we choose the topic type "Super Sticky"
 * Example #4: When I choose the topic type "Normal"
 * Example #5: And I choose the topic status "Open"
 */
When(/^(I |we )*choose the topic (type|status) "([^"]*)"$/, async function (pronounCase, what, option) {
  const form = await postForm(this);
  const select = form.locator(what === 'type' ? '#bbp_stick_topic_select' : '#bbp_topic_status_select');
  if (!(await select.count())) {
    throw friendly({ message: `The form has no list for the topic's ${what}.`, hint: 'A moderator and a keymaster get it on the form of a topic; a participant does not.' });
  }
  const options = await select.locator('option').evaluateAll((all) => all.map((o) => o.textContent.trim()));
  const match = options.find((o) => same(o, option));
  if (!match) throw friendly({ message: `The topic's ${what} has no option "${option}". It has: ${listed(options)}.`, hint: 'Use the option as the list shows it.' });
  await select.selectOption({ label: match });
});

/**
 * Give the reason of an edit, in the edit form of a topic or a reply; the
 * forums print it in the post's edit log.
 *
 * Example #1: When I give the edit reason "Clearer title"
 * Example #2: And I give the edit reason "Typo"
 * Example #3: When we give the edit reason "Moved to the right forum"
 * Example #4: When I give the edit reason ""
 * Example #5: And we give the edit reason "Added a link"
 */
When(/^(I |we )*give the edit reason "([^"]*)"$/, async function (pronounCase, reason) {
  const form = await postForm(this);
  const field = form.locator('#bbp_topic_edit_reason, #bbp_reply_edit_reason').first();
  if (!(await field.count())) {
    throw friendly({ message: 'The form has no field for the reason of an edit.', hint: 'Edit a post first (When I edit post 1); the forums\' "Revisions" setting allows the log.' });
  }
  await field.fill(reason);
});

/**
 * Submit the form of the forums: the new topic, the reply or the edit. The
 * step waits for the page the forums answer with, and fails with their
 * errors when they refuse the form; with "try to" it leaves the outcome to
 * the next step.
 *
 * Example #1: When I submit the post
 * Example #2: And I try to submit the post
 * Example #3: When we submit the post
 * Example #4: When we try to submit the post
 * Example #5: And I submit the post
 */
When(/^(I |we )*(try to )?submit the post$/, async function (pronounCase, trying) {
  const form = await postForm(this);
  const title = form.locator('#bbp_topic_title');
  const written = (await title.count()) ? await title.inputValue() : '';
  await clickAndLoad(this, form.locator('#bbp_topic_submit, #bbp_reply_submit').first(), 'submit the post');
  if (trying) return;
  const errors = await formErrors(this);
  if (errors.length) {
    throw friendly({
      message: `The forums refused the post: ${listed(errors)}.`,
      hint: 'A topic needs a title and a text, a reply a text; the forums refuse the same post twice and a post sent right after another when their flood protection is on.',
    });
  }
  const page = await forumPage(this);
  if (page.kind === 'topic' && written) this.forumTopics.push({ title: page.heading, url: this.page.url().split('#')[0].split('?')[0] });
});

/**
 * Assert the forums refused the form with an error, by a part of its text.
 *
 * Example #1: Then the editor should show the error "Your topic needs a title."
 * Example #2: And the editor should show the error "Your topic cannot be empty."
 * Example #3: Then the editor should show the error "Your reply cannot be empty."
 * Example #4: Then the editor should show the error "Duplicate reply detected"
 * Example #5: And the editor should show the error "Duplicate topic detected"
 */
Then(/^the editor should show the error "([^"]*)"$/, async function (text) {
  await eventually(this, () => formErrors(this), (errors) => errors.some((e) => holds(e, text)), (errors) => ({
    message: `Expected the error "${text}". ${(errors || []).length ? `The forums say: ${listed(errors)}` : 'The forums show no error'} (${this.page.url()}).`,
    hint: 'The errors are the red notice above the form the forums refused.',
  }), 3000);
});

/**
 * Reply to the topic that is open: write the text in its reply form and
 * submit it; the step waits for the reply on the page.
 *
 * Example #1: When I reply to the topic with "Webship test reply."
 * Example #2: And I reply to the topic with "Webship test: a second reply."
 * Example #3: When we reply to the topic with "Thank you, that worked."
 * Example #4: When I reply to the topic with "Webship test reply of the moderator."
 * Example #5: And we reply to the topic with "Webship test: see the forum rules."
 */
When(/^(I |we )*reply to the topic with "([^"]*)"$/, async function (pronounCase, text) {
  await readingTopic(this);
  const area = this.page.locator(`${FORUMS} form#new-post #bbp_reply_content`);
  if (!(await area.count())) {
    const notices = (await forumNotices(this)).filter((n) => n.kind !== 'info').map((n) => n.text);
    throw friendly({
      message: `The topic offers this account no reply form${notices.length ? `: the forums say ${listed(notices)}` : ''}.`,
      hint: 'A participant may reply to an open topic; a visitor and a spectator may not, and a closed topic takes replies from moderators only.',
    });
  }
  await area.fill(text);
  await clickAndLoad(this, this.page.locator(`${FORUMS} form#new-post #bbp_reply_submit`), 'submit the reply');
  const errors = await formErrors(this);
  if (errors.length) {
    throw friendly({ message: `The forums refused the reply: ${listed(errors)}.`, hint: 'The forums refuse an empty reply, the same reply twice, and a reply sent right after another when their flood protection is on.' });
  }
  if (!/#post-\d+/.test(this.page.url())) {
    throw friendly({ message: `The forums did not answer with the reply: the browser is at ${this.page.url()}.`, hint: 'A reply that was taken lands on the topic at the reply (…/#post-<number>).' });
  }
});

/**
 * Open the edit form of a post of the page, by its number or the last one.
 *
 * Example #1: When I edit post 1
 * Example #2: And I edit the last post
 * Example #3: When we edit post 2
 * Example #4: When I edit post 3
 * Example #5: And we edit the last post
 */
When(/^(I |we )*edit (?:post (\d+)|the last post)$/, async function (pronounCase, number) {
  const { post, label } = await postOnPage(this, number);
  const link = post.links.find((l) => l.name === 'bbp-topic-edit-link' || l.name === 'bbp-reply-edit-link');
  if (!link) {
    throw friendly({
      message: `${label} offers this account no Edit link. It offers: ${listed(post.links.map((l) => l.text))}.`,
      hint: 'An account may edit its own posts (for the time the forums\' "Editing" setting gives), a moderator every post.',
    });
  }
  await navigate(this, link.href);
  await postForm(this);
});

/**
 * Assert the forums offer (or do not offer) a link on a post, by its text:
 * Edit, Reply, Merge, Close, Stick, Trash, Spam, Unapprove, Move, Split.
 *
 * Example #1: Then post 1 should offer the link "Edit"
 * Example #2: And post 2 should not offer the link "Trash"
 * Example #3: Then the last post should offer the link "Split"
 * Example #4: Then post 1 should not offer the link "Merge"
 * Example #5: And the last post should offer the link "Reply"
 */
Then(/^(?:post (\d+)|the last post) should( not)* offer the link "([^"]*)"$/, async function (number, notCase, text) {
  await settle(this);
  const { post, label } = await postOnPage(this, number);
  if (post.links.some((l) => same(l.text, text)) === Boolean(notCase)) {
    throw friendly({
      message: notCase
        ? `Expected ${label.toLowerCase()} not to offer "${text}", but it does.`
        : `Expected ${label.toLowerCase()} to offer "${text}". It offers: ${listed(post.links.map((l) => l.text))}.`,
      hint: 'The links of a post depend on the forum role: a participant gets Edit on its own posts and Reply, a moderator every moderation link.',
    });
  }
});

