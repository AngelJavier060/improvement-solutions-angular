#!/bin/sh
set -eu

DOMAIN="improvement-solution.com"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
CERT_FULLCHAIN="${CERT_DIR}/fullchain.pem"
CERT_PRIVKEY="${CERT_DIR}/privkey.pem"

HTTP_CONF="/etc/nginx/conf.available/http.conf"
HTTPS_CONF="/etc/nginx/conf.available/https.conf"
TARGET_CONF="/etc/nginx/conf.d/default.conf"

if [ -f "$CERT_FULLCHAIN" ] && [ -f "$CERT_PRIVKEY" ]; then
  echo "[entrypoint] Certificados encontrados. Activando HTTPS."
  cp "$HTTPS_CONF" "$TARGET_CONF"
else
  echo "[entrypoint] Certificados NO encontrados. Iniciando en HTTP (sin 443)."
  cp "$HTTP_CONF" "$TARGET_CONF"
fi

