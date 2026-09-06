#!/usr/bin/env bash
# AS Adventurer Creator — portable Linux launcher
# Drop this in the repo root. Works on Debian/Ubuntu, Fedora, and Arch.
# Usage:
#   ./launch.sh            setup if needed, then start
#   ./launch.sh setup      install runtime + npm deps only
#   ./launch.sh update     git pull this fork, reinstall deps, start
#   ./launch.sh start      start only (fails if setup was never run)

set -euo pipefail

APP_NAME="AS Adventurer Creator"
APP_HINT="Open http://localhost:3001 in your browser"
APP_HINT2=""
NODE_MIN_MAJOR=18
NODE_PORTABLE_VERSION="20.18.0"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

RUNTIME_DIR="$ROOT/runtime"
NODE_BIN=""
NPM_BIN=""

log()  { printf '  %s\n' "$*"; }
ok()   { printf '  [OK] %s\n' "$*"; }
step() { printf '\n  >> %s\n' "$*"; }
die()  { printf '\n  [ERROR] %s\n\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

usage() {
  cat <<EOF

  $APP_NAME — Linux launcher
  ============================================
  ./launch.sh            setup if needed, then start
  ./launch.sh setup      install Node + npm deps only
  ./launch.sh update     git pull, reinstall deps, start
  ./launch.sh start      start without installing

  Put this script in the repo root (next to package.json
  and server.js) and run it from anywhere.

EOF
}

need_repo_root() {
  [[ -f "$ROOT/package.json" && -f "$ROOT/server.js" ]] || \
    die "launch.sh must live in the repo root (missing package.json or server.js).
  Current directory: $ROOT"
}

sudo_cmd() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif have sudo; then
    sudo "$@"
  else
    return 1
  fi
}

detect_pkg_manager() {
  if have apt-get; then echo apt
  elif have dnf; then echo dnf
  elif have yum; then echo yum
  elif have pacman; then echo pacman
  else echo none
  fi
}

# Install only packages that are actually missing.
install_system_packages() {
  local needed=() pkg
  for pkg in "$@"; do
    case "$pkg" in
      curl) have curl || needed+=("$pkg") ;;
      wget) have wget || needed+=("$pkg") ;;
      tar)  have tar  || needed+=("$pkg") ;;
      git)  have git  || needed+=("$pkg") ;;
      ca-certificates)
        [[ -d /etc/ssl/certs ]] || needed+=("$pkg")
        ;;
      nodejs)
        have node || needed+=("$pkg")
        ;;
      npm)
        have npm || needed+=("$pkg")
        ;;
      *)
        needed+=("$pkg")
        ;;
    esac
  done
  [[ ${#needed[@]} -eq 0 ]] && return 0

  local pm
  pm="$(detect_pkg_manager)"
  step "Installing system packages: ${needed[*]}"
  case "$pm" in
    apt)
      sudo_cmd apt-get update -y || return 1
      sudo_cmd apt-get install -y "${needed[@]}"
      ;;
    dnf)
      sudo_cmd dnf install -y "${needed[@]}"
      ;;
    yum)
      sudo_cmd yum install -y "${needed[@]}"
      ;;
    pacman)
      local arch_pkgs=()
      for pkg in "${needed[@]}"; do
        case "$pkg" in
          ca-certificates) arch_pkgs+=("ca-certificates") ;;
          *) arch_pkgs+=("$pkg") ;;
        esac
      done
      sudo_cmd pacman -Sy --noconfirm --needed "${arch_pkgs[@]}"
      ;;
    *)
      log "No supported package manager found (apt/dnf/yum/pacman)."
      return 1
      ;;
  esac
}

node_major() {
  local ver
  ver="$("$1" -p "process.versions.node.split('.')[0]" 2>/dev/null || true)"
  [[ "$ver" =~ ^[0-9]+$ ]] && echo "$ver" || echo 0
}

pick_existing_node() {
  local candidate major

  if [[ -x "$RUNTIME_DIR/bin/node" ]]; then
    major="$(node_major "$RUNTIME_DIR/bin/node")"
    if [[ "$major" -ge "$NODE_MIN_MAJOR" ]]; then
      NODE_BIN="$RUNTIME_DIR/bin/node"
      if [[ -x "$RUNTIME_DIR/bin/npm" ]]; then
        NPM_BIN="$RUNTIME_DIR/bin/npm"
      else
        NPM_BIN="$NODE_BIN $RUNTIME_DIR/lib/node_modules/npm/bin/npm-cli.js"
      fi
      return 0
    fi
  fi

  if have node; then
    candidate="$(command -v node)"
    major="$(node_major "$candidate")"
    if [[ "$major" -ge "$NODE_MIN_MAJOR" ]]; then
      NODE_BIN="$candidate"
      if have npm; then
        NPM_BIN="$(command -v npm)"
      else
        NPM_BIN=""
      fi
      return 0
    else
      log "System Node $($candidate -v) is too old (need v${NODE_MIN_MAJOR}+). Will use a portable runtime."
    fi
  fi
  return 1
}

node_arch() {
  case "$(uname -m)" in
    x86_64|amd64) echo "linux-x64" ;;
    aarch64|arm64) echo "linux-arm64" ;;
    armv7l) echo "linux-armv7l" ;;
    *) die "Unsupported CPU arch: $(uname -m). Need x86_64, arm64, or armv7l." ;;
  esac
}

download() {
  local url="$1" dest="$2"
  if have curl; then
    curl -fsSL "$url" -o "$dest"
  elif have wget; then
    wget -q "$url" -O "$dest"
  else
    return 1
  fi
}

