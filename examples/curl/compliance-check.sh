#!/usr/bin/env bash
# Demonstrates Normatia Compliance Verification API usage:
# - Verify thermal transmittance (U-value) for a window in Seville
# - Scope the check to CTE DB-HE

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

VERIFY_BODY="$(cat <<'JSON'
{
  "element": "Ventana exterior con carpintería de aluminio con rotura de puente térmico",
  "parameter": "Transmitancia térmica (valor U)",
  "value": 2.3,
  "unit": "W/m2K",
  "geo_id": "ES-41091",
  "codes": [
    { "slug": "cte-db-he", "version": "2022" }
  ],
  "context": "Edificio residencial plurifamiliar en Sevilla, proyecto de rehabilitación, mejora de envolvente exterior."
}
JSON
)"

echo
echo "== Compliance check: Window U-value in Seville (ES-41091) against CTE DB-HE =="
# Expected response shape (abbreviated):
# {
#   "is_compliant": true,
#   "result_status": "compliant",
#   "requirement": "U <= ...",
#   "reference": "CTE DB-HE ...",
#   "explanation": "...",
#   "sources": [{"code_slug": "cte-db-he", "version": "2022", "section_title": "..."}],
#   "geo_context": {"geo_id": "ES-41091", "name": "Sevilla", "climate_zone": "B4"}
# }
curl -s -X POST "$BASE_URL/api/v1/verify" \
  -H "Authorization: Bearer $NORMATIA_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$VERIFY_BODY" \
  | print_json_or_raw
