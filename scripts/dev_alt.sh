#!/bin/bash
# Serveur de VÉRIFICATION, sur un port distinct du serveur de développement.
# Next 16 refuse deux `next dev` dans le même dossier : on sert donc la build de
# production, ce qui permet de contrôler un écran pendant qu'une autre session
# occupe le port 3300. Lancer `npm run build` avant.
export PATH="$HOME/.local/node/bin:$PATH"
cd /Users/mdegbe/idawa-capital
exec npm run start -- --port 3301
