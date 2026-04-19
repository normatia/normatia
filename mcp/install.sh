#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Normatia MCP Server — Interactive Installer
# Configures the Normatia remote MCP server for your AI editor.
# https://docs.normatia.com/mcp
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

MCP_URL="https://mcp.normatia.com/mcp"

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
write_or_merge() {
  local file="$1"
  local root_key="$2"
  local api_key="$3"

  local new_entry
  new_entry=$(cat <<EOF
{
  "${root_key}": {
    "normatia": {
      "type": "streamable-http",
      "url": "${MCP_URL}",
      "headers": {
        "Authorization": "Bearer ${api_key}"
      }
    }
  }
}
EOF
)

  if [[ -f "$file" ]]; then
    if has_cmd jq; then
      local merged
      merged=$(jq -s --arg key "$root_key" '
        .[0] as $existing | .[1] as $new |
        $existing * { ($key): (($existing[$key] // {}) * $new[$key]) }
      ' "$file" <(echo "$new_entry"))
      echo "$merged" > "$file"
      success "Merged normatia server into existing $file"
    else
      warn "jq not found — cannot merge automatically."
      warn "File already exists: $file"
      printf "  Overwrite? ${DIM}(y/N)${RESET} "
      read -r confirm
      if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo "$new_entry" > "$file"
        success "Wrote $file (overwritten)"
      else
        info "Skipped $file — add the normatia entry manually."
        return
      fi
    fi
  else
    ensure_dir "$(dirname "$file")"
    echo "$new_entry" > "$file"
    success "Created $file"
  fi
}

# ── Client installers ────────────────────────────────────────
install_claude_code() {
  local api_key="$1"
  if ! has_cmd claude; then
    error "Claude Code CLI not found. Install it first:"
    echo "  https://docs.anthropic.com/en/docs/claude-code"
    return 1
  fi
  claude mcp add normatia \
    --transport streamable-http \
    "$MCP_URL" \
    -h "Authorization: Bearer ${api_key}"
  success "Normatia MCP server added to Claude Code"
}

install_cursor() {
  local api_key="$1"
  local file="${HOME}/.cursor/mcp.json"
  write_or_merge "$file" "mcpServers" "$api_key"
}

install_vscode() {
  local api_key="$1"
  local dir="${PWD}/.vscode"
  local file="${dir}/mcp.json"
  write_or_merge "$file" "servers" "$api_key"
}

install_windsurf() {
  local api_key="$1"
  local file="${HOME}/.codeium/windsurf/mcp_config.json"
  write_or_merge "$file" "mcpServers" "$api_key"
}

install_opencode() {
  local api_key="$1"
  local config_dir="${XDG_CONFIG_HOME:-${HOME}/.config}/opencode"
  local file="${config_dir}/config.json"
  write_or_merge "$file" "mcpServers" "$api_key"
}

# ── Main ──────────────────────────────────────────────────────
main() {
  printf "\n${BOLD}Normatia MCP Server — Installer${RESET}\n"
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

  case "$choice" in
    1) client="claude-code" ;;
    2) client="cursor" ;;
    3) client="vscode" ;;
    4) client="windsurf" ;;
    5) client="opencode" ;;
    *)
      error "Invalid choice. Exiting."
      exit 1
      ;;
  esac

  echo ""

  printf "Enter your Normatia API key ${DIM}(sk-normatia-...)${RESET}: "
  read -r api_key

  if [[ -z "$api_key" ]]; then
    error "API key cannot be empty."
    exit 1
  fi

  if [[ ! "$api_key" =~ ^sk-normatia- ]]; then
    warn "Key doesn't start with sk-normatia- — are you sure it's correct?"
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
  info "Documentation: https://docs.normatia.com/mcp"
  echo ""
}

main "$@"
