#!/bin/bash
# Block dangerous commands before execution
# Runs: before bash command execution

COMMAND="$1"

# Block destructive git commands
if echo "$COMMAND" | grep -qE 'git (push --force|reset --hard|clean -fd)'; then
  echo "BLOCKED: Dangerous git command detected. Use with caution."
  exit 1
fi

# Block rm -rf on important paths
if echo "$COMMAND" | grep -qE 'rm -rf (/|~|/Users)'; then
  echo "BLOCKED: Dangerous rm command on critical path."
  exit 1
fi

exit 0
