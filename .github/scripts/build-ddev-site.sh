#!/usr/bin/env bash
# Builds the site the suite runs against: the latest WordPress with the free bbPress plugin in a DDEV
# project of type wordpress, the way a site gets its forums:
#   - bbPress from the plugin directory, with pretty addresses (/forums/);
#   - the default block theme (Twenty Twenty-Five), or the classic theme THEME names;
#   - the forums' settings left as the plugin sets them, but for two a suite cannot work with: no wait
#     between two posts of an account (the flood protection), and no time limit on editing one's own post;
#   - the accounts of the suite, each with its forum role;
#   - the test content (site/forum-site.php): a category with two forums, a forum of sixteen topics, a
#     closed, a private and a hidden forum, sticky and closed topics, a topic of two pages, topic tags.
#
# Settings (environment variables, all optional):
#   PROJECT_NAME       the DDEV project name                           (default bbpresssteps)
#   SITE_DIR           the project folder                              (default a new temporary folder)
#   WORDPRESS_VERSION  the WordPress release                           (default latest)
#   BBPRESS_VERSION    the bbPress release, from the plugin directory  (default the latest stable)
#   PHP_VERSION        the PHP of the web container                    (default 8.4)
#   THEME              a theme of the theme directory to activate      (default: the theme WordPress installs with)
#   SITE_TITLE         the name of the site                            (default Webship Forums)
#   RESET_ONLY         1: build nothing; put the forums in SITE_DIR back as the build left them, after a
#                      run that was stopped half way (the topics and replies of the run go, the favorites
#                      and subscriptions of the accounts too)
#
# The accounts are configuration: this script creates them and cucumber.js names them; the features never
# create or delete an account. Each is named after its forum role, with one password:
#   administrator  dD.123123ddd  administrator of the site (the installer's account), a keymaster of the forums
#   keymaster      dD.123123ddd  Keymaster: everything in the forums, their settings and tools
#   moderator      dD.123123ddd  Moderator: every topic and reply, the hidden forums
#   participant    dD.123123ddd  Participant: topics and replies, the private forums
#   spectator      dD.123123ddd  Spectator: reads the public forums
#   blocked        dD.123123ddd  Blocked: no forum at all
#
# Nothing is installed that is paid or needs an account.
set -euo pipefail
# No command of the build reads a terminal: a container command waits forever on an open stdin pipe.
exec < /dev/null

PROJECT_NAME="${PROJECT_NAME:-bbpresssteps}"
WORDPRESS_VERSION="${WORDPRESS_VERSION:-latest}"
BBPRESS_VERSION="${BBPRESS_VERSION:-}"
PHP_VERSION="${PHP_VERSION:-8.4}"
THEME="${THEME:-}"
SITE_TITLE="${SITE_TITLE:-Webship Forums}"
PASSWORD='dD.123123ddd'
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SITE_DIR="${SITE_DIR:-$(mktemp -d)}"

# The forums' settings, roles and content, written with the plugin's own functions (site/forum-site.php).
forum_site() {
  cp "$REPO_DIR/site/forum-site.php" .webship-forum-site.php
  ddev wp eval-file .webship-forum-site.php "$@"
  rm -f .webship-forum-site.php
}

mkdir -p "$SITE_DIR"
cd "$SITE_DIR"

if [ "${RESET_ONLY:-}" = "1" ]; then
  forum_site reset
  echo "The forums are back as the build left them."
  exit 0
fi

# Node.js 24, the line the workspace builds run.
ddev config --project-type=wordpress --docroot="" --project-name="$PROJECT_NAME" --php-version="$PHP_VERSION" --nodejs-version=24
ddev start -y
SITE_URL="$(ddev describe -j | python3 -c "import json,sys; print(json.load(sys.stdin)['raw']['primary_url'])")"

ddev wp core download --version="$WORDPRESS_VERSION"
ddev wp core install --url="$SITE_URL" --title="$SITE_TITLE" \
  --admin_user=administrator --admin_password="$PASSWORD" --admin_email=administrator@example.com --skip-email
ddev wp rewrite structure '/%postname%/'

if [ -n "$THEME" ]; then
  ddev wp theme install "$THEME" --activate
fi

ddev wp plugin install bbpress ${BBPRESS_VERSION:+--version="$BBPRESS_VERSION"} --activate

# The accounts of the suite (the installer's account is the administrator). Each is a subscriber of the
# site; its forum role comes with the content below.
for account in keymaster moderator participant spectator blocked; do
  ddev wp user create "$account" "$account@example.com" --role=subscriber --user_pass="$PASSWORD" --porcelain > /dev/null
done

forum_site

# The addresses of the forums (/forums/, /forums/forum/…, /forums/topic/…) answer once the rules are written
# again: a plugin activated from the command line does not write them.
ddev wp rewrite flush

if [ -n "${GITHUB_ENV:-}" ]; then
  echo "LAUNCH_URL=$SITE_URL" >> "$GITHUB_ENV"
fi
echo "Built the forums at $SITE_URL: WordPress $(ddev wp core version), bbPress $(ddev wp plugin get bbpress --field=version), theme $(ddev wp option get stylesheet), PHP $(ddev exec php -r 'echo PHP_VERSION;')"
