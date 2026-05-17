#!/bin/bash
# Auto-format changed files after Claude edits
# Runs: after every file edit

FILE="$1"
EXT="${FILE##*.}"

case "$EXT" in
  ts|tsx|js|jsx)
    npx prettier --write "$FILE" 2>/dev/null
    ;;
  py)
    black "$FILE" 2>/dev/null || true
    ;;
  json)
    npx prettier --write "$FILE" 2>/dev/null
    ;;
esac
