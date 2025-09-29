# Gráficas de Talento Humano - Estadísticas de Género y Discapacidad

## Descripción General

Este módulo implementa un sistema completo de visualización de estadísticas de personal que muestra la distribución por género (hombres, mujeres) y personas con discapacidad en la organización. Las gráficas utilizan datos reales del backend y permiten filtrar por empresa cuando el usuario tiene acceso a múltiples organizaciones.

## Componentes Implementados

### 1. TalentoHumanoStatsService
**Ubicación:** `services/talento-humano-stats.service.ts`

**Funciones principales:**
- `getBusinessGenderDisabilityStats(businessId)`: Obtiene estadísticas de una empresa específica
- `getAllBusinessesStats(businessIds)`: Obtiene estadísticas de múltiples empresas
- `getUserBusinesses()`: Obtiene las empresas asociadas al usuario actual
- `getBusinessByRuc(ruc)`: Convierte RUC a ID de empresa
- `getTalentoHumanoStats()`: Método principal que combina todas las estadísticas

**Endpoints utilizados:**
- `GET /api/business-employees/business/{businessId}` - Lista de empleados por empresa
- `GET /api/businesses/{businessId}` - Información de la empresa
- `GET /api/businesses/ruc/{ruc}` - Empresa por RUC
- `GET /api/user/businesses` - Empresas del usuario

### 2. TalentoHumanoChartsComponent
**Ubicación:** `components/talento-humano-charts.component.ts`

**Características:**
- Gráfica de barras interactiva con D3.js
- Selector de empresa (cuando hay múltiples empresas)
- Tarjetas de resumen con estadísticas clave
- Tabla de desglose por empresa
- Estados de carga, error y sin datos
- Responsive design

## Estructura de Datos

### GenderDisabilityStats
```typescript
interface GenderDisabilityStats {
  masculino: number;
  femenino: number;
  discapacitados: number;
  total: number;
}
```

### BusinessStats
```typescript
interface BusinessStats {
  businessId: number;
  businessName: string;
  businessRuc: string;
  stats: GenderDisabilityStats;
}
```

### TalentoHumanoStatsData
```typescript
interface TalentoHumanoStatsData {
  currentBusiness: BusinessStats;
  allBusinesses: BusinessStats[];
  totalCombined: GenderDisabilityStats;
}
```

## Lógica de Cálculo

### Clasificación por Género
- **Masculino:** `genderId === 1` o `genderName` contiene "masculino" o "hombre"
- **Femenino:** `genderId === 2` o `genderName` contiene "femenino" o "mujer"

### Detección de Discapacidad
Se considera que una persona tiene discapacidad si:
- El campo `discapacidad` existe
- No es "no", "ninguna" o cadena vacía
- Es case-insensitive

## Integración en el Dashboard

### Ubicación
`http://localhost:4200/usuario/{ruc}/dashboard/talento-humano/inicio`

### Implementación
```html
<!-- En talento-humano-dashboard.component.html -->
<app-talento-humano-charts></app-talento-humano-charts>
```

### Módulo
El componente está declarado en `TalentoHumanoModule` y requiere:
- `CommonModule`
- `FormsModule` (para el selector de empresa)
- D3.js para las gráficas

## Funcionalidades

### 1. Visualización Principal
- Gráfica de barras con tres categorías: Hombres, Mujeres, Personas con Discapacidad
- Colores distintivos: Azul (#3b82f6), Rosa (#ec4899), Verde (#10b981)
- Tooltips interactivos al hacer hover
- Etiquetas de valores en cada barra

### 2. Filtro por Empresa
- Dropdown que permite seleccionar entre "Todas las empresas" o una empresa específica
- Solo se muestra si el usuario tiene acceso a múltiples empresas
- Actualización automática de la gráfica al cambiar la selección

### 3. Tarjetas de Resumen
- **Total Empleados:** Número total de empleados
- **Hombres:** Cantidad de empleados masculinos
- **Mujeres:** Cantidad de empleados femeninos
- **Personas con Discapacidad:** Cantidad y porcentaje del total

### 4. Tabla de Desglose
- Se muestra solo cuando se selecciona "Todas las empresas"
- Lista cada empresa con sus estadísticas individuales
- Permite hacer clic en una fila para filtrar por esa empresa

### 5. Estados de la UI
- **Cargando:** Spinner con mensaje
- **Error:** Mensaje de error con botón de reintentar
- **Sin datos:** Mensaje cuando no hay empleados registrados

## Responsive Design

### Desktop (≥768px)
- Gráfica de 500x350px
- Tarjetas de resumen en fila
- Tabla completa visible

### Mobile (<768px)
- Gráfica adaptada a 300px de altura
- Tarjetas de resumen apiladas
- Tabla con scroll horizontal

## Manejo de Errores

### Fallbacks Implementados
1. **Error al obtener empresas:** Usa solo la empresa actual
2. **Error al obtener RUC:** Usa ID por defecto (1)
3. **Error en estadísticas:** Retorna valores en cero
4. **Empresa no encontrada:** Crea empresa temporal con el RUC

### Logging
Todos los errores se registran en la consola con contexto específico para facilitar el debugging.

## Configuración y Uso

### Requisitos
1. Backend con endpoints de empleados funcionando
2. Autenticación JWT válida
3. Usuario con acceso a al menos una empresa

### Instalación
El componente se instala automáticamente al importar `TalentoHumanoModule`.

### Personalización
- **Colores:** Modificar en `renderChart()` del componente
- **Tamaños:** Ajustar variables `width`, `height`, `margin`
- **Endpoints:** Cambiar URLs en el servicio

## Próximas Mejoras

1. **Filtros adicionales:** Por departamento, cargo, rango de fechas
2. **Exportación:** PDF, Excel de las estadísticas
3. **Gráficas adicionales:** Pie charts, líneas de tiempo
4. **Comparativas:** Entre períodos o empresas
5. **Alertas:** Cuando el porcentaje de discapacidad esté fuera del rango legal

## Troubleshooting

### Problema: Gráfica no se muestra
- Verificar que D3.js esté instalado
- Comprobar errores en la consola del navegador
- Validar que el contenedor tenga dimensiones

### Problema: No aparecen datos
- Verificar conectividad con el backend
- Comprobar que el usuario tenga empleados registrados
- Validar el token JWT

### Problema: Error de permisos
- Verificar que el usuario tenga acceso a la empresa
- Comprobar que los endpoints estén configurados correctamente
