# Guía de Despliegue en Producción - Improvement Solutions

Esta guía detalla los pasos exactos para desplegar la aplicación en producción con el Super Usuario configurado.

## Pre-requisitos en el Servidor

1. **Docker y Docker Compose** instalados
2. **Nginx Proxy Manager (NPM)** configurado con red `proxy-network`
3. **MySQL** accesible (puede ser contenedor o servidor externo)
4. **Dominio configurado** apuntando al servidor

## Paso 1: Actualizar Código en el Servidor

```bash
# Conectar al servidor VPS
ssh usuario@tu-servidor.com

# Navegar al directorio del proyecto
cd /ruta/al/proyecto/improvement-solutions-angular

# Actualizar código desde GitHub
git pull origin main
```

**IMPORTANTE:** El `git pull` solo actualiza el código. NO despliega automáticamente.

## Paso 2: Crear archivo .env en el Servidor

En el servidor, en la raíz del proyecto, crea el archivo `.env` (NO lo subas a GitHub):

```bash
nano .env
```

Contenido del `.env` (usa valores reales y seguros):

```ini
# Backend (Spring Boot)
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8081

# Database (ajusta según tu MySQL)
DB_HOST=mysql
DB_PORT=3306
DB_NAME=db_improvement_solutions
DB_USER=admin
DB_PASSWORD=TU_PASSWORD_DB_SEGURO

# JWT secret (genera una cadena aleatoria larga)
JWT_SECRET=cambia-esto-por-una-cadena-muy-larga-y-aleatoria-de-al-menos-64-caracteres

# Super Admin - CREDENCIALES DEL SUPER USUARIO
SUPER_ADMIN_USERNAME=Javier
SUPER_ADMIN_EMAIL=javierangelmsn@outlook.es
SUPER_ADMIN_PASSWORD=UNA_CONTRASEÑA_MUY_FUERTE_!@#$%^&*

# MySQL (si usas contenedor MySQL propio)
MYSQL_ROOT_PASSWORD=root_password_seguro
MYSQL_DATABASE=db_improvement_solutions
MYSQL_USER=admin
MYSQL_PASSWORD=TU_PASSWORD_DB_SEGURO
```

**Guarda el archivo** (en nano: Ctrl+O, Enter, Ctrl+X)

**Verificación:**
```bash
cat .env  # Verifica que no tenga errores de sintaxis
```

## Paso 3: Construir y Levantar Contenedores

```bash
# Detener contenedores anteriores si existen
docker compose -f docker-compose.prod.yml down

# Construir imágenes y levantar servicios
docker compose -f docker-compose.prod.yml up -d --build

# Ver logs en tiempo real (Ctrl+C para salir)
docker logs -f improvement-backend
```

**Logs esperados del backend:**
- `Inicializando datos de la aplicación...`
- `Super Usuario creado en PROD: Javier (javierangelmsn@outlook.es)` (primera vez)
- O `Super Usuario ya existía. Roles y estado asegurados...` (siguientes arranques)

## Paso 4: Verificar Contenedores

```bash
# Ver estado de contenedores
docker ps

# Deberías ver:
# improvement-backend (running)
# improvement-frontend (running)

# Verificar red
docker network inspect proxy-network

# Confirmar que improvement-backend y improvement-frontend están en la red
```

## Paso 5: Configurar Nginx Proxy Manager (NPM)

### Backend API
1. Abre NPM web interface
2. Agrega **Proxy Host**:
   - **Domain Names:** `api.tudominio.com`
   - **Scheme:** `http`
   - **Forward Hostname/IP:** `improvement-backend` (nombre del contenedor)
   - **Forward Port:** `8081`
   - **Cache Assets:** ON
   - **Block Common Exploits:** ON
   - **Websockets Support:** OFF
