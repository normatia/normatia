#!/usr/bin/env bash
# Demonstrates Normatia's agentic Q&A endpoint:
# - List the projects the API key can reach
# - Ask a regulatory question scoped to one of them
#
# The scope of a query comes from its project (municipality + selected
# regulations + uploaded documents), so there is no geo_id or code filter to
# pass. Omit project_id to use the user's active project.

set -euo pipefail

BASE_URL="${NORMATIA_API_URL:-https://api.normatia.com}"

if [[ -z "${NORMATIA_API_KEY:-}" ]]; then
  echo "Error: NORMATIA_API_KEY is not set." >&2
  echo "Set it first: export NORMATIA_API_KEY='sk-normatia-...'" >&2
  exit 1
fi

print_json_or_raw() {
  local raw
  raw="$(cat)"

  if command -v jq >/dev/null 2>&1; then
    printf '%s\n' "$raw" | jq . 2>/dev/null || printf '%s\n' "$raw"
  else
    printf '%s\n' "$raw"
  fi
}

echo
echo "== Projects reachable with this key =="
# Expected response shape (abbreviated):
# {
#   "projects": [
#     {"project_id": "...", "name": "...", "location": "Sevilla", "is_active": true}
#   ],
#   "total": 1
# }
curl -s "$BASE_URL/api/v1/projects" \
  -H "Authorization: Bearer $NORMATIA_API_KEY" \
  | print_json_or_raw

ASK_BODY="$(cat <<'JSON'
{
  "query": "¿Qué requisitos de eficiencia energética aplican a la fachada de mi edificio?"
}
JSON
)"

echo
echo "== Agentic Q&A on the active project =="
echo "   (add \"project_id\" to the body to target a different project)"
# A turn is capped server-side at 120 s, so give curl margin: cutting the
# request early does not stop the turn, it just throws the answer away.
#
# Expected response shape (abbreviated):
# {
#   "answer": "... [1] ...",
#   "sources": [
#     {"index": 1, "citation_type": "article", "document_title": "CTE DB-HE ...",
#      "section_title": "...", "block_title": "...", "url": "..."}
#   ],
#   "project": {"project_id": "...", "geo_id": "ES-41091", "location": "Sevilla"},
#   "iterations": 3,
#   "searches": 2
# }
curl -s --max-time 150 -X POST "$BASE_URL/api/v2/ask" \
  -H "Authorization: Bearer $NORMATIA_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$ASK_BODY" \
  | print_json_or_raw
