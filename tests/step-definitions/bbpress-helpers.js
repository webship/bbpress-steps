'use strict';

// Shared helpers for the forums' step files.
//
// Not a step file: it registers no step definitions and no hooks. It holds the
// plumbing the step files share, on top of the WordPress pack's helpers (the
// page budget, navigation, the users registry, the login): the forums' root,
// what a page of the forums lists (forums, topics, posts, notices), the way to
// a forum and a topic, the links of a post, the session of another account for
// the test content, and the mail catcher of the test site.
//
// Everything the forums print sits in `#bbpress-forums`, whatever the theme:
// the lists are `ul` rows with an id (`bbp-forum-12`, `bbp-topic-34`), a post
// is a header (`#post-56`) followed by its body (`.post-56`), and the state of
// each is a class the forums set themselves (`status-closed`, `sticky`,
// `bbp-forum-visibility-private`).

const { friendly, gotoUrl } = require('webship-js/tests/step-definitions/webship');
const {
  budget,
  settle,
  siteRoot,
  joinUrl,
  navigate,
  resolveUser,
  loginAs,
  isLoggedIn,
  supplied,
} = require('@webship-js/wordpress-steps/tests/step-definitions/wordpress-helpers');

/** Where the forums print everything. */
const FORUMS = '#bbpress-forums';

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

