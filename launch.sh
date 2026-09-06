#!/usr/bin/env bash
# AS Adventurer Creator — portable Linux TUI launcher
# Lives in the repo root. Works on Debian/Ubuntu, Fedora, and Arch.
#
# Double-click or run from a terminal. If launched from a file manager
# with no tty, this opens a terminal window. The app runs in that
# window — close it (or Ctrl+C) and the server dies with it.

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
SELF="$ROOT/launch.sh"

log()  { printf '  %s\n' "$*"; }
ok()   { printf '  [OK] %s\n' "$*"; }
step() { printf '\n  >> %s\n' "$*"; }
warn() { printf '  [!] %s\n' "$*"; }
die()  { printf '\n  [ERROR] %s\n\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

need_repo_root() {
  [[ -f "$ROOT/package.json" && -f "$ROOT/server.js" ]] || \
    die "launch.sh must live in the repo root (missing package.json or server.js).
  Current directory: $ROOT"
}

open_in_terminal() {
  [[ -n "${LAUNCH_SH_IN_TERM:-}" ]] && return 0
  if [[ -t 0 && -t 1 ]]; then
    return 0
  fi

  export LAUNCH_SH_IN_TERM=1
  local title="AS-Adventurer-Creator"

  local runners=(
    "konsole --title ${title} -e"
    "gnome-terminal --title=${title} --"
    "xfce4-terminal --title=${title} -e"
    "mate-terminal --title=${title} -e"
    "tilix --title=${title} -e"
    "kitty --title ${title}"
    "alacritty --title ${title} -e"
    "wezterm start --"
    "foot -T ${title}"
    "xterm -T ${title} -e"
    "urxvt -title ${title} -e"
    "lxterminal -t ${title} -e"
    "terminator -T ${title} -e"
    "kgx --"
  )

  local r cmd
  for r in "${runners[@]}"; do
    cmd="${r%% *}"
    have "$cmd" || continue
    # shellcheck disable=SC2086
    exec $r bash "$SELF" "$@"
  done

  local msg="No terminal emulator found. Install Konsole (or gnome-terminal, kitty, xterm) and run: bash \"$SELF\""
  if have kdialog; then
    kdialog --error "$msg" || true
  elif have zenity; then
    zenity --error --text="$msg" || true
  fi
  die "$msg"
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
      nodejs) have node || needed+=("$pkg") ;;
      npm)    have npm  || needed+=("$pkg") ;;
      *)      needed+=("$pkg") ;;
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
    dnf) sudo_cmd dnf install -y "${needed[@]}" ;;
    yum) sudo_cmd yum install -y "${needed[@]}" ;;
    pacman)
      sudo_cmd pacman -Sy --noconfirm --needed "${needed[@]}"
      ;;
    *)
      warn "No supported package manager found (apt/dnf/yum/pacman)."
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
  NODE_BIN=""
  NPM_BIN=""

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
    fi
  fi
  return 1
}

app_ready() {
  pick_existing_node || return 1
  [[ -d "$ROOT/node_modules/express" && -f "$ROOT/server.js" ]]
}

node_arch() {
  case "$(uname -m)" in
    x86_64|amd64) echo "linux-x64" ;;
    aarch64|arm64) echo "linux-arm64" ;;
    armv7l) echo "linux-armv7l" ;;
    *) echo "" ;;
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
  [[ -n "$arch" ]] || { warn "Unsupported CPU arch: $(uname -m)"; return 1; }
  tarball="node-v${NODE_PORTABLE_VERSION}-${arch}.tar.gz"
  url="https://nodejs.org/dist/v${NODE_PORTABLE_VERSION}/${tarball}"

  step "Fetching portable Node.js v${NODE_PORTABLE_VERSION} (${arch})"
  log "This stays inside $RUNTIME_DIR — no system install."

  have curl || have wget || install_system_packages curl ca-certificates || true
  have tar || install_system_packages tar || true
  have curl || have wget || { warn "Need curl or wget to download Node.js."; return 1; }
  have tar || { warn "Need tar to unpack Node.js."; return 1; }

  mkdir -p "$RUNTIME_DIR"
  tmpdir="$(mktemp -d)"
  # shellcheck disable=SC2064
  trap "rm -rf '$tmpdir'" RETURN

  download "$url" "$tmpdir/$tarball" || { warn "Failed to download $url"; return 1; }
  tar -xzf "$tmpdir/$tarball" -C "$tmpdir"
  extracted="$(find "$tmpdir" -maxdepth 1 -type d -name "node-v${NODE_PORTABLE_VERSION}-*" | head -n1)"
  [[ -n "$extracted" ]] || { warn "Unpack failed."; return 1; }

  cp -a "$extracted"/. "$RUNTIME_DIR/"
  [[ -x "$RUNTIME_DIR/bin/node" ]] || { warn "Portable Node.js extract looks broken."; return 1; }
  ok "Portable Node.js $($RUNTIME_DIR/bin/node -v) ready in runtime/"
}

