#!/usr/bin/env bash
# Build an offline-install zip of defect-gatherer + requirements-gatherer plugins.
# Output: dist/defect-and-requirements-tools-vYYYY-MM-DD.zip
#
# Usage: bash scripts/package-standalone.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

for tool in zip jq; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "ERROR: required tool '$tool' is not installed." >&2
    echo "Install it and re-run." >&2
    exit 1
  fi
done

VERSION_DEFECT_GATHERER=$(jq -r .version plugins/defect-gatherer/.claude-plugin/plugin.json)
VERSION_REQUIREMENTS_GATHERER=$(jq -r .version plugins/requirements-gatherer/.claude-plugin/plugin.json)

if [[ -z "$VERSION_DEFECT_GATHERER" || -z "$VERSION_REQUIREMENTS_GATHERER" ]]; then
  echo "ERROR: could not read plugin versions from plugin.json files." >&2
  exit 1
fi

DATE=$(date +%Y-%m-%d)
OUTPUT_NAME="defect-and-requirements-tools-v${DATE}.zip"
OUTPUT_PATH="dist/${OUTPUT_NAME}"
STAGING="dist/.staging"

echo "Packaging standalone zip..."
echo "  defect-gatherer:        ${VERSION_DEFECT_GATHERER}"
echo "  requirements-gatherer:  ${VERSION_REQUIREMENTS_GATHERER}"
echo "  output:                 ${OUTPUT_PATH}"

rm -rf "$STAGING"
rm -f "$OUTPUT_PATH"
mkdir -p "$STAGING" dist

cp -R plugins/defect-gatherer "$STAGING/defect-gatherer"
cp -R plugins/requirements-gatherer "$STAGING/requirements-gatherer"

find "$STAGING" \( \
  -name '.agent-progress' -o \
  -name 'node_modules' -o \
  -name '.DS_Store' -o \
  -name '*.log' \
\) -prune -exec rm -rf {} + 2>/dev/null || true

sed \
  -e "s|{{VERSION_DEFECT_GATHERER}}|${VERSION_DEFECT_GATHERER}|g" \
  -e "s|{{VERSION_REQUIREMENTS_GATHERER}}|${VERSION_REQUIREMENTS_GATHERER}|g" \
  scripts/standalone-templates/INSTALL.md > "$STAGING/INSTALL.md"

sed \
  -e "s|{{VERSION_DEFECT_GATHERER}}|${VERSION_DEFECT_GATHERER}|g" \
  -e "s|{{VERSION_REQUIREMENTS_GATHERER}}|${VERSION_REQUIREMENTS_GATHERER}|g" \
  scripts/standalone-templates/USAGE.md > "$STAGING/USAGE.md"

(cd "$STAGING" && zip -r "../../${OUTPUT_PATH}" . >/dev/null)

rm -rf "$STAGING"

SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)
echo ""
echo "Done."
echo "  ${OUTPUT_PATH} (${SIZE})"