/** White space collapsed, typographic dashes and quotes made plain, trimmed. */
function clean(text) {
  return String(text === null || text === undefined ? '' : text)
    .replace(/[‒-―−]/g, '-')
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A list for a failure message: "a", "b" and "c", or (none). */
function listed(items) {
  const all = (items || []).map((i) => `"${clean(i)}"`);
  if (!all.length) return '(none)';
  return all.length > 12 ? `${all.slice(0, 12).join(', ')} and ${all.length - 12} more` : all.join(', ');
}

/** The same text for a person: letter case, white space, dashes and quotes aside. */
function same(a, b) {
  return clean(a).toLowerCase() === clean(b).toLowerCase();
}

/** Whether a text holds another, letter case, white space, dashes and quotes aside. */
function holds(text, part) {
  return clean(text).toLowerCase().includes(clean(part).toLowerCase());
}

/** The names of a step argument such as `"A", "B" and "C"`. */
function quotedList(text) {
  return (String(text).match(/"[^"]*"/g) || []).map((q) => q.slice(1, -1));
}

// ---------------------------------------------------------------------------
// Waiting
// ---------------------------------------------------------------------------

/**
 * Read something of the page again and again until `ok` holds for it, or the
 * wait budget (twice the page budget) is spent; then fail with the message
 * `fail` builds from the last reading.
 */
async function eventually(world, read, ok, fail, timeout) {
  const deadline = Date.now() + (timeout || budget(world) * 2);
  let value;
  for (;;) {
    try {
      value = await read();
    } catch (err) {
      value = undefined;
      if (Date.now() > deadline) throw err;
    }
    if (value !== undefined && ok(value)) return value;
    if (Date.now() > deadline) break;
    await world.page.waitForTimeout(200);
  }
  throw friendly(fail(value));
}

/**
 * Click a link or a button that loads a page (a form of the forums, a
 * moderation link) and wait for that page.
 */
async function clickAndLoad(world, locator, what, quiet) {
  try {
    await Promise.all([
      world.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      locator.click(),
    ]);
  } catch (err) {
    throw friendly({
      message: `Could not ${what}: the forums did not answer with a page.`,
      cause: err,
      hint: `The browser is at ${world.page.url()}.`,
    });
  }
  // A screen of the administration keeps timers running (its heartbeat): its page is whole when it arrives.
  if (!quiet) await settle(world);
}

// ---------------------------------------------------------------------------
// The forums' root and the page that is open
// ---------------------------------------------------------------------------

/** The address the forums start at: `worldParameters.forums.root`, "/forums/" as the plugin sets it. */
function forumsRoot(world) {
  const own = (world.parameters && world.parameters.forums && world.parameters.forums.root) || '/forums/';
  return '/' + String(own).replace(/^\/+|\/+$/g, '') + '/';
}

/** The handle of the account that prepares and removes test content: `worldParameters.forums.moderator`. */
function contentModerator(world) {
  return (world.parameters && world.parameters.forums && world.parameters.forums.moderator) || 'moderator';
}

/**
 * Open an address of the site and say what the site answered: the status of
 * the page the browser ended on (after its redirects), 0 when none was read.
 */
async function visit(world, url) {
  let status = 0;
  const onResponse = (response) => {
    const request = response.request();
    if (request.isNavigationRequest() && request.frame() === world.page.mainFrame()) status = response.status();
  };
  world.page.on('response', onResponse);
  try {
    await navigate(world, url);
  } finally {
    world.page.off('response', onResponse);
  }
  return status;
}

/**
 * Open a screen of the site's administration and say what the site answered.
 * The screens the steps read (the lists, the tools, the users) are rendered
 * on the server: they are whole when the document arrives, so the step does
 * not wait for the page to go quiet, which a screen of the administration
 * never does (its heartbeat keeps a timer running).
 */
async function visitAdmin(world, url) {
  let status = 0;
  const onResponse = (response) => {
    const request = response.request();
    if (request.isNavigationRequest() && request.frame() === world.page.mainFrame()) status = response.status();
  };
  world.page.on('response', onResponse);
  try {
    await gotoUrl(world.page, joinUrl(world.launchUrl, url));
    await world.page.waitForSelector('body', { state: 'attached', timeout: 30000 });
    await world.page.waitForLoadState('domcontentloaded');
  } finally {
    world.page.off('response', onResponse);
  }
  return status;
}

/** Open the forum index. */
async function gotoForumIndex(world) {
  await navigate(world, forumsRoot(world));
}

/**
 * What kind of page of the forums the browser shows, and its heading: the
 * index, a forum, a topic, a profile, the search, a tag, a view, the edit form
 * of a post, a moderation form (merge, split, move), or none of them.
 */
async function forumPage(world) {
  return world.page.evaluate((sel) => {
    const box = document.querySelector(sel);
    const body = document.body.classList;
    const heading = [...document.querySelectorAll('h1')].find((h) => h.getClientRects().length && !h.closest('#wp-link-wrap, #wpadminbar'));
    let kind = 'none';
    if (box) {
      if (box.querySelector('#merge_topic, #split_topic, #move_reply')) kind = 'form';
      else if (body.contains('topic-edit') || body.contains('reply-edit')) kind = 'edit';
      else if (body.contains('bbp-user-page') || box.querySelector('#bbp-user-wrapper')) kind = 'profile';
      else if (body.contains('bbp-search') || box.querySelector('#bbp-search-results, .bbp-breadcrumb-search')) kind = 'search';
      else if (body.contains('topic-tag') || body.contains('bbp-topic-tag')) kind = 'tag';
      else if (body.contains('bbp-view')) kind = 'view';
      else if (body.contains('single-topic') || body.contains('topic-edit') || box.querySelector('ul.bbp-replies')) kind = 'topic';
      else if (body.contains('single-forum')) kind = 'forum';
      else if (body.contains('forum-archive')) kind = 'index';
      else kind = 'other';
    }
    return { kind, heading: heading ? heading.textContent.replace(/\s+/g, ' ').trim() : '', url: location.href };
  }, FORUMS).catch(() => ({ kind: 'none', heading: '', url: world.page.url() }));
}

/** The notices the forums show on the page: `{ kind, text }` per line; kind is "info", "error" or "". */
async function forumNotices(world) {
  return world.page.evaluate((sel) => {
    const out = [];
    for (const notice of document.querySelectorAll(`${sel} .bbp-template-notice`)) {
      if (!notice.getClientRects().length) continue;
      const kind = notice.classList.contains('error') ? 'error' : (notice.classList.contains('info') ? 'info' : '');
      const lines = notice.querySelectorAll('li');
      for (const line of (lines.length ? lines : [notice])) {
        const text = line.textContent.replace(/\s+/g, ' ').trim();
        if (text) out.push({ kind, text });
      }
    }
    return out;
  }, FORUMS).catch(() => []);
}

/** The total a list of the forums counts ("Viewing 4 topics - 1 through 4 (of 4 total)"), or null without one. */
async function listTotal(world) {
  return world.page.evaluate((sel) => {
    const count = document.querySelector(`${sel} .bbp-pagination-count`);
    if (!count) return null;
    const m = count.textContent.match(/\(of\s+([\d,.]+)\s+total\)/i);
    return { text: count.textContent.replace(/\s+/g, ' ').trim(), total: m ? Number(m[1].replace(/[,.]/g, '')) : null };
  }, FORUMS).catch(() => null);
}

// ---------------------------------------------------------------------------
// Forums
// ---------------------------------------------------------------------------

/**
 * The forums the page lists (the index, a category, a forum with subforums,
 * the subscribed forums of a profile), as a person reads them: the name
 * (without the "Private: " the site puts before a private forum), the
 * counters, whether it is a category, closed, private or hidden, and the
 * subforums listed under it.
 */
async function listedForums(world) {
  return world.page.evaluate((sel) => {
    const bare = (text) => text.replace(/\s+/g, ' ').trim().replace(/^(?:(?:Private|Hidden|Protected):\s+)+/i, '');
    const number = (el) => (el ? Number(el.textContent.replace(/[^\d]/g, '')) : null);
    const out = [];
    for (const row of document.querySelectorAll(`${sel} ul[id^="bbp-forum-"]`)) {
      if (!row.closest('li.bbp-body')) continue;
      const title = row.querySelector('a.bbp-forum-title');
      if (!title) continue;
      const visibility = ([...row.classList].find((c) => c.startsWith('bbp-forum-visibility-')) || '').replace('bbp-forum-visibility-', '');
      out.push({
        id: row.id.replace('bbp-forum-', ''),
        name: bare(title.textContent),
        href: title.href,
        topics: number(row.querySelector('.bbp-forum-topic-count')),
        posts: number(row.querySelector('.bbp-forum-reply-count')),
        category: row.classList.contains('status-category'),
        closed: row.classList.contains('bbp-forum-status-closed'),
        private: visibility === 'private',
        hidden: visibility === 'hidden',
        subscribed: Boolean(row.querySelector('.is-subscribed')),
        remove: (row.querySelector('.bbp-row-actions a') || {}).href || '',
        subforums: [...row.querySelectorAll('.bbp-forums-list a.bbp-forum-link')].map((a) => ({
          name: bare(a.textContent.replace(/\s*\([\d,\s]+\)\s*$/, '')),
          href: a.href,
        })),
      });
    }
    return out;
  }, FORUMS).catch(() => []);
}

/** Every forum name the page shows: the rows and the subforums under them. */
function forumNames(forums) {
  const names = [];
  for (const forum of forums || []) {
    names.push(forum.name);
    for (const sub of forum.subforums) names.push(sub.name);
  }
  return names;
}

/** The address of a forum the page lists, by its name: a row or a subforum under one. */
function forumAddress(forums, name) {
  for (const forum of forums || []) {
    if (same(forum.name, name)) return forum.href;
    const sub = forum.subforums.find((s) => same(s.name, name));
    if (sub) return sub.href;
  }
  return '';
}

/**
 * Open a forum by its name, as a person does: from the page that is open when
 * it lists the forum, else from the forum index (its forums and the subforums
 * under them), else through the category that holds it.
 */
async function openForum(world, name) {
  let href = forumAddress(await listedForums(world), name);
  let seen = [];
  if (!href) {
    await gotoForumIndex(world);
    const index = await listedForums(world);
    seen = forumNames(index);
    href = forumAddress(index, name);
    // A forum deeper than the index shows: look in each forum that has subforums.
    for (const parent of (href ? [] : index.filter((f) => f.subforums.length))) {
      await navigate(world, parent.href);
      const inside = await listedForums(world);
      seen = seen.concat(forumNames(inside));
      href = forumAddress(inside, name);
      if (href) break;
    }
  }
  if (!href) {
    throw friendly({
      message: `The forums list no forum "${name}". They list: ${listed([...new Set(seen)])}.`,
      hint: 'A forum is found by the name the forum index shows. A private forum is listed for a logged-in participant, a hidden one for a moderator; a blocked account gets no forum at all.',
    });
  }
  await navigate(world, href);
  const page = await forumPage(world);
  if (!same(page.heading.replace(/^(?:(?:Private|Hidden|Protected):\s+)+/i, ''), name)) {
    throw friendly({
      message: `The forum "${name}" did not open: the page is "${page.heading}" (${page.url}).`,
      hint: 'The account may not be allowed to read this forum.',
    });
  }
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

/**
 * The topics the page lists (a forum, a tag, a view, the lists of a profile),
 * as a person reads them: title, author, voices, posts, whether the topic is
 * sticky, its status, its tags, the forum it is in where the list names it.
 */
async function listedTopics(world) {
  return world.page.evaluate((sel) => {
    const number = (el) => (el ? Number(el.textContent.replace(/[^\d]/g, '')) : null);
    const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const out = [];
    for (const row of document.querySelectorAll(`${sel} ul[id^="bbp-topic-"]`)) {
      if (!row.closest('li.bbp-body')) continue;
      const title = row.querySelector('a.bbp-topic-permalink');
      if (!title) continue;
      out.push({
        id: row.id.replace('bbp-topic-', ''),
        title: text(title),
        href: title.href,
        author: text(row.querySelector('.bbp-topic-started-by .bbp-author-name')),
        forum: text(row.querySelector('.bbp-topic-started-in a')),
        voices: number(row.querySelector('.bbp-topic-voice-count')),
        posts: number(row.querySelector('.bbp-topic-reply-count')),
        sticky: row.classList.contains('sticky') || row.classList.contains('super-sticky'),
        superSticky: row.classList.contains('super-sticky'),
        status: ([...row.classList].find((c) => c.startsWith('status-')) || '').replace('status-', ''),
        tags: [...row.classList].filter((c) => c.startsWith('topic-tag-')).map((c) => c.replace('topic-tag-', '')),
        remove: (row.querySelector('.bbp-row-actions a') || {}).href || '',
      });
    }
    return out;
  }, FORUMS).catch(() => []);
}

/** The address of the next page of a list of the forums, or an empty string on the last one. */
async function nextPageAddress(world) {
  return world.page.evaluate((sel) => {
    const next = document.querySelector(`${sel} .bbp-pagination-links a.next`);
    return next ? next.href : '';
  }, FORUMS).catch(() => '');
}

/** A topic of the list on the page by its title, looking through the pages of the list; null when it lists none. */
async function findListedTopic(world, title) {
  const seen = [];
  for (let page = 0; page < 20; page += 1) {
    const topics = await listedTopics(world);
    const found = topics.find((t) => same(t.title, title));
    if (found) return { topic: found, seen };
    seen.push(...topics.map((t) => t.title));
    const next = await nextPageAddress(world);
    if (!next) break;
    await navigate(world, next);
  }
  return { topic: null, seen };
}

/**
 * Open a topic by its title: in a forum (by the forum's name, through the
 * pages of its list), or without one from the list on the page, else through
 * the forum search.
 */
async function openTopic(world, title, forumName) {
  let href = '';
  if (supplied(forumName)) {
    await openForum(world, forumName);
    const { topic, seen } = await findListedTopic(world, title);
    if (!topic) {
      throw friendly({
        message: `The forum "${forumName}" lists no topic "${title}". It lists: ${listed(seen)}.`,
        hint: 'A topic is found by its title in the forum\'s list. A pending, spammed or trashed topic is left out of it, for a moderator too until it asks for them: When I show the hidden topics.',
      });
    }
    href = topic.href;
  } else {
    const known = (world.forumTopics || []).find((t) => same(t.title, title));
    const here = (await listedTopics(world)).find((t) => same(t.title, title));
    if (here) href = here.href;
    else if (known) href = known.url;
    else {
      await navigate(world, `${forumsRoot(world)}search/${encodeURIComponent(title)}/`);
      href = await world.page.evaluate(([sel, wanted]) => {
        const norm = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
        const link = [...document.querySelectorAll(`${sel} .bbp-topic-header .bbp-topic-title a, ${sel} a.bbp-topic-permalink`)]
          .find((a) => norm(a.textContent) === norm(wanted));
        return link ? link.href : '';
      }, [FORUMS, title]).catch(() => '');
      if (!href) {
        throw friendly({
          message: `The forum search finds no topic "${title}" for this account.`,
          hint: 'Name the forum: When I open the topic "…" in "…". Without one the topic is looked up in the list on the page, then through the forum search, which the settings of the forums can turn off.',
        });
      }
    }
  }
  await navigate(world, href);
  await readingTopic(world, title);
}

/** Assert the page is a topic, with a title when one is given; returns the page. */
async function readingTopic(world, title) {
  const page = await forumPage(world);
  if (page.kind !== 'topic') {
    throw friendly({
      message: `The page is not a topic: it is ${page.heading ? `"${page.heading}"` : 'no page of the forums'} (${page.url}).`,
      hint: 'Open one first: When I open the topic "…" in "…".',
    });
  }
  if (supplied(title) && !same(page.heading, title)) {
    throw friendly({
      message: `The page is not the topic "${title}": it is the topic "${page.heading}".`,
      hint: `The browser is at ${page.url}.`,
    });
  }
  return page;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

/**
 * The posts of the topic page, in order: the lead post of the topic, then
 * the replies of this page. Each with its author, the author's forum role,
 * its text (the edit log aside), its HTML, the lines of its edit log, its
 * status and the links the forums offer on it.
 */
async function topicPosts(world) {
  return world.page.evaluate((sel) => {
    const text = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : '');
    const out = [];
    for (const header of document.querySelectorAll(`${sel} ul.bbp-replies div.bbp-reply-header[id^="post-"]`)) {
      const id = header.id.replace('post-', '');
      const body = header.parentElement.querySelector(`div.post-${id}`);
      if (!body) continue;
      const content = body.querySelector('.bbp-reply-content');
      const copy = content ? content.cloneNode(true) : null;
      const log = copy ? [...copy.querySelectorAll('.bbp-topic-revision-log li, .bbp-reply-revision-log li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()) : [];
      if (copy) copy.querySelectorAll('.bbp-topic-revision-log, .bbp-reply-revision-log').forEach((n) => n.remove());
      out.push({
        id,
        lead: body.classList.contains('type-topic'),
        status: ([...body.classList].find((c) => c.startsWith('status-')) || '').replace('status-', ''),
        author: text(body.querySelector('.bbp-reply-author .bbp-author-name')),
        role: text(body.querySelector('.bbp-reply-author .bbp-author-role')),
        text: copy ? copy.textContent.replace(/\s+/g, ' ').trim() : '',
        html: copy ? copy.innerHTML : '',
        log,
        links: [...header.querySelectorAll('.bbp-admin-links a')].map((a) => ({
          text: a.textContent.replace(/\s+/g, ' ').trim(),
          name: [...a.classList].find((c) => /^bbp-(topic|reply)-/.test(c)) || '',
          href: a.href,
          confirms: a.hasAttribute('onclick'),
        })),
      });
    }
    return out;
  }, FORUMS).catch(() => []);
}

/**
 * A post of the topic page by its number on the page (1 is the first), or
 * the last one when no number is given.
 */
async function postOnPage(world, number) {
  await readingTopic(world);
  const posts = await topicPosts(world);
  if (!posts.length) {
    throw friendly({ message: `The topic shows no post (${world.page.url()}).`, hint: 'A blocked account, or a visitor of a private forum, gets no post.' });
  }
  if (!supplied(number)) return { post: posts[posts.length - 1], posts, label: 'The last post' };
  const index = Number(number);
  if (index < 1 || index > posts.length) {
    throw friendly({
      message: `The page has no post ${index}: it shows ${posts.length} post(s).`,
      hint: 'Posts are counted on the page that is open, the topic\'s own post first; a topic shows 15 posts a page.',
    });
  }
  return { post: posts[index - 1], posts, label: `Post ${index}` };
}

/**
 * Follow a link the forums offer on a post (Close, Stick, Trash, Spam,
 * Approve, …) by the class the forums give it; a link that asks "are you
 * sure" gets its yes.
 */
async function followPostLink(world, post, names, what) {
  const link = post.links.find((l) => names.includes(l.name));
  if (!link) {
    throw friendly({
      message: `Could not ${what}: the post offers no such link. It offers: ${listed(post.links.map((l) => l.text))}.`,
      hint: 'The moderation links are offered to a moderator and a keymaster; a participant gets Edit on its own posts and Reply.',
    });
  }
  if (link.confirms) world.page.once('dialog', (dialog) => dialog.accept().catch(() => {}));
  await clickAndLoad(world, world.page.locator(`#post-${post.id} .bbp-admin-links a.${link.name}`).first(), what);
  return link;
}

// ---------------------------------------------------------------------------
// Another account, for the test content
// ---------------------------------------------------------------------------

// The session of each account that logged in for the test content, by site and handle: the next Given of
// the run takes it over instead of filling in the login form again.
const SESSIONS = new Map();

/**
 * Do something as another account, then give the scenario's own session
 * back. The account logs in through the login page once in a run; later calls
 * take its session over when the site still knows it.
 */
async function asAccount(world, handle, work) {
  resolveUser(world, handle);
  const key = `${siteRoot(world.launchUrl)}|${handle}`;
  const before = await world.context.cookies();
  try { await world.page.goto('about:blank'); } catch { /* nothing open yet */ }
  await world.context.clearCookies();
  let ready = false;
  if (SESSIONS.has(key)) {
    await world.context.addCookies(SESSIONS.get(key));
    ready = await isLoggedIn(world).catch(() => false);
    if (!ready) await world.context.clearCookies();
  }
  if (!ready) {
    await loginAs(world, handle);
    SESSIONS.set(key, await world.context.cookies());
  }
  try {
    return await work();
  } finally {
    try { await world.page.goto('about:blank'); } catch { /* the page is gone */ }
    await world.context.clearCookies();
    if (before.length) await world.context.addCookies(before);
  }
}

// ---------------------------------------------------------------------------
// The mail catcher
// ---------------------------------------------------------------------------

/** The address of a handle of the users registry, or the address itself. */
function addressOf(world, who) {
  if (/@/.test(who)) return who;
  const users = (world.parameters && world.parameters.users) || {};
  const entry = users[who];
  if (!entry || !entry.email) {
    throw friendly({
      message: `"${who}" has no e-mail address in the users registry.`,
      hint: `Give worldParameters.users.${who} an "email" in cucumber.js, or write the address itself in the step.`,
    });
  }
  return entry.email;
}

/** The mail catcher's API address: `worldParameters.mailUrl`, else port 8026 of the site (a DDEV project's Mailpit). */
function mailRoot(world) {
  const own = world.parameters && world.parameters.mailUrl;
  return String(own || `${siteRoot(world.launchUrl)}:8026`).replace(/\/+$/, '');
}

/**
 * The mail that arrived since the scenario began, to an address in any of
 * To, Cc and Bcc (the forums send one mail to a no-reply address with the
 * subscribers in Bcc), newest first.
 */
async function mailTo(world, address) {
  const url = `${mailRoot(world)}/api/v1/messages?limit=200`;
  let response;
  try {
    response = await world.context.request.get(url, { failOnStatusCode: false, ignoreHTTPSErrors: true });
  } catch (err) {
    throw friendly({ message: `Could not read the mail catcher at ${url}.`, cause: err, hint: 'Check worldParameters.mailUrl in cucumber.js: the API of Mailpit, port 8026 of a DDEV project.' });
  }
  if (response.status() !== 200) {
    throw friendly({ message: `The mail catcher at ${url} answered ${response.status()}.`, hint: 'Check worldParameters.mailUrl in cucumber.js: the API of Mailpit, port 8026 of a DDEV project.' });
  }
  const since = (world.forumScenarioStartedAt || 0) - 2000;
  const wanted = address.toLowerCase();
  const body = await response.json();
  return (body.messages || []).filter((m) => Date.parse(m.Created) >= since
    && [].concat(m.To || [], m.Cc || [], m.Bcc || []).some((a) => String(a.Address || '').toLowerCase() === wanted));
}

/** The text of a mail of the mail catcher: its text version, else its HTML without the markup. */
async function mailText(world, id) {
  const response = await world.context.request.get(`${mailRoot(world)}/api/v1/message/${id}`, { failOnStatusCode: false, ignoreHTTPSErrors: true });
  const body = await response.json();
  return clean(body.Text || String(body.HTML || '').replace(/<[^>]*>/g, ' '));
}

module.exports = {
  FORUMS,
  budget,
  settle,
  navigate,
  visit,
  visitAdmin,
  joinUrl,
  supplied,
  clean,
  listed,
  same,
  holds,
  quotedList,
  eventually,
  clickAndLoad,
  forumsRoot,
  contentModerator,
  gotoForumIndex,
  forumPage,
  forumNotices,
  listTotal,
  listedForums,
  forumNames,
  forumAddress,
  openForum,
  listedTopics,
  nextPageAddress,
  findListedTopic,
  openTopic,
  readingTopic,
  topicPosts,
  postOnPage,
  followPostLink,
  asAccount,
  addressOf,
  mailTo,
  mailText,
};
