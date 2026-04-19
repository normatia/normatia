#!/usr/bin/env bash
# Demonstrates Normatia AI-powered Q&A endpoint usage:
# - Ask about energy efficiency requirements for a residential building in Seville
# - Filter retrieval scope by location and code/version

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
  "query": "¿Qué requisitos de eficiencia energética aplican a la fachada de un edificio residencial en Sevilla?",
  "geo_id": "ES-41091",
  "codes": [
    { "slug": "cte-db-he", "version": "2022" }
  ]
}
JSON
)"

echo
echo "== AI Q&A: Energy efficiency requirements in Seville (CTE DB-HE) =="
# Expected response shape (abbreviated):
# {
#   "answer": "...",
#   "sources": [
#     {"code_slug": "cte-db-he", "version": "2022", "section_title": "...", "url": "..."}
#   ],
#   "references": ["CTE DB-HE ..."],
#   "geo_context": {"geo_id": "ES-41091", "name": "Sevilla", "climate_zone": "B4"}
# }
curl -s -X POST "$BASE_URL/api/v1/ask" \
  -H "Authorization: Bearer $NORMATIA_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$ASK_BODY" \
  | print_json_or_raw
