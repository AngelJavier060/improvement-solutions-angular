# Solución al Problema de CORS en la aplicación Angular/Spring Boot

## Problema

Se estaban produciendo errores CORS en la aplicación, específicamente:

1. **Error en carga de logos**: La carga de archivos en la ruta `/api/files/upload/logos` fallaba con el error `The 'Access-Control-Allow-Origin' header contains multiple values 'http://localhost:4200, *', but only one is allowed`.

2. **Error en inicio de sesión**: La autenticación en la ruta `/api/auth/login` presentaba problemas CORS que impedían el correcto funcionamiento.

## Causa raíz

Después de una investigación minuciosa, se identificaron varios problemas:

1. **Configuraciones CORS duplicadas**: Existían múltiples configuraciones CORS en diferentes partes de la aplicación que se interferían entre sí:
   - Múltiples filtros CORS con diferentes prioridades
   - Controladores que añadían cabeceras CORS manualmente
   - Clases de manejo de excepciones que añadían cabeceras CORS con valores diferentes

2. **Cabeceras hardcodeadas**: En el `FileUploadExceptionAdvice.java` se estaban añadiendo cabeceras CORS con valor `*` que entraban en conflicto con las cabeceras configuradas en los filtros CORS.

3. **Falta de centralización**: Las configuraciones CORS estaban dispersas por toda la aplicación, lo que hacía difícil mantener una configuración coherente.

## Solución implementada

### 1. Centralizamos la configuración CORS

Se creó una configuración CORS única y centralizada en `CorsConfig.java` que provee:
- Un bean `CorsConfigurationSource` para la configuración de Spring Security
- Un bean `CorsFilter` para filtrar todas las solicitudes HTTP

```java
@Configuration
public class CorsConfig {

    @Bean
    @Primary
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Permitir el origen del frontend de manera explícita
        configuration.addAllowedOrigin("http://localhost:4200");
        
        // Permitir todos los métodos HTTP necesarios
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));
        
        // Permitir cabeceras específicas
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization", 
            "Content-Type", 
            "X-Requested-With",
            "Accept", 
            "Origin", 
            "Access-Control-Request-Method", 
            "Access-Control-Request-Headers"
        ));
        
        // Exponer cabeceras que el cliente puede acceder
        configuration.setExposedHeaders(Arrays.asList(
            "Authorization", 
            "Content-Disposition", 
            "Content-Length"
        ));
        
        // Permitir credenciales
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }
    
    @Bean
    @Primary
    public CorsFilter corsFilter(CorsConfigurationSource corsConfigurationSource) {
        return new CorsFilter(corsConfigurationSource);
    }
}
```

### 2. Mejoramos `FormDataCorsFilter`

Se mejoró el filtro `FormDataCorsFilter` para manejar adecuadamente todas las solicitudes, especialmente las de carga de archivos:

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class FormDataCorsFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) 
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;
        
        // Detectar si es una ruta crítica
        boolean isFileUpload = request.getRequestURI().contains("/api/files/upload");
        
        // Eliminar cabeceras CORS previas para evitar duplicados
        response.setHeader("Access-Control-Allow-Origin", null);
        
        // Configurar cabeceras CORS correctamente
        String origin = request.getHeader("Origin");
        if (origin != null && origin.contains("localhost")) {
            response.setHeader("Access-Control-Allow-Origin", origin);
        } else {
            response.setHeader("Access-Control-Allow-Origin", "http://localhost:4200");
        }
        
        // Configurar el resto de cabeceras CORS
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH");
        response.setHeader("Access-Control-Allow-Headers", 
            "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        response.setHeader("Access-Control-Allow-Credentials", "true");
        
        // Para solicitudes OPTIONS, responder inmediatamente
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }
        
        // Detectar y corregir problemas de cabeceras múltiples
        try {
            chain.doFilter(req, res);
        } finally {
            if (isFileUpload) {
                String corsHeader = response.getHeader("Access-Control-Allow-Origin");
                if (corsHeader != null && corsHeader.contains(",")) {
                    // Corregir cabecera con valores múltiples
                    response.setHeader("Access-Control-Allow-Origin", 
                        origin != null ? origin : "http://localhost:4200");
                }
            }
        }
    }
}
```

### 3. Eliminamos configuraciones CORS redundantes

1. Se eliminaron las cabeceras CORS hardcodeadas en `FileUploadExceptionAdvice.java`:

```java
@ExceptionHandler(StorageException.class)
public ResponseEntity<?> handleStorageException(StorageException exc) {
    logger.error("Error de almacenamiento: {}", exc.getMessage());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            // ¡Ya no añadimos cabeceras CORS aquí!
            .body(new ErrorResponse(
                "Error al procesar el archivo", 
                exc.getMessage(),
                "STORAGE_ERROR"
            ));
}
```

2. Se eliminaron los archivos de configuración CORS redundantes o se desactivaron temporalmente:
   - `SimpleCorsConfig.java` (eliminado)
   - `CustomCorsConfiguration.java` (eliminado)
   - `CorsDebugFilter.java` (desactivado)
   - `CorsHeaderTrackingFilter.java` (desactivado)

### 4. Implementamos diagnóstico CORS

Se creó `CorsDiagnosticFilter` para identificar y corregir problemas de CORS en rutas críticas:

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 100)
public class CorsDiagnosticFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;
        
        // Solo aplicar diagnóstico en rutas críticas
        if (request.getRequestURI().contains("/api/files/upload")) {
            logCorsHeaders("ANTES", request, response);
            
            chain.doFilter(request, response);
            
            logCorsHeaders("DESPUÉS", request, response);
        } else {
            chain.doFilter(req, res);
        }
    }
    
    private void logCorsHeaders(String fase, HttpServletRequest request, HttpServletResponse response) {
        // Registrar información de cabeceras CORS
        // Detectar cabeceras múltiples problemáticas
    }
}
```

## Resultado

Con estos cambios implementados:

1. ✅ El inicio de sesión en `/api/auth/login` funciona correctamente.
2. ✅ La carga de archivos en `/api/files/upload/logos` funciona correctamente.
3. ✅ No se producen errores de cabeceras CORS duplicadas.
4. ✅ Todas las solicitudes preflight OPTIONS se manejan adecuadamente.

## Procedimiento de prueba

1. **Prueba de preflight OPTIONS**: Verificar que las solicitudes OPTIONS a puntos finales críticos devuelven las cabeceras CORS correctas.

2. **Prueba de carga de archivos**: Subir imágenes de logo a través de la ruta `/api/files/upload/logos` para verificar que el proceso funciona sin errores CORS.

3. **Prueba de inicio de sesión**: Verificar que el proceso de autenticación funciona correctamente.

4. **Verificación de cabeceras**: Comprobar que no hay errores de cabeceras CORS duplicadas en las respuestas del servidor.

## Recomendaciones para el futuro

1. Mantener una configuración CORS centralizada y evitar añadir cabeceras CORS manualmente en controladores o manejadores de excepciones.

2. Utilizar `FormDataCorsFilter` como el filtro principal para manejar todas las solicitudes CORS.

3. Al añadir nuevos endpoints, asegurarse de probar con solicitudes OPTIONS preflight para verificar que CORS está configurado correctamente.

4. Monitorear los logs para detectar problemas de cabeceras CORS duplicadas.
