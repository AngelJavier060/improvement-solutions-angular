# 🚀 Improvement Solutions - Deployment Independiente

## 📋 Configuración de Puertos (Independiente de otros proyectos)

### Puertos Asignados:
- **Frontend HTTP**: 8080
- **Frontend HTTPS**: 8443  
- **Backend API**: 8089
- **MySQL**: 3307

Esto permite que funcione junto con `pollos-chanchos-Angular` sin conflictos.

## 🔧 Pasos para Deployment en Servidor

### 1. Verificar el servidor actual
```bash
# Conectarse al servidor
ssh root@improvement-solution.com

# Verificar qué proyectos están corriendo
ls -la /opt/
docker ps
netstat -tlnp | grep -E ':(80|443|8080|8089|3306|3307)\s'
```

### 2. Preparar el servidor para improvement-solutions
```bash
# Crear directorio del proyecto
mkdir -p /opt/improvement-solutions-angular
cd /opt/improvement-solutions-angular

# Clonar el repositorio
git clone https://github.com/AngelJavier060/improvement-solutions-angular.git .

# Hacer ejecutable el script de verificación
chmod +x server-check.sh
./server-check.sh
```

### 3. Configurar Secrets en GitHub
En GitHub: Settings > Secrets and variables > Actions:
- `SERVER_HOST`: improvement-solution.com
- `SERVER_USER`: root
- `SERVER_SSH_KEY`: [tu clave SSH privada]

### 4. Primer deployment manual
```bash
cd /opt/improvement-solutions-angular/backend
./mvnw clean package -DskipTests
cd ..
docker-compose up --build -d
```

### 5. Verificar que está funcionando
```bash
# Ver servicios corriendo
docker-compose ps

# Ver logs
docker-compose logs -f

# Verificar puertos
netstat -tlnp | grep -E ':(8080|8089|3307)\s'
```

## 🌐 URLs de Acceso

- **Frontend**: http://improvement-solution.com:8080
- **Backend API**: http://improvement-solution.com:8089/api/
- **Con SSL**: https://improvement-solution.com:8443 (requiere certificados)

## 🔄 Deployment Automático

Cada push a `main` ejecutará automáticamente:
1. SSH al servidor
2. Git pull
3. Build del backend
4. Reconstruir contenedores
5. Restart de servicios

## ⚙️ Comandos Útiles

```bash
# Ver estado de ambos proyectos
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Restart solo improvement-solutions
cd /opt/improvement-solutions-angular
docker-compose restart

# Ver logs en tiempo real
docker-compose logs -f frontend
docker-compose logs -f backend

# Actualizar desde Git
git pull origin main
docker-compose up --build -d
```

## 🔒 Configuración SSL (Opcional)

Si quieres SSL independiente para improvement-solutions:
```bash
# Obtener certificado para subdominio
certbot certonly --standalone -d apps.improvement-solution.com

# O usar el mismo dominio con diferentes puertos
# El nginx-ssl.conf ya está configurado para usar los certificados existentes
```

## 🚨 Troubleshooting

### Si hay conflictos de puertos:
```bash
# Ver qué está usando cada puerto
lsof -i :8080
lsof -i :8089
lsof -i :3307

# Cambiar puertos en docker-compose.yml si es necesario
```

### Si el deployment automático falla:
```bash
# Verificar conexión SSH
ssh root@improvement-solution.com "echo 'SSH OK'"

# Verificar permisos del directorio
ls -la /opt/improvement-solutions-angular
```

¡El sistema está configurado para funcionar independientemente junto con otros proyectos! 🎉
