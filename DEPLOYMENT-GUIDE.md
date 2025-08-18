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
netstat -tlnp | grep -E "8001|8089|3307"
```

### 5. Acceder a los servicios

- **Frontend**: http://tu-servidor:8001
- **Backend**: http://tu-servidor:8089  
- **MySQL**: tu-servidor:3307

### 6. Solución de problemas comunes

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

### 7. Configuración de puertos independientes

Este proyecto usa puertos independientes para no interferir con pollos-chanchos-Angular:

- **Frontend**: 8001 (vs 80 de pollos-chanchos)
- **Backend**: 8089 (vs 8088 de pollos-chanchos)  
- **MySQL**: 3307 (vs 3306 de pollos-chanchos)

## Verificación final

Cuando todo esté funcionando, deberías ver:

```bash
$ docker ps
CONTAINER ID   IMAGE                                    PORTS                                         NAMES
xxx            improvement-solutions-angular-frontend   0.0.0.0:8001->80/tcp, 0.0.0.0:8443->443/tcp  improvement-solutions-angular-frontend-1
xxx            improvement-solutions-angular-backend    0.0.0.0:8089->8089/tcp                        improvement-solutions-angular-backend-1
xxx            mysql:8.0                               0.0.0.0:3307->3306/tcp                        improvement-solutions-angular-mysql-1

## 🔐 Troubleshooting Login (Producción)

Usa esta sección si el login devuelve 403/500 en producción.

- **Verificar tablas/columnas requeridas**

```sql
SHOW TABLES;
SHOW COLUMNS FROM users; -- debe existir columna is_active
SHOW CREATE TABLE users;
SHOW CREATE TABLE roles;
SHOW CREATE TABLE user_roles; -- join table de roles
SHOW CREATE TABLE user_sessions; -- donde se guardan sesiones
```

- **Crear tabla user_sessions si falta**

```sql
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  device_info VARCHAR(255) NOT NULL,
  ip_address VARCHAR(100),
  last_activity TIMESTAMP NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
);
```

- **Asegurar usuario administrador `javier` activo con roles**

```sql
-- Roles
INSERT IGNORE INTO roles (name) VALUES ('ROLE_USER');
INSERT IGNORE INTO roles (name) VALUES ('ROLE_ADMIN');

-- Usuario 'javier' (password BCrypt de 12345)
INSERT INTO users (username, email, password, name, phone, is_active, created_at, updated_at)
SELECT 'javier', 'javierangelmsn@outlook.es', '$2a$10$iyH.Xiv1ASsMqL.yNen/0.1l98vhPF2U/BMJS/HMJQwkcHJtQSQD6', 'Javier', NULL, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='javier' OR email='javierangelmsn@outlook.es');

UPDATE users SET is_active = TRUE WHERE username='javier' OR email='javierangelmsn@outlook.es';

-- Asignar roles a 'javier'
SET @u = (SELECT id FROM users WHERE username='javier');
SET @r_admin = (SELECT id FROM roles WHERE name='ROLE_ADMIN');
SET @r_user  = (SELECT id FROM roles WHERE name='ROLE_USER');
INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (@u, @r_admin), (@u, @r_user);
```

- **Probar endpoints**

```bash
# Listar usuarios (diagnóstico rápido)
curl -k https://improvement-solution.com/api/auth/users

# Login
curl -k -X POST https://improvement-solution.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"javier","password":"12345"}'
```

- **Revisar logs si persiste 500**

```bash
docker-compose logs --tail=200 backend
# o dentro del contenedor, revisar /app/logs/application.log
