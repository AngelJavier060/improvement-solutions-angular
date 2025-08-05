#!/bin/bash

# Script para configurar SSL con Let's Encrypt para improvement-solution.com

echo "🔒 Configurando SSL para improvement-solution.com..."

# Instalar certbot si no está instalado
if ! command -v certbot &> /dev/null; then
    echo "📦 Instalando Certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
fi

# Detener nginx temporalmente
echo "⏹️ Deteniendo nginx..."
systemctl stop nginx 2>/dev/null || docker-compose stop frontend

# Obtener certificado SSL
echo "🛡️ Obteniendo certificado SSL..."
certbot certonly --standalone \
    --email admin@improvement-solution.com \
    --agree-tos \
    --no-eff-email \
    -d improvement-solution.com \
    -d www.improvement-solution.com

# Verificar que el certificado se creó correctamente
if [ -f "/etc/letsencrypt/live/improvement-solution.com/fullchain.pem" ]; then
    echo "✅ Certificado SSL obtenido exitosamente!"
    
    # Configurar renovación automática
    echo "🔄 Configurando renovación automática..."
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    echo "🚀 Reiniciando servicios..."
    cd /opt/improvement-solutions-angular
    docker-compose up -d
    
    echo "✅ ¡Configuración SSL completada!"
    echo "🌐 Tu sitio estará disponible en:"
    echo "   https://improvement-solution.com"
    echo "   https://www.improvement-solution.com"
else
    echo "❌ Error: No se pudo obtener el certificado SSL"
    echo "Verifica que el dominio apunte correctamente a esta IP: $(curl -s ifconfig.me)"
fi