ensure_fetch_tools() {
  if have curl || have wget; then
    return 0
  fi
  install_system_packages curl ca-certificates || \
    warn "Could not install curl automatically."
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

  install_portable_node || return 1
  pick_existing_node || { warn "Node.js is still not available after install."; return 1; }
  ok "Using Node $($NODE_BIN -v) ($NODE_BIN)"
}

run_npm() {
  [[ -n "$NPM_BIN" ]] || { warn "npm not found."; return 1; }
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
}

maybe_placeholders() {
  return 0
}

do_git_pull() {
  if ! have git; then
    install_system_packages git || true
  fi
  if ! have git; then
    warn "git is not installed; skipped repo update."
    return 0
  fi
  if [[ ! -d "$ROOT/.git" ]]; then
    warn "This folder is not a git clone; skipped git pull."
    return 0
  fi

  step "Updating from git remote"
  if [[ -n "$(git status --porcelain 2>/dev/null || true)" ]]; then
    warn "Working tree has local changes. Pull is --ff-only and may stop."
  fi
  if git pull --ff-only; then
    ok "Repo is up to date ($(git rev-parse --short HEAD))"
  else
    warn "git pull failed (non-fast-forward or local changes). Install still ran locally."
    return 1
  fi
}

pause() {
  printf '\n  Press Enter to return to the menu.'
  read -r _ || true
}

do_install_update() {
  printf '\n'
  log "Install / Update"
  log "--------------------------------------------"
  ensure_fetch_tools
  do_git_pull || true
  ensure_node || { warn "Node install failed."; pause; return 1; }
  ensure_npm_deps 1 || { warn "npm install failed."; pause; return 1; }
  maybe_placeholders
  printf '\n'
  ok "Install / Update finished."
  pause
}

do_launch() {
  if ! app_ready; then
    warn "No usable build yet. Run Install / Update first."
    pause
    return 0
  fi

  printf '\n'
  log "============================================"
  log "$APP_NAME — running in this window"
  log "============================================"
  log "$APP_HINT"
  [[ -n "${APP_HINT2:-}" ]] && log "$APP_HINT2"
  log "Close this terminal or press Ctrl+C to stop."
  printf '\n'

  set +e
  "$NODE_BIN" "$ROOT/server.js"
  local rc=$?
  set -e

  printf '\n'
  if [[ $rc -eq 130 || $rc -eq 143 ]]; then
    ok "Stopped."
  elif [[ $rc -ne 0 ]]; then
    warn "Server exited with code $rc."
  else
    ok "Server exited."
  fi
  pause
}

short_path() {
  local p="$1"
  if [[ ${#p} -gt 42 ]]; then
    printf '…%s' "${p: -41}"
  else
    printf '%s' "$p"
  fi
}

draw_menu() {
  local ready_label status
  if app_ready; then
    status="ready to launch"
    ready_label="[1]  Launch"
  else
    status="not installed yet"
    ready_label="[1]  Launch   (unavailable — install first)"
  fi

  clear 2>/dev/null || printf '\n'
  cat <<EOF

  ┌──────────────────────────────────────────────┐
  │  ${APP_NAME}
  │  $(short_path "$ROOT")
  ├──────────────────────────────────────────────┤
  │  Status: ${status}
  │
  │  ${ready_label}
  │  [2]  Install / Update
  │  [q]  Quit
  └──────────────────────────────────────────────┘

  Close this window to kill anything it started.

EOF
  printf '  Choose: '
}

tui_loop() {
  local choice
  while true; do
    draw_menu
    if ! read -r choice; then
      printf '\n'
      exit 0
    fi
    case "$choice" in
      1)
        do_launch
        ;;
      2)
        do_install_update
        ;;
      q|Q|quit|exit|3)
        printf '\n'
        exit 0
        ;;
      *)
        warn "Unknown choice."
        sleep 0.6
        ;;
    esac
  done
}

usage() {
  cat <<EOF

  $APP_NAME — Linux TUI launcher

  ./launch.sh              open the menu (spawns a terminal if needed)
  ./launch.sh menu         same
  ./launch.sh launch       start the app in this terminal
  ./launch.sh setup        install / update, then return
  ./launch.sh --help

  Double-click from a file manager is fine: a terminal window opens
  and the server is tied to that window.

EOF
}

main() {
  local cmd="${1:-menu}"
  case "$cmd" in
    -h|--help|help) usage; exit 0 ;;
  esac

  need_repo_root
  open_in_terminal "$@"

  case "$cmd" in
    launch|start)
      if ! app_ready; then
        die "Not installed yet. Run ./launch.sh and pick Install / Update."
      fi
      do_launch
      ;;
    setup|update|install)
      do_install_update
      ;;
    menu|run|"")
      tui_loop
      ;;
    *)
      usage
      die "Unknown command: $cmd"
      ;;
  esac
}

main "${1:-menu}"
