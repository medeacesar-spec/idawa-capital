#!/bin/bash
# Lance le serveur de développement Next.js avec Node installé localement.
export PATH="$HOME/.local/node/bin:$PATH"
cd /Users/mdegbe/idawa-capital
exec npm run dev -- --port 3300
