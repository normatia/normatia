#!/usr/bin/env bash
# Demonstrates a compliance check with Normatia's agentic Q&A endpoint:
# - Ask, in plain words, whether a window U-value complies with the CTE DB-HE
#   on the active project
# - The answer gives the limit, the section that sets it and the verdict,
#   with its sources
#
# The scope comes from the project (municipality, climate zone, selected
# regulations), so there is no geo_id or code filter to pass. Add "project_id"
# to the body to target a project other than the active one.
#
# Each call costs 5 credits of the organization's balance, nothing if it fails.
# Without enough credits the API answers 402 insufficient_credits.

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

ASK_BODY="$(cat <<'JSON'
{
  "query": "Una ventana exterior de aluminio con rotura de puente térmico tiene una transmitancia U = 2,3 W/m²K. ¿Cumple el CTE DB-HE en mi proyecto? Dime el valor límite, el apartado que lo fija y si cumple."
}
JSON
)"

echo
echo "== Compliance check: window U-value against CTE DB-HE, on the active project =="
# A turn is capped server-side at 120 s, so give curl margin: cutting the
# request early does not stop the turn, it just throws the answer away.
#
# Expected response shape (abbreviated):
# {
#   "answer": "... el límite es ... [1] ... cumple ...",
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
