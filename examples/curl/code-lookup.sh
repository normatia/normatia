#!/usr/bin/env bash
# Demonstrates Normatia Building Codes API usage:
# - Search codes by text query
# - Fetch code detail
# - List code versions
# - Fetch a specific version detail

set -euo pipefail

BASE_URL="${NORMATIA_API_URL:-https://api.normatia.com}"
CODE_SLUG="cte-db-he"
CODE_VERSION="2022"

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
echo "== 1) Search codes by text: ahorro energetico =="
# Expected response shape (abbreviated):
# {
#   "items": [
#     {"slug": "cte-db-he", "title": "CTE DB-HE ...", "normative_scope": "national"}
#   ],
#   "total": 1,
#   "page": 1,
#   "page_size": 5,
#   "total_pages": 1
# }
curl -s --get "$BASE_URL/api/v1/codes/search" \
  -H "Authorization: Bearer $NORMATIA_API_KEY" \
  --data-urlencode "q=ahorro energetico" \
  --data-urlencode "normative_scope=national" \
  --data-urlencode "page=1" \
  --data-urlencode "page_size=5" \
  | print_json_or_raw

echo
echo "== 2) Code detail: ${CODE_SLUG} =="
# Expected response shape (abbreviated):
# {
#   "slug": "cte-db-he",
#   "title": "CTE DB-HE -- Documento Basico de Ahorro de Energia",
#   "documents": [{"version": "2022", "status": "active"}, {"version": "2019", "status": "repealed"}]
# }
curl -s "$BASE_URL/api/v1/codes/$CODE_SLUG" \
  -H "Authorization: Bearer $NORMATIA_API_KEY" \
  | print_json_or_raw

echo
echo "== 3) List versions: ${CODE_SLUG} =="
# Expected response shape (abbreviated):
# {
#   "items": [
#     {"version": "2022", "status": "active", "published_date": "2022-06-27"},
#     {"version": "2019", "status": "repealed", "published_date": "2019-12-27"}
#   ]
# }
curl -s "$BASE_URL/api/v1/codes/$CODE_SLUG/versions" \
  -H "Authorization: Bearer $NORMATIA_API_KEY" \
  | print_json_or_raw

echo
echo "== 4) Version detail: ${CODE_SLUG} ${CODE_VERSION} =="
# Expected response shape (abbreviated):
# {
#   "slug": "cte-db-he",
#   "version": "2022",
#   "status": "active",
#   "sections": [{"slug": "he1", "title": "HE 1 ...", "order": 20}]
# }
curl -s "$BASE_URL/api/v1/codes/$CODE_SLUG/versions/$CODE_VERSION" \
  -H "Authorization: Bearer $NORMATIA_API_KEY" \
  | print_json_or_raw