3. En pestaña **SSL**:
   - Request SSL Certificate (Let's Encrypt)
   - Force SSL: ON

### Frontend
1. Agrega **Proxy Host**:
   - **Domain Names:** `tudominio.com`, `www.tudominio.com`
   - **Scheme:** `http`
   - **Forward Hostname/IP:** `improvement-frontend`
   - **Forward Port:** `80`
   - **Cache Assets:** ON
   - **Block Common Exploits:** ON
3. En pestaña **SSL**:
   - Request SSL Certificate
   - Force SSL: ON

## Paso 6: Verificar Super Usuario en Producción

### 6.1 Login con PowerShell (desde tu PC)

```powershell
# Login usando email
$body = @{
    email = "javierangelmsn@outlook.es"
    password = "TU_PASSWORD_FUERTE"
} | ConvertTo-Json

$resp = Invoke-RestMethod -Uri "https://api.tudominio.com/api/auth/login" -Method Post -ContentType "application/json" -Body $body

# Ver respuesta
$resp

# Guardar token
$token = $resp.token
```

**Resultado esperado:**
```
token            : eyJhbGciOiJIUzUxMiJ9...
tokenType        : Bearer
expiresIn        : 86400
userDetail       : @{id=X; name=...; username=Javier; email=javierangelmsn@outlook.es; roles=System.Object[]}
refreshToken     : ...
```

### 6.2 Acceder a Endpoint de Admin

```powershell
$headers = @{ Authorization = "Bearer $token" }
$users = Invoke-RestMethod -Uri "https://api.tudominio.com/api/admin/users" -Headers $headers
$users | Format-Table username, email, roles, active
```

**Resultado esperado:**
Lista de usuarios incluyendo a "Javier" con `roles: {ROLE_ADMIN, ROLE_SUPER_ADMIN}`.

### 6.3 Verificación directa en Base de Datos

```bash
# Conectar a MySQL (ajusta según tu setup)
docker exec -it mysql mysql -u admin -p db_improvement_solutions

# O si MySQL es externo:
# mysql -h tu-servidor-mysql -u admin -p db_improvement_solutions
```

```sql
-- Ver usuario Javier
SELECT id, username, email, is_active 
FROM users 
WHERE username='Javier';

-- Ver roles de Javier
SELECT r.name
FROM roles r
JOIN user_roles ur ON ur.role_id = r.id
JOIN users u ON u.id = ur.user_id
WHERE u.username='Javier';
```

**Resultado esperado:**
```
name
--------------
ROLE_ADMIN
ROLE_SUPER_ADMIN
```

## Paso 7: Crear Empresa de Prueba (Validar Permisos)

```powershell
$body = @{
    name = "Empresa Test"
    ruc = "1234567890001"
    email = "test@empresa.com"
    phone = "0999999999"
} | ConvertTo-Json

$business = Invoke-RestMethod -Uri "https://api.tudominio.com/api/businesses" -Method Post -Headers $headers -ContentType "application/json" -Body $body
$business
```

**Resultado esperado:** Respuesta 201 con datos de la empresa creada.

## Troubleshooting

### Backend no arranca
```bash
docker logs improvement-backend --tail 100

# Errores comunes:
# - Variable DB_PASSWORD no definida o incorrecta
# - MySQL no accesible en red proxy-network
# - Puerto 8081 ya en uso
```

### Super Usuario no se crea
- Verificar logs: `docker logs improvement-backend | grep -i "super"`
- Confirmar `SPRING_PROFILES_ACTIVE=prod` en `.env`
- Verificar `SUPER_ADMIN_PASSWORD` definido en `.env`

### Error 502 Bad Gateway en NPM
- Verificar que `improvement-backend` está en red `proxy-network`
- Confirmar puerto 8081 en `docker ps`
- Revisar logs de backend

### Login 401 Unauthorized
- Verificar email y password correctos
- Confirmar que usuario existe en BD: `SELECT * FROM users WHERE email='javierangelmsn@outlook.es';`
- Verificar rol activo: `SELECT is_active FROM users WHERE username='Javier';`

### Login 400 Bad Request
- Verificar formato JSON del body
- Usar `Invoke-RestMethod` en PowerShell (no `curl.exe` por problemas de escape)

## Comandos Útiles

```bash
# Ver logs en vivo
docker logs -f improvement-backend

# Reiniciar backend
docker restart improvement-backend

# Ver variables de entorno del contenedor
docker exec improvement-backend env | grep SUPER_ADMIN

# Reconstruir backend tras cambios de código
docker compose -f docker-compose.prod.yml up -d --build backend

# Detener todo
docker compose -f docker-compose.prod.yml down

# Limpiar y reconstruir desde cero
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d --build
```

## Seguridad Post-Despliegue

1. **Cambiar contraseña del Super Usuario** tras primer login:
   - Login como Javier
   - Ir a perfil → cambiar contraseña
   - Usar una contraseña aún más fuerte

2. **Rotar JWT_SECRET** si se filtra (requiere reinicio backend)

3. **Revisar logs periódicamente:**
   ```bash
   docker logs improvement-backend --since 24h | grep -i error
   ```

4. **Backup de .env:**
   - Guardar copia del `.env` en lugar seguro fuera del servidor
   - NO subirlo a GitHub

5. **Actualizar dependencias:**
   ```bash
   cd backend
   mvn versions:display-dependency-updates
   ```

## Notas Finales

- **Git NO despliega automáticamente:** Cada vez que hagas `git push`, debes hacer `git pull` en el servidor y `docker compose up -d --build`.
- **`.env` es secreto:** Nunca lo subas a GitHub. Ya está en `.gitignore`.
- **Roles en producción:** El Super Usuario (Javier) puede crear administradores, que a su vez crean usuarios finales por empresa.
- **Primeros pasos:** Tras validar el Super Usuario, crea tu primera empresa y asigna administradores.

---

**Documentación creada:** $(Get-Date)
**Versión backend:** Spring Boot 3.x
**Versión Docker Compose:** 3.8
