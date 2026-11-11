#!/usr/bin/env bash
# Checks a Spec Kit project after the preset and the extension are added (--dev or --from):
# the preset sections in the core skills, the extension skills and their aliases, the agent instructions.
# Usage: check-skills.sh <project dir>
set -euo pipefail
cd "$1"

for command in specify clarify plan tasks analyze implement converge checklist; do
  grep -q '(artefact-sdd)' ".claude/skills/speckit-$command/SKILL.md" \
    || { echo "::error::speckit-$command has no (artefact-sdd) section"; exit 1; }
done

for command in prd design epics prototype; do
  for skill in "speckit-artefact-product-$command" "speckit-$command"; do
    test -f ".claude/skills/$skill/SKILL.md" \
      || { echo "::error::skill $skill is missing"; exit 1; }
  done
done

test -f .specify/extensions/artefact-product/agents/relecteur.md \
  || { echo "::error::the agent instructions are not installed"; exit 1; }
