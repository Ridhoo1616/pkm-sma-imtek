# Wadah pengembangan: Go, Node.js, dan MariaDB dalam satu kontainer,
# dipakai oleh GitHub Codespaces agar aplikasi bisa dijalankan langsung
# dari peramban tanpa memasang apa pun di komputer sendiri.
FROM mcr.microsoft.com/devcontainers/go:1-1.24-bookworm

# Node.js untuk frontend Next.js, MariaDB sebagai basis data.
RUN su vscode -c "umask 0002 && . /usr/local/share/nvm/nvm.sh && nvm install --lts && nvm alias default lts/*"

RUN apt-get update \
 && export DEBIAN_FRONTEND=noninteractive \
 && apt-get install -y --no-install-recommends mariadb-server mariadb-client \
 && apt-get clean && rm -rf /var/lib/apt/lists/*
