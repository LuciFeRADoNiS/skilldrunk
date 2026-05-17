#!/bin/bash
# Send macOS notification when Claude finishes a task
# Runs: after task completion

osascript -e 'display notification "Claude Code işi tamamladı" with title "Claude Code" sound name "Glass"'
