#!/usr/bin/env bash

# Publora CLI launcher for Unix/Linux
# Forwards all arguments to publora.js

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/publora.js" "$@" 