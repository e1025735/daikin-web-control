#!/usr/bin/env bash
# Replace the bundled Font Awesome Free release with the given version.
#
# Only the files we actually ship are kept: css/all.min.css, webfonts/, LICENSE.txt.
set -euo pipefail

VERSION="${1:?usage: $0 <version>}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FA_DIR="${REPO_ROOT}/font-awesome"
ZIP_URL="https://github.com/FortAwesome/Font-Awesome/releases/download/${VERSION}/fontawesome-free-${VERSION}-web.zip"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

echo "Downloading ${ZIP_URL}"
curl -fsSL --retry 3 "${ZIP_URL}" -o "${WORK_DIR}/fa.zip"

echo "Extracting"
unzip -q "${WORK_DIR}/fa.zip" -d "${WORK_DIR}"
SRC="${WORK_DIR}/fontawesome-free-${VERSION}-web"

if [[ ! -d "${SRC}" ]]; then
  echo "Extracted layout unexpected: ${SRC} not found" >&2
  exit 1
fi

echo "Replacing ${FA_DIR} contents"
mkdir -p "${FA_DIR}/css"
rm -f  "${FA_DIR}/css/all.min.css" "${FA_DIR}/LICENSE.txt"
rm -rf "${FA_DIR}/webfonts"
mkdir -p "${FA_DIR}/webfonts"

cp "${SRC}/css/all.min.css" "${FA_DIR}/css/all.min.css"
cp "${SRC}/LICENSE.txt"     "${FA_DIR}/LICENSE.txt"
cp "${SRC}/webfonts/"*      "${FA_DIR}/webfonts/"

echo "${VERSION}" > "${FA_DIR}/.version"

echo "Font Awesome is now at ${VERSION}."
