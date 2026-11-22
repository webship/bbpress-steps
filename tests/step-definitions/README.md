# Step definitions

| File | Covers |
| --- | --- |
| `bbpress-forums.steps.js` | The forum index and a forum: the forums an account sees, their counters and marks, the topics of a forum, the pages of a list, the forums' breadcrumbs and notices, whether the account may start a topic or reply, a page the forums refuse. |
| `bbpress-topics.steps.js` | A topic and its posts (authors, forum roles, text, format, edit log, state, tags), and the forms: a new topic, a reply, an edit, the editor's toolbar, the errors, the links a post offers. |
| `bbpress-moderation.steps.js` | The moderation links of a topic and a reply, merge, split, move, what the forums hide from the members, the moderator tools. |
| `bbpress-profile.steps.js` | Subscriptions and favorites, the lists of the account's profile, the forum profile, the forum role of an account, the profile's edit form. |
| `bbpress-search.steps.js` | The forum search and its results, the page of a topic tag, the views of the forums. |
| `bbpress-admin.steps.js` | The forums in the administration: the lists and the actions of their rows, the features of the settings, the repair tools, the forum role on the users screen. |
| `bbpress-mail.steps.js` | The forums' notifications, read in the mail catcher of the test site. |
| `bbpress-content.steps.js` | Test content a scenario starts from: a topic by an account, a reply by an account, and their removal. |
| `bbpress-defaults.js` | Loads the WordPress pack's steps, adds the forums' screens to its named administration screens, and keeps per scenario the moment it began and the topics its Given steps made. It registers no step. |
| `bbpress-helpers.js` | Shared plumbing: the forums' root, what a page lists, the way to a forum and a topic, the links of a post, the session of another account, the mail catcher. It registers no step. |

## Rules for a new step

- Check `node_modules/webship-js/tests/step-definitions/` and the WordPress
  pack's steps (`node_modules/@webship-js/wordpress-steps/tests/step-definitions/`)
  first: a step that the generic vocabulary or the WordPress pack already covers
  (text, clicks, fields, dialogs, the login, the administration's screens, menus,
  notices and settings) is not added here.
- No step phrase names the platform. A name appears only as an argument a step
  asserts.
- The regular expression starts with the pronoun group `(I |we )*` where a
  person acts, and an assertion takes `should( not)*`, so one definition reads
  both polarities.
- A JSDoc block above the step holds at least five `Example #N:` lines. Run
  `npm run test:examples`: every example must match its own step and no step of
  webship-js or of the WordPress pack.
- Find things the way a person does: the name of a forum, the title of a topic,
  the number of a post on the page, the text of a link, a label. What the forums
  print the same way on every theme is the fallback: the rows and classes inside
  `#bbpress-forums`.
- Wait on the forums, never on a fixed time: on the page a form or a moderation
  link leads to and the state the post has there, on the mark of a subscription
  or a favorite, on the notice of an administration screen.
- Fail with `friendly({ message, hint })`: what was expected, what was found
  and where to look.
- A step never creates or deletes a user: accounts are configuration, named in
  the `users` registry of `cucumber.js` and created by the build of the site.
- Open the page in a real browser before writing or changing its step, and
  write the step from what is there.
- Give every assertion a scenario in `tests/must-fail/` that makes it fail.
