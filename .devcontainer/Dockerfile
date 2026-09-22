# Wadah pengembangan: PHP 8.2 + MariaDB dalam satu kontainer,
# dipakai oleh GitHub Codespaces agar aplikasi bisa dijalankan
# langsung dari browser tanpa memasang XAMPP.
FROM mcr.microsoft.com/devcontainers/php:1-8.2-bookworm

RUN apt-get update \
 && export DEBIAN_FRONTEND=noninteractive \
 && apt-get install -y --no-install-recommends mariadb-server mariadb-client \
 && apt-get clean && rm -rf /var/lib/apt/lists/*
