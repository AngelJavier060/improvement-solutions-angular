# 🚀 Guía de Deployment - Improvement Solutions Angular

## 📋 Pasos para configurar el deployment

### 1. 🔑 Configurar GitHub Secrets

En tu repositorio GitHub (`https://github.com/AngelJavier060/improvement-solutions-angular`):

1. Ve a **Settings** → **Secrets and variables** → **Actions**
2. Crea estos secrets:

```
SERVER_HOST=tu.servidor.ip
SERVER_USER=tu_usuario_ssh
SERVER_SSH_KEY=tu_clave_ssh_privada
```

### 2. 🖥️ Preparar el servidor

Ejecuta estos comandos EN TU SERVIDOR:

```bash
# Instalar dependencias necesarias
sudo apt update
sudo apt install docker.io docker-compose git default-jdk -y

# Iniciar Docker
sudo systemctl start docker
sudo systemctl enable docker

# Añadir usuario al grupo docker
sudo usermod -aG docker $USER
```

### 3. 🔧 Deployment manual (primera vez)

Copia el archivo `manual-deploy.sh` a tu servidor y ejecútalo:

```bash
# En tu servidor
chmod +x manual-deploy.sh
./manual-deploy.sh
```

### 4. 🔍 Verificar servicios

Después del deployment, verifica que todo funcione:

```bash
# Ver contenedores
docker ps

# Ver logs si hay problemas
docker-compose logs frontend
docker-compose logs backend
docker-compose logs mysql

# Verificar puertos
netstat -tlnp | grep -E "8080|8089|3307"
```

### 5. 🌐 Acceder a los servicios

- **Frontend**: http://tu-servidor:8080
- **Backend**: http://tu-servidor:8089  
- **MySQL**: tu-servidor:3307

### 6. 🐛 Solución de problemas comunes

#### Error de permisos:
```bash
sudo chown -R $USER:$USER /opt/improvement-solutions-angular
```

#### Error de Docker:
```bash
sudo systemctl restart docker
docker system prune -f
```

#### Error de Maven:
```bash
cd backend
chmod +x mvnw
./mvnw clean package -DskipTests
```

### 7. 🔄 Configuración de puertos independientes

Este proyecto usa puertos independientes para no interferir con pollos-chanchos-Angular:

- **Frontend**: 8080 (vs 80 de pollos-chanchos)
- **Backend**: 8089 (vs 8088 de pollos-chanchos)  
- **MySQL**: 3307 (vs 3306 de pollos-chanchos)

## ✅ Verificación final

Cuando todo esté funcionando, deberías ver:

```bash
$ docker ps
CONTAINER ID   IMAGE                                    PORTS                                         NAMES
xxx            improvement-solutions-angular-frontend   0.0.0.0:8080->80/tcp, 0.0.0.0:8443->443/tcp  improvement-solutions-angular-frontend-1
xxx            improvement-solutions-angular-backend    0.0.0.0:8089->8089/tcp                        improvement-solutions-angular-backend-1
xxx            mysql:8.0                               0.0.0.0:3307->3306/tcp                        improvement-solutions-angular-mysql-1
```
