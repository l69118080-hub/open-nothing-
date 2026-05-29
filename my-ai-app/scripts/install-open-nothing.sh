#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BIN_DIR="$HOME/.local/bin"
TARGET="$BIN_DIR/open-nothing"

mkdir -p "$BIN_DIR"

cat > "$TARGET" <<EOF
#!/usr/bin/env sh
exec node "$ROOT_DIR/bin/open-nothing.js" "\$@"
EOF

chmod +x "$TARGET"

case ":$PATH:" in
  *":$BIN_DIR:"*)
    echo "Installed open-nothing to $TARGET"
    echo "Run: open-nothing dashboard"
    ;;
  *)
    echo "Installed open-nothing to $TARGET"
    echo ""
    echo "Add this to your shell config, then restart the terminal:"
    echo "export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
    echo "For zsh, run:"
    echo "echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.zshrc"
    echo "source ~/.zshrc"
    echo ""
    echo "Then run: open-nothing dashboard"
    ;;
esac
