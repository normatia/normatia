#!/usr/bin/env bash
# Demonstrates Normatia Location Search API usage:
# - Text search
# - Search filtered by level
# - Search filtered by ancestor geography
# - Full location detail lookup

set -euo pipefail

BASE_URL="${NORMATIA_API_URL:-https://api.normatia.com}"

if [[ -z "${NORMATIA_API_KEY:-}" ]]; then
  echo "Error: NORMATIA_API_KEY is not set." >&2
  echo "Set it first: export NORMATIA_API_KEY='sk-normatia-... '" >&2
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
echo "== 1) Basic search: Sevilla =="
# Expected response shape (abbreviated):
# {
#   "results": [
#     {"geo_id": "ES-41091", "name": "Sevilla", "level": "municipality"}
#   ]
# }
curl -s --get "$BASE_URL/api/v1/location/search" \
  -H "Authorization: Bearer $NORMATIA_API_KEY" \
  --data-urlencode "q=Sevilla" \
  | print_json_or_raw

echo
echo "== 2) Filter by level: municipality =="
# Expected response shape (abbreviated):
# {
#   "results": [
#     {"geo_id": "ES-41091", "name": "Sevilla", "level": "municipality"},
#     {"geo_id": "ES-41038", "name": "Dos Hermanas", "level": "municipality"}
#   ]
# }
curl -s --get "$BASE_URL/api/v1/location/search" \
  -H "Authorization: Bearer $NORMATIA_API_KEY" \
  --data-urlencode "q=Sevilla" \
  --data-urlencode "level=municipality" \
  | print_json_or_raw

echo
echo "== 3) Filter by ancestor_id: municipalities inside Sevilla province (ES-41) =="
# Expected response shape (abbreviated):
# {
#   "results": [
#     {"geo_id": "ES-41060", "name": "Mairena del Aljarafe", "level": "municipality"}
#   ]
# }
curl -s --get "$BASE_URL/api/v1/location/search" \
  -H "Authorization: Bearer $NORMATIA_API_KEY" \
  --data-urlencode "q=Mairena del Aljarafe" \
  --data-urlencode "ancestor_id=ES-41" \
  --data-urlencode "level=municipality" \
  | print_json_or_raw

echo
echo "== 4) Location detail: ES-41091 (Sevilla municipality) =="
# Expected response shape (abbreviated):
# {
#   "geo_id": "ES-41091",
#   "name": "Sevilla",
#   "level": "municipality",
#   "tech_data": {"climate_zone": "B4", "...": "..."},
#   "applicable_codes": [{"slug": "cte-db-he", "normative_scope": "national"}]
# }
curl -s "$BASE_URL/api/v1/location/ES-41091" \
  -H "Authorization: Bearer $NORMATIA_API_KEY" \
  | print_json_or_raw
