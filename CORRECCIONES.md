# Correcciones Realizadas en el Proyecto

## 1. Problemas Corregidos

### 1.1 Error crítico en JwtAuthenticationFilter
- Se corrigió el método `getUsernameFromToken(String)` que no estaba definido en JwtTokenProvider
- Se actualizó para utilizar el método correcto `getUsernameFromJWT(String)` que sí existía

### 1.2 Métodos obsoletos en JwtTokenProvider
- Se actualizó el uso de métodos deprecados de la biblioteca JJWT:
  - Reemplazo de `Jwts.parser()` por `Jwts.parserBuilder()`
  - Reemplazo del método `signWith(SignatureAlgorithm, String)` por `signWith(Key, SignatureAlgorithm)`
  - Se creó un método `getSigningKey()` para centralizar la generación de claves de firma JWT

### 1.3 Variables no utilizadas
- En `BusinessEmployeeContractService.java`: Se eliminó la variable `contract` no utilizada en el método `setAsCurrentContract`

### 1.4 Importaciones no utilizadas
- En `EmailService.java`: Se eliminó la importación no utilizada `jakarta.mail.MessagingException`

### 1.5 Errores CORS
- Se solucionaron los errores de CORS al acceder a endpoints públicos desde Angular
- Se centralizó la configuración CORS en `ImprovementSolutionsApplication.java`, eliminando configuraciones duplicadas
- Se corrigió la configuración CORS para incluir rutas con y sin `/api/v1/`
- Se eliminaron los filtros CORS redundantes que causaban conflictos de beans en Spring Boot
- Se eliminaron completamente los archivos `CustomCorsFilter.java` y `LegacyCorsFilter.java` (09/05/2025)
- Se desactivó la anotación `@Configuration` en `CorsConfig.java` para evitar que Spring Boot procese esta clase (09/05/2025)

### 1.6 Inconsistencias en las rutas API
- Los servicios frontend usaban rutas inconsistentes en relación con el contexto `/api/v1/` configurado en el backend
- Se actualizaron todas las URLs en los servicios para incluir el contexto correcto:
  - GeneroService: `/public/generos` → `/api/v1/public/generos`
  - EstadoCivilService: `/public/estado-civil` → `/api/v1/public/estado-civil` 
  - EstudioService: `/estudios` → `/api/v1/estudios`
  - FileService: `/files` → `/api/v1/files`

### 1.7 Mapeo ambiguo de controladores
- Se resolvió el conflicto entre `TestPublicController` y `PublicTestController` que estaban mapeados a la misma ruta
- Se desactivó `TestPublicController` como controlador REST y se cambió a `@Component` con una ruta alternativa

## 2. Recomendaciones Adicionales

### 2.1 Seguridad JWT
- Considerar utilizar un secreto JWT más largo y complejo que `improvementSolutionsSecretKey2025`
- Considerar el uso de claves asimétricas (RS256) en lugar de HMAC para mayor seguridad

### 2.2 Manejo de excepciones
- Implementar un manejo de excepciones más robusto en los servicios JWT
- Registrar adecuadamente los errores JWT para facilitar la depuración

### 2.3 Pruebas unitarias
- Desarrollar pruebas unitarias para los servicios de autenticación JWT
- Validar la generación y verificación correcta de tokens

### 1.8 Error de configuración de seguridad
- Se corrigió una configuración errónea en `SecurityConfig.java` que bloqueaba incorrectamente los endpoints públicos
- Se eliminó el uso incorrecto de `securityMatcher` que estaba invalidando la configuración de rutas públicas
- Este cambio permite que los endpoints públicos como `/api/v1/public/generos` sean accesibles sin autenticación

## 3. Próximos Pasos
1. Compilar el proyecto con Maven: `mvn clean compile`
2. Ejecutar pruebas: `mvn test`
3. Iniciar el backend: `mvn spring-boot:run`
4. Iniciar el frontend: `cd ../frontend && ng serve`
5. Acceder a la aplicación: http://localhost:4200
