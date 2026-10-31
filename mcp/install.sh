#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Normatia MCP Server: interactive installer
# Configures the Normatia remote MCP server for your AI editor.
# https://docs.normatia.com/mcp/
# ──────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colors ────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
RESET='\033[0m'

MCP_URL="https://mcp.normatia.com/mcp/"

# ── Helpers ───────────────────────────────────────────────────
info()    { printf "${CYAN}ℹ${RESET}  %s\n" "$1"; }
success() { printf "${GREEN}✔${RESET}  %s\n" "$1"; }
warn()    { printf "${YELLOW}⚠${RESET}  %s\n" "$1"; }
error()   { printf "${RED}✖${RESET}  %s\n" "$1" >&2; }

has_cmd() { command -v "$1" &>/dev/null; }

ensure_dir() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    mkdir -p "$dir"
    info "Created directory: $dir"
  fi
}

# ── JSON merge (jq) or raw write ─────────────────────────────
# $1 file, $2 root key, $3 JSON object for the "normatia" entry,
# $4 optional JSON array of VS Code "inputs" to add.
write_or_merge() {
  local file="$1"
  local root_key="$2"
  local entry="$3"
  local inputs="${4:-}"

  local new_config
  if [[ -n "$inputs" ]]; then
    new_config="{\"inputs\": ${inputs}, \"${root_key}\": {\"normatia\": ${entry}}}"
  else
    new_config="{\"${root_key}\": {\"normatia\": ${entry}}}"
  fi

  if [[ -f "$file" ]]; then
    if has_cmd jq; then
      local merged
      merged=$(jq -s --arg key "$root_key" '
        .[0] as $existing | .[1] as $new |
        ($existing * { ($key): (($existing[$key] // {}) * $new[$key]) })
        | if $new.inputs then
            .inputs = ((($existing.inputs // []) | map(select(.id != "normatia-api-key"))) + $new.inputs)
          else . end
      ' "$file" <(echo "$new_config"))
      echo "$merged" > "$file"
      success "Merged normatia server into existing $file"
    else
      warn "jq not found: cannot merge automatically."
      warn "File already exists: $file"
      printf "  Overwrite? ${DIM}(y/N)${RESET} "
      read -r confirm
      if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo "$new_config" > "$file"
        success "Wrote $file (overwritten)"
      else
        info "Skipped $file: add the normatia entry manually."
        return
      fi
    fi
  else
    ensure_dir "$(dirname "$file")"
    echo "$new_config" > "$file"
    success "Created $file"
  fi
}

# JSON for the Authorization header, or nothing when the client signs in with OAuth.
headers_json() {
  local api_key="$1"
  if [[ -n "$api_key" ]]; then
    printf ', "headers": {"Authorization": "Bearer %s"}' "$api_key"
  fi
}

# ── Client installers ────────────────────────────────────────
install_claude_code() {
  local api_key="$1"
  if ! has_cmd claude; then
    error "Claude Code CLI not found. Install it first:"
    echo "  https://code.claude.com/docs"
    return 1
  fi
  if [[ -n "$api_key" ]]; then
    claude mcp add --transport http normatia "$MCP_URL" \
      --header "Authorization: Bearer ${api_key}"
  else
    claude mcp add --transport http normatia "$MCP_URL"
    info "Run /mcp inside Claude Code and sign in to Normatia."
  fi
  success "Normatia MCP server added to Claude Code"
}

install_cursor() {
  local api_key="$1"
  local file="${HOME}/.cursor/mcp.json"
  write_or_merge "$file" "mcpServers" "{\"url\": \"${MCP_URL}\"$(headers_json "$api_key")}"
}

install_vscode() {
  local api_key="$1"
  local file="${PWD}/.vscode/mcp.json"
  if [[ -n "$api_key" ]]; then
    # The key is not written to the workspace: VS Code asks for it on first
    # start and keeps it in its secret storage.
    warn "VS Code will ask for your API key when the server starts; it is not written to $file."
    write_or_merge "$file" "servers" \
      "{\"type\": \"http\", \"url\": \"${MCP_URL}\", \"headers\": {\"Authorization\": \"Bearer \${input:normatia-api-key}\"}}" \
      '[{"type": "promptString", "id": "normatia-api-key", "description": "Normatia API key (sk-normatia-...)", "password": true}]'
  else
    write_or_merge "$file" "servers" "{\"type\": \"http\", \"url\": \"${MCP_URL}\"}"
    info "VS Code will open the Normatia sign-in the first time the server starts."
  fi
}

install_windsurf() {
  local api_key="$1"
  local file="${HOME}/.codeium/windsurf/mcp_config.json"
  write_or_merge "$file" "mcpServers" "{\"serverUrl\": \"${MCP_URL}\"$(headers_json "$api_key")}"
}

install_opencode() {
  local api_key="$1"
  local config_dir="${XDG_CONFIG_HOME:-${HOME}/.config}/opencode"
  local file="${config_dir}/opencode.json"
  write_or_merge "$file" "mcp" "{\"type\": \"remote\", \"url\": \"${MCP_URL}\", \"enabled\": true$(headers_json "$api_key")}"
  if [[ -z "$api_key" ]]; then
    info "Run: opencode mcp auth normatia"
  fi
}

# ── Main ──────────────────────────────────────────────────────
main() {
  printf "\n${BOLD}Normatia MCP Server: installer${RESET}\n"
  printf "${DIM}Configure the remote MCP server for your AI editor.${RESET}\n\n"

  echo "Select your AI editor:"
  echo ""
  echo "  1) Claude Code"
  echo "  2) Cursor"
  echo "  3) VS Code / GitHub Copilot"
  echo "  4) Windsurf"
  echo "  5) OpenCode"
  echo ""
  printf "Choice ${DIM}(1-5)${RESET}: "
  read -r choice

  local oauth_ok=false
  case "$choice" in
    1) client="claude-code"; oauth_ok=true ;;
    2) client="cursor" ;;
    3) client="vscode"; oauth_ok=true ;;
    4) client="windsurf" ;;
    5) client="opencode"; oauth_ok=true ;;
    *)
      error "Invalid choice. Exiting."
      exit 1
      ;;
  esac

  echo ""

  if [[ "$oauth_ok" == true ]]; then
    printf "Enter your Normatia API key ${DIM}(sk-normatia-..., or leave empty to sign in with OAuth)${RESET}: "
  else
    printf "Enter your Normatia API key ${DIM}(sk-normatia-...)${RESET}: "
  fi
  read -r api_key

  if [[ -z "$api_key" && "$oauth_ok" != true ]]; then
    error "API key cannot be empty for this editor."
    exit 1
  fi

  if [[ -n "$api_key" && ! "$api_key" =~ ^sk-normatia-[0-9a-f]{64}$ ]]; then
    warn "Key doesn't look like sk-normatia- followed by 64 hex characters. Are you sure it's correct?"
    printf "  Continue anyway? ${DIM}(y/N)${RESET} "
    read -r confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
      info "Aborted."
      exit 0
    fi
  fi

  echo ""

  case "$client" in
    claude-code) install_claude_code "$api_key" ;;
    cursor)      install_cursor "$api_key" ;;
    vscode)      install_vscode "$api_key" ;;
    windsurf)    install_windsurf "$api_key" ;;
    opencode)    install_opencode "$api_key" ;;
  esac

  echo ""
  info "Documentation: https://docs.normatia.com/mcp/"
  echo ""
}

main "$@"
