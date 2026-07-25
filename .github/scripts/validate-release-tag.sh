#!/usr/bin/env bash
set -euo pipefail

readonly TAG_PATTERN='^v[0-9]+\.[0-9]+\.[0-9]+$'

fail() {
	echo "$*" >&2
	exit 1
}

require_environment() {
	: "${GITHUB_REPOSITORY:?missing repository context}"
	: "${GITHUB_OUTPUT:?missing GitHub Actions output file}"
	: "${RELEASE_TAG:?missing release tag}"
}

package_version() {
	node -e 'console.log(JSON.parse(require("node:fs").readFileSync("package.json", "utf8")).version)'
}

main() {
	require_environment
	[[ "$RELEASE_TAG" =~ $TAG_PATTERN ]] || fail "tag must be a stable vX.Y.Z version"

	git fetch --force --no-tags origin \
		"refs/tags/$RELEASE_TAG:refs/tags/$RELEASE_TAG" \
		'+refs/heads/main:refs/remotes/origin/main'

	local object commit verified version
	object="$(git rev-parse "$RELEASE_TAG^{tag}" 2> /dev/null)" \
		|| fail "tag $RELEASE_TAG must be annotated"
	commit="$(git rev-parse "$RELEASE_TAG^{}")"
	verified="$(gh api "repos/$GITHUB_REPOSITORY/git/tags/$object" --jq '.verification.verified')"
	[[ "$verified" == true ]] || fail "tag $RELEASE_TAG is not GitHub-verified"
	git merge-base --is-ancestor "$commit" origin/main \
		|| fail "tag $RELEASE_TAG is not reachable from main"

	git checkout --detach "$commit"
	version="$(package_version)"
	[[ "$RELEASE_TAG" == "v$version" ]] \
		|| fail "tag $RELEASE_TAG does not match package version $version"

	echo "tag=$RELEASE_TAG" >> "$GITHUB_OUTPUT"
	echo "commit=$commit" >> "$GITHUB_OUTPUT"
}

main "$@"
