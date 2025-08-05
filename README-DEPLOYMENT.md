# 🚀 Improvement Solutions - Guía de Despliegue en Producción

## 📋 Resumen del Sistema

### Arquitectura
- **Frontend**: Angular 17 + Nginx (Puerto 80/443)
- **Backend**: Spring Boot + Java 17 (Puerto 8088)
- **Base de Datos**: MySQL 8.0 (Puerto 3306)

## 🔧 Configuración para Producción

### 1. Requisitos del Servidor
- Docker y Docker Compose instalados
- Acceso SSH al servidor
- Certificados SSL (Let's Encrypt)

### 2. Variables de Entorno de Producción
El sistema utiliza las siguientes variables:
- `MYSQL_ROOT_PASSWORD=root`
- `MYSQL_DATABASE=db_improvement_solutions`
- `MYSQL_USER=improvement_user`
- `MYSQL_PASSWORD=improvement_password`
- `SPRING_PROFILES_ACTIVE=production`
- `SERVER_PORT=8088`

### 3. Despliegue Automático con GitHub Actions

El sistema está configurado para despliegue automático:
1. Push a la rama `main` activa el workflow
2. Conecta al servidor vía SSH
3. Ejecuta git pull
4. Construye el backend con Maven
5. Reconstruye y reinicia los contenedores Docker

### 4. Configuración de Secrets en GitHub

Configura los siguientes secrets en tu repositorio:
- `SERVER_HOST`: IP o dominio del servidor
- `SERVER_USER`: Usuario SSH
- `SERVER_SSH_KEY`: Clave privada SSH

### 5. Estructura en el Servidor

```
/opt/improvement-solutions-angular/
├── .github/workflows/deploy.yml
├── docker-compose.yml
├── frontend/
│   ├── Dockerfile
│   └── nginx-ssl.conf
├── backend/
│   └── Dockerfile
└── /etc/letsencrypt/ (certificados SSL)
```

### 6. Comandos de Deployment Manual

```bash
# Clonar el repositorio
git clone <repository-url> /opt/improvement-solutions-angular
cd /opt/improvement-solutions-angular

# Construir backend
cd backend
./mvnw clean package -DskipTests
cd ..

# Levantar servicios
docker-compose down
docker-compose up --build -d
docker system prune -f
```

### 7. Verificación del Deployment

- Frontend: `https://your-domain.com`
- Backend API: `https://your-domain.com/api/`
- Base de datos: Puerto 3306 (solo acceso interno)

### 8. Configuración SSL

El sistema está preparado para usar certificados SSL de Let's Encrypt:
- Los certificados deben estar en `/etc/letsencrypt/live/your-domain.com/`
- Nginx está configurado para redirigir HTTP a HTTPS
- El proxy reverso maneja las rutas `/api/` hacia el backend

### 9. Monitoreo

Los contenedores están configurados con:
- `restart: unless-stopped`
- Logs accesibles con `docker-compose logs -f [service]`
- Health checks automáticos

### 10. Mantenimiento

```bash
# Ver logs
docker-compose logs -f

# Reiniciar servicios
docker-compose restart

# Actualizar desde Git
git pull origin main
docker-compose up --build -d
```
│   Frontend      │    │    Backend      │    │     MySQL       │
│   (Angular)     │────│  (Spring Boot)  │────│   (Database)    │
│   Port: 80      │    │   Port: 8080    │    │   Port: 3306    │
│   Nginx         │    │   Java 17       │    │   Version 8.0   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Requisitos Previos

### Software Necesario
- **Docker Desktop** 4.0+ ([Descargar](https://www.docker.com/products/docker-desktop))
- **Docker Compose** 2.0+ (incluido con Docker Desktop)
- **Git** para clonar el repositorio

### Recursos del Servidor
- **RAM**: Mínimo 4GB, Recomendado 8GB
- **CPU**: Mínimo 2 cores
- **Disco**: Mínimo 10GB libres
- **SO**: Windows 10/11, Linux, macOS

## ⚡ Configuración Rápida

### 1. Preparar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar variables de producción (IMPORTANTE)
# Cambiar contraseñas, secrets, y URLs según tu entorno
```

### 2. Despliegue Automático

**Windows (PowerShell):**
```powershell
.\deploy.ps1
```

**Linux/macOS:**
```bash
chmod +x deploy.sh
./deploy.sh
```

### 3. Verificación
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8080/api/v1
- **Health Check**: http://localhost:8080/api/v1/actuator/health

## 🚀 Despliegue en Producción

### Paso 1: Configurar Variables de Producción

Edita el archivo `.env` con valores seguros:

```env
# Base de datos - CAMBIAR EN PRODUCCIÓN
DB_ROOT_PASSWORD=SuperSecureRootPassword2025!
DB_PASSWORD=VerySecureProductionPassword2025!

# JWT Secret - DEBE SER ÚNICO
JWT_SECRET=super-secure-jwt-secret-production-key-2025

# SMTP para emails
SMTP_HOST=smtp.tu-dominio.com
SMTP_USERNAME=noreply@tu-dominio.com
SMTP_PASSWORD=tu-password-smtp-seguro

# URLs de producción
API_URL=https://api.tu-dominio.com
```

### Paso 2: Construir y Desplegar

```bash
# Detener servicios existentes
docker-compose down

# Construir imágenes
docker-compose build --no-cache

# Levantar en producción
docker-compose up -d

# Verificar estado
docker-compose ps
```

### Paso 3: Configurar Reverse Proxy (Nginx)

Para usar HTTPS y dominios personalizados, configura un proxy reverso:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name tu-dominio.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔄 Configuración de Múltiples Aplicaciones

### Opción 1: Puertos Diferentes

Para ejecutar múltiples instancias de la aplicación:

```yaml
# docker-compose.app1.yml
services:
  frontend:
    ports:
      - "80:80"  # App 1
  backend:
    ports:
      - "8080:8080"  # App 1

# docker-compose.app2.yml
services:
  frontend:
    ports:
      - "81:80"  # App 2
  backend:
    ports:
      - "8081:8080"  # App 2
```

```bash
# Levantar App 1
docker-compose -f docker-compose.app1.yml up -d

# Levantar App 2
docker-compose -f docker-compose.app2.yml up -d
```

### Opción 2: Subdominios

```nginx
# app1.tu-dominio.com
server {
    server_name app1.tu-dominio.com;
    location / {
        proxy_pass http://localhost:80;
    }
}

# app2.tu-dominio.com
server {
    server_name app2.tu-dominio.com;
    location / {
        proxy_pass http://localhost:81;
    }
}
```

### Opción 3: Rutas Diferentes

```nginx
# tu-dominio.com/app1
location /app1/ {
    proxy_pass http://localhost:80/;
}

# tu-dominio.com/app2
location /app2/ {
    proxy_pass http://localhost:81/;
}
```

## 📊 Monitoreo y Mantenimiento

### Comandos Útiles

```bash
# Ver estado de contenedores
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend

# Reiniciar un servicio
docker-compose restart backend

# Actualizar imagen sin downtime
docker-compose up -d --no-deps backend

# Backup de base de datos
docker exec improvement-solutions-mysql mysqldump -u root -p db_improvement_solutions > backup.sql

# Restaurar base de datos
docker exec -i improvement-solutions-mysql mysql -u root -p db_improvement_solutions < backup.sql
```

### Health Checks

Los contenedores incluyen health checks automáticos:

```bash
# Verificar salud de todos los servicios
docker-compose ps --filter "health=healthy"

# Ver detalles de health check
docker inspect improvement-solutions-backend --format='{{.State.Health.Status}}'
```

### Métricas y Logs

```bash
# Ver uso de recursos
docker stats

# Ver logs de aplicación
tail -f backend/logs/application.log

# Exportar métricas (si Prometheus está configurado)
curl http://localhost:8080/api/v1/actuator/metrics
```

## 🆘 Solución de Problemas

### Problemas Comunes

**1. Error de conexión a la base de datos:**
```bash
# Verificar que MySQL esté corriendo
docker-compose ps mysql

# Ver logs de MySQL
docker-compose logs mysql

# Reiniciar MySQL
docker-compose restart mysql
```

**2. Backend no responde:**
```bash
# Verificar logs del backend
docker-compose logs backend

# Verificar variables de entorno
docker-compose config

# Reiniciar backend
docker-compose restart backend
```

**3. Frontend muestra página en blanco:**
```bash
# Verificar logs de nginx
docker-compose logs frontend

# Verificar que el build de Angular sea correcto
docker-compose build --no-cache frontend
```

**4. Problemas de memoria:**
```bash
# Ver uso de memoria
docker stats

# Limpiar contenedores no utilizados
docker system prune -f

# Aumentar memoria en Docker Desktop
# Settings > Resources > Advanced > Memory
```

### Comandos de Emergencia

```bash
# Detener todo y limpiar
docker-compose down
docker system prune -a -f

# Rebuild completo
docker-compose build --no-cache
docker-compose up -d

# Backup rápido antes de cambios críticos
docker-compose exec mysql mysqldump -u root -p --all-databases > emergency-backup.sql
```

## 📞 Soporte

Para soporte adicional:
1. Revisa los logs: `docker-compose logs`
2. Verifica las variables de entorno: `docker-compose config`
3. Consulta la documentación de Docker
4. Contacta al equipo de desarrollo

---

## 🎯 Checklist de Producción

- [ ] Variables de entorno configuradas y seguras
- [ ] Certificados SSL instalados
- [ ] Backup automático configurado
- [ ] Monitoreo de logs implementado
- [ ] Health checks funcionando
- [ ] Firewall configurado
- [ ] Dominio DNS apuntando correctamente
- [ ] SMTP configurado y probado
- [ ] Base de datos optimizada
- [ ] Pruebas de carga realizadas

**¡Tu aplicación está lista para producción! 🚀**
