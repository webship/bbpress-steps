'use strict';

// The notifications the forums send by e-mail, read in the mail catcher of
// the test site (Mailpit, which every DDEV project has at port 8026;
// `worldParameters.mailUrl` names another): the mail of a reply to the
// subscribers of its topic, the mail of a new topic to the subscribers of its
// forum, and the absence of any.
//
// The forums send one mail per post to a no-reply address of the site, with
// the subscribers in Bcc, in the request that takes the post: once the page
// of the post is back, the mail is out. A step reads only the mail that
// arrived since the scenario began. The subject is "[<forum>] <topic>": a step
// matches a part of it, letter case aside. An address stands for itself, a
// handle of the users registry for the account's address.

const { Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  budget,
  clean,
  listed,
  holds,
  eventually,
  addressOf,
  mailTo,
  mailText,
} = require('./bbpress-helpers');

/** The notification to an address whose subject holds a text; waits for it. */
async function notification(world, who, subject) {
  const address = addressOf(world, who);
  const all = await eventually(world, () => mailTo(world, address), (messages) => messages.some((m) => holds(m.Subject, subject)), (messages) => ({
    message: `Expected a notification with "${subject}" in its subject to ${address}. ${(messages || []).length ? `Since the scenario began it got: ${listed((messages || []).map((m) => m.Subject))}` : 'Since the scenario began it got no mail'}.`,
    hint: 'The forums notify the subscribers of a topic of each reply, and the subscribers of a forum of each new topic, but never the author of the post. The subject reads "[<forum>] <topic>".',
  }), budget(world) * 3);
  return all.find((m) => holds(m.Subject, subject));
}

/**
 * Assert the forums sent a notification whose subject holds a text to an
 * account (a handle of the users registry, or an address) since the scenario
 * began; the step waits for it to arrive.
 *
 * Example #1: Then a forum notification with the subject "Webship test topic" should be sent to "participant"
 * Example #2: And a forum notification with the subject "[Help and support]" should be sent to "participant"
 * Example #3: Then a forum notification with the subject "Webship test question" should be sent to "moderator"
 * Example #4: Then a forum notification with the subject "[General discussion] Webship test topic" should be sent to "participant@example.com"
 * Example #5: And a forum notification with the subject "Webship test" should be sent to "keymaster"
 */
Then(/^a forum notification with the subject "([^"]*)" should be sent to "([^"]*)"$/, async function (subject, who) {
  await notification(this, who, subject);
});

/**
 * Assert the forums sent no notification to an account since the scenario
 * began. The forums send their mail in the request that takes a post, so the
 * mail catcher is read at once.
 *
 * Example #1: Then no forum notification should be sent to "moderator"
 * Example #2: And no forum notification should be sent to "participant"
 * Example #3: Then no forum notification should be sent to "spectator"
 * Example #4: Then no forum notification should be sent to "nobody@example.com"
 * Example #5: But no forum notification should be sent to "keymaster"
 */
Then(/^no forum notification should be sent to "([^"]*)"$/, async function (who) {
  const address = addressOf(this, who);
  const messages = await mailTo(this, address);
  if (messages.length) {
    throw friendly({
      message: `Expected no notification to ${address}, but since the scenario began it got: ${listed(messages.map((m) => m.Subject))}.`,
      hint: 'The step counts every mail to the address since the scenario began. The author of a post is never notified of it.',
    });
  }
});

/**
 * Assert a notification whose subject holds a text, to an account, holds a
 * text in its body: who wrote, what, the link of the post.
 *
 * Example #1: Then the forum notification with the subject "Webship test topic" to "participant" should contain "moderator wrote:"
 * Example #2: And the forum notification with the subject "Webship test topic" to "participant" should contain "Webship test reply"
 * Example #3: Then the forum notification with the subject "[Help and support]" to "participant" should contain "Topic Link:"
 * Example #4: Then the forum notification with the subject "Webship test topic" to "participant" should contain "Post Link:"
 * Example #5: And the forum notification with the subject "Webship test" to "participant@example.com" should contain "You are receiving this email because you subscribed to a forum topic."
 */
Then(/^the forum notification with the subject "([^"]*)" to "([^"]*)" should contain "([^"]*)"$/, async function (subject, who, text) {
  const mail = await notification(this, who, subject);
  const body = await mailText(this, mail.ID);
  if (!holds(body, text)) {
    throw friendly({
      message: `The notification "${clean(mail.Subject)}" does not contain "${text}". It reads: "${body.slice(0, 400)}".`,
      hint: 'The text is matched as a part of the mail\'s text, letter case and white space aside.',
    });
  }
});
