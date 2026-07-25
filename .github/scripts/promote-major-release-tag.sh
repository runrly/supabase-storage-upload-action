#!/usr/bin/env bash
set -euo pipefail

: "${RUNNER_TEMP:?missing runner temp directory}"
: "${RUNRLY_ECHO_SIGNING_PRIVATE_KEY:?missing release-signing secret}"
: "${RELEASE_TAG:?missing release tag}"

readonly TAG_PATTERN='^v[0-9]+\.[0-9]+\.[0-9]+$'
readonly KEY_PATH="$RUNNER_TEMP/supabase-storage-upload-action-major-signing-key"
readonly PUBLIC_KEY_PATH="$KEY_PATH.pub"
readonly ALLOWED_SIGNERS_PATH="$RUNNER_TEMP/supabase-storage-upload-action-major-allowed-signers"
readonly TAGGER_NAME="runrly-echo"
readonly TAGGER_EMAIL="echo@runrly.dev"

fail() {
	echo "$*" >&2
	exit 1
}

cleanup() {
	rm -f "$KEY_PATH" "$PUBLIC_KEY_PATH" "$ALLOWED_SIGNERS_PATH"
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
	[[ "$RELEASE_TAG" =~ $TAG_PATTERN ]] || fail "tag must be a stable vX.Y.Z version"

	git fetch --force --no-tags origin "refs/tags/$RELEASE_TAG:refs/tags/$RELEASE_TAG"
	local commit major_tag
	commit="$(git rev-parse "$RELEASE_TAG^{}")"
	major_tag="v${RELEASE_TAG#v}"
	major_tag="${major_tag%%.*}"

	trap cleanup EXIT
	configure_signing_key
	git tag --force --sign --message "Release $major_tag" "$major_tag" "$commit"
	git verify-tag "$major_tag"
	git push --force origin "refs/tags/$major_tag"
}

main "$@"
