#!/usr/bin/env bash
set -euo pipefail

: "${RUNNER_TEMP:?missing runner temp directory}"
: "${RUNRLY_ECHO_SIGNING_PRIVATE_KEY:?missing release-signing secret}"
: "${RELEASE_SHA:?missing release commit SHA}"

readonly KEY_PATH="$RUNNER_TEMP/supabase-storage-upload-action-release-signing-key"
readonly PUBLIC_KEY_PATH="$KEY_PATH.pub"
readonly ALLOWED_SIGNERS_PATH="$RUNNER_TEMP/supabase-storage-upload-action-release-allowed-signers"
readonly TAGGER_NAME="runrly-echo"
readonly TAGGER_EMAIL="echo@runrly.dev"
readonly VERSION_PATTERN='^[0-9]+\.[0-9]+\.[0-9]+$'

cleanup() {
	rm -f "$KEY_PATH" "$PUBLIC_KEY_PATH" "$ALLOWED_SIGNERS_PATH"
}

package_version() {
	node -e 'console.log(JSON.parse(require("node:fs").readFileSync("package.json", "utf8")).version)'
}

configure_signing_key() {
	umask 077
	printf '%s\n' "$RUNRLY_ECHO_SIGNING_PRIVATE_KEY" > "$KEY_PATH"
	ssh-keygen -y -f "$KEY_PATH" > "$PUBLIC_KEY_PATH"

	git config user.name "$TAGGER_NAME"
	git config user.email "$TAGGER_EMAIL"
	git config gpg.format ssh
	git config user.signingkey "$PUBLIC_KEY_PATH"
	printf '%s namespaces="git" %s\n' "$TAGGER_EMAIL" "$(<"$PUBLIC_KEY_PATH")" > "$ALLOWED_SIGNERS_PATH"
	git config gpg.ssh.allowedSignersFile "$ALLOWED_SIGNERS_PATH"
}

main() {
	local version tag
	version="$(package_version)"
	[[ "$version" =~ $VERSION_PATTERN ]] || {
		echo "package version must be a stable X.Y.Z version" >&2
		exit 1
	}
	tag="v$version"

	git rev-parse --verify "$RELEASE_SHA^{commit}" > /dev/null
	git fetch --force --no-tags origin '+refs/heads/main:refs/remotes/origin/main'
	git merge-base --is-ancestor "$RELEASE_SHA" origin/main
	if git rev-parse -q --verify "refs/tags/$tag" > /dev/null; then
		echo "tag $tag already exists" >&2
		exit 1
	fi

	trap cleanup EXIT
	configure_signing_key
	git tag --sign --message "Release $tag" "$tag" "$RELEASE_SHA"
	git verify-tag "$tag"
	git push origin "refs/tags/$tag"
}

main "$@"