install_portable_node() {
  local arch tarball url tmpdir extracted
  arch="$(node_arch)"
  tarball="node-v${NODE_PORTABLE_VERSION}-${arch}.tar.gz"
  url="https://nodejs.org/dist/v${NODE_PORTABLE_VERSION}/${tarball}"

  step "Fetching portable Node.js v${NODE_PORTABLE_VERSION} (${arch})"
  log "This stays inside $RUNTIME_DIR — no system install."

  have curl || have wget || install_system_packages curl ca-certificates || true
  have tar || install_system_packages tar || true
  have curl || have wget || die "Need curl or wget to download Node.js."
  have tar || die "Need tar to unpack Node.js."

  mkdir -p "$RUNTIME_DIR"
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' RETURN

  download "$url" "$tmpdir/$tarball" || die "Failed to download $url"
  tar -xzf "$tmpdir/$tarball" -C "$tmpdir"
  extracted="$(find "$tmpdir" -maxdepth 1 -type d -name "node-v${NODE_PORTABLE_VERSION}-*" | head -n1)"
  [[ -n "$extracted" ]] || die "Unpack failed."

  mkdir -p "$RUNTIME_DIR"
  cp -a "$extracted"/. "$RUNTIME_DIR/"

  [[ -x "$RUNTIME_DIR/bin/node" ]] || die "Portable Node.js extract looks broken."
  ok "Portable Node.js $($RUNTIME_DIR/bin/node -v) ready in runtime/"
}

ensure_fetch_tools() {
  if have curl || have wget; then
    return 0
  fi
  install_system_packages curl ca-certificates || \
    log "Could not install curl automatically. Portable Node download will fail without it."
}

ensure_node() {
  if pick_existing_node; then
    ok "Using Node $($NODE_BIN -v) ($NODE_BIN)"
    return 0
  fi

  step "Node.js v${NODE_MIN_MAJOR}+ not found"
  if install_system_packages nodejs npm; then
    if pick_existing_node; then
      ok "Using distro Node $($NODE_BIN -v)"
      return 0
    fi
    log "Distro Node is missing or too old. Falling back to a portable runtime."
  else
    log "Skipping distro Node install (no sudo / no package manager). Using portable runtime."
  fi

  install_portable_node
  pick_existing_node || die "Node.js is still not available after install."
  ok "Using Node $($NODE_BIN -v) ($NODE_BIN)"
}

run_npm() {
  [[ -n "$NPM_BIN" ]] || die "npm not found. Re-run ./launch.sh setup"
  # NPM_BIN may be a single path or "node npm-cli.js"
  # shellcheck disable=SC2086
  PATH="$(dirname "$NODE_BIN"):$PATH" $NPM_BIN "$@"
}

ensure_npm_deps() {
  local force="${1:-0}"
  if [[ "$force" != "1" && -d "$ROOT/node_modules/express" ]]; then
    ok "npm dependencies already present"
    return 0
  fi
  step "Installing npm packages (production)"
  run_npm install --omit=dev || run_npm install
  ok "npm install finished"
}

maybe_placeholders() {
  return 0
}

do_update() {
  step "Updating from git remote"
  have git || install_system_packages git || true
  have git || die "git is required for update. Install git and re-run."
  [[ -d "$ROOT/.git" ]] || die "This folder is not a git clone, so there is nothing to pull.
  Clone your fork first, then run ./launch.sh update from that clone."

  if [[ -n "$(git status --porcelain 2>/dev/null || true)" ]]; then
    log "Working tree has local changes. Pull will use --ff-only and may stop."
  fi

  git pull --ff-only || die "git pull failed (non-fast-forward or local changes).
  Resolve that in this repo, then re-run ./launch.sh update"
  ok "Repo is up to date ($(git rev-parse --short HEAD))"
}

start_app() {
  [[ -x "$NODE_BIN" || -n "$NODE_BIN" ]] || die "Node is not set up. Run ./launch.sh setup"
  [[ -f "$ROOT/server.js" ]] || die "server.js missing."
  printf '\n  ============================================\n'
  printf '   %s — starting\n' "$APP_NAME"
  printf '  ============================================\n\n'
  log "$APP_HINT"
  [[ -n "${APP_HINT2:-}" ]] && log "$APP_HINT2"
  log "Press Ctrl+C to stop."
  printf '\n'
  exec "$NODE_BIN" "$ROOT/server.js"
}

banner() {
  printf '\n  ============================================\n'
  printf '   %s — Linux launcher\n' "$APP_NAME"
  printf '  ============================================\n'
  log "Repo root: $ROOT"
}

main() {
  local cmd="${1:-run}"
  case "$cmd" in
    -h|--help|help) usage; exit 0 ;;
    setup|update|start|run) ;;
    *) usage; die "Unknown command: $cmd" ;;
  esac

  banner
  need_repo_root

  case "$cmd" in
    start)
      pick_existing_node || die "Node.js not found. Run ./launch.sh (or ./launch.sh setup) first."
      [[ -d "$ROOT/node_modules" ]] || die "Dependencies missing. Run ./launch.sh setup first."
      start_app
      ;;
    setup)
      ensure_fetch_tools
      ensure_node
      ensure_npm_deps 0
      maybe_placeholders
      printf '\n'
      ok "Setup complete. Run ./launch.sh to start."
      printf '\n'
      ;;
    update)
      ensure_fetch_tools
      do_update
      ensure_node
      ensure_npm_deps 1
      maybe_placeholders
      start_app
      ;;
    run)
      ensure_fetch_tools
      ensure_node
      ensure_npm_deps 0
      maybe_placeholders
      start_app
      ;;
  esac
}

main "${1:-run}"
