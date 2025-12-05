#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install LTS node if not present
nvm install --lts

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

cd web_app/frontend || exit 1

echo "Cleaning old artifacts..."
rm -rf node_modules package-lock.json

echo "Installing dependencies..."
npm install

echo "Building..."
npm run build
