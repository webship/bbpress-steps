'use strict';

// What this pack brings along for every scenario. Not a step file.
//
//   1. The WordPress pack's steps. A forum project installs this pack alone:
//      the login by a handle of the users registry, the administration
//      screens, menus and notices, the settings by their labels, the REST API
//      and the feeds come from @webship-js/wordpress-steps, which this package
//      depends on and loads here, so one `require` glob in cucumber.js is
//      enough. A project that lists the WordPress pack's glob as well is fine
//      while npm installed one copy of it (Node loads a file once); a second,
//      nested copy (the project pins another release line of it) registers
//      every WordPress step twice, so drop that glob then (see README).
//
//   2. The forums' administration screens, added to the WordPress pack's list
//      of named screens: `Given I am on the "Topics" admin screen` opens the
//      topics of the forums, as `the "Plugins" admin screen` opens the
//      plugins. A name the WordPress pack already has is never changed.
//
//   3. Per scenario: the moment it began (a notification step reads only the
//      mail that arrived since then) and the topics its Given steps made
//      (`I open the topic "…"` finds them without a forum).

const fs = require('fs');
const path = require('path');
const { Before } = require('@cucumber/cucumber');

const WORDPRESS_STEPS_DIR = path.join(path.dirname(require.resolve('@webship-js/wordpress-steps/package.json')), 'tests', 'step-definitions');
for (const file of fs.readdirSync(WORDPRESS_STEPS_DIR).filter((f) => f.endsWith('.js')).sort()) {
  require(path.join(WORDPRESS_STEPS_DIR, file));
}

const { ADMIN_SCREENS } = require('@webship-js/wordpress-steps/tests/step-definitions/wordpress-helpers');

// The screens of the forums' administration, by the name a person reads in
// the menu or on the screen, lower case.
const FORUM_ADMIN_SCREENS = {
  'forums': '/wp-admin/edit.php?post_type=forum',
  'all forums': '/wp-admin/edit.php?post_type=forum',
  'create new forum': '/wp-admin/post-new.php?post_type=forum',
  'topics': '/wp-admin/edit.php?post_type=topic',
  'all topics': '/wp-admin/edit.php?post_type=topic',
  'create new topic': '/wp-admin/post-new.php?post_type=topic',
  'topic tags': '/wp-admin/edit-tags.php?taxonomy=topic-tag&post_type=topic',
  'replies': '/wp-admin/edit.php?post_type=reply',
  'all replies': '/wp-admin/edit.php?post_type=reply',
  'create new reply': '/wp-admin/post-new.php?post_type=reply',
  'forums settings': '/wp-admin/options-general.php?page=bbpress',
  'forum tools': '/wp-admin/tools.php?page=bbp-repair',
  'repair forums': '/wp-admin/tools.php?page=bbp-repair',
  'upgrade forums': '/wp-admin/tools.php?page=bbp-upgrade',
  'import forums': '/wp-admin/tools.php?page=bbp-converter',
  'reset forums': '/wp-admin/tools.php?page=bbp-reset',
};
for (const [name, screen] of Object.entries(FORUM_ADMIN_SCREENS)) {
  if (!(name in ADMIN_SCREENS)) ADMIN_SCREENS[name] = screen;
}

Before(function () {
  this.forumScenarioStartedAt = Date.now();
  this.forumTopics = [];
});

module.exports = { WORDPRESS_STEPS_DIR, FORUM_ADMIN_SCREENS };
