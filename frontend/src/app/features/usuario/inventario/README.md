# Módulo de Inventario

## Estructura del Menú Lateral

Este módulo cuenta con un menú lateral profesional y colapsable que estructura las diferentes funcionalidades del sistema de inventario, organizado por secciones expandibles.

### Secciones del Menú

#### 🏠 **Dashboard**
- Ruta: `/usuario/{ruc}/inventario/dashboard`
- Descripción: Muestra estadísticas y resumen general del módulo
- Estado: ✅ Implementado (estructura básica)

#### 📦 **INVENTARIO**
1. **Catálogo de Productos**
   - Ruta: `/usuario/{ruc}/inventario/catalogo-productos`
   - Descripción: Gestiona el catálogo completo de productos
   - Estado: 🔨 En construcción

2. **Stock Actual**
   - Ruta: `/usuario/{ruc}/inventario/stock-actual`
   - Descripción: Visualiza el inventario disponible en tiempo real
   - Estado: 🔨 En construcción

3. **Buscar Producto**
   - Ruta: `/usuario/{ruc}/inventario/buscar-producto`
   - Descripción: Búsqueda rápida y avanzada de productos
   - Estado: 🔨 En construcción

#### ⬇️ **ENTRADAS**
1. **Nueva Entrada**
   - Ruta: `/usuario/{ruc}/inventario/nueva-entrada`
   - Descripción: Registra nuevas entradas de productos al inventario
   - Estado: 🔨 En construcción

2. **Historial de Entradas**
   - Ruta: `/usuario/{ruc}/inventario/historial-entradas`
   - Descripción: Lista todos los ingresos registrados
   - Estado: 🔨 En construcción

#### ⬆️ **SALIDAS**
1. **Nueva Salida**
   - Ruta: `/usuario/{ruc}/inventario/nueva-salida`
   - Descripción: Registra salidas de productos del inventario
   - Estado: 🔨 En construcción

2. **Historial de Salidas**
   - Ruta: `/usuario/{ruc}/inventario/historial-salidas`
   - Descripción: Muestra todas las salidas realizadas
   - Estado: 🔨 En construcción

#### ⚙️ **GESTIÓN ESPECIAL**
1. **Cambios/Reemplazos**
   - Ruta: `/usuario/{ruc}/inventario/cambios-reemplazos`
   - Descripción: Gestiona cambios y reemplazos de productos
   - Estado: 🔨 En construcción

2. **Devoluciones**
   - Ruta: `/usuario/{ruc}/inventario/devoluciones`
   - Descripción: Gestiona devoluciones de productos
   - Estado: 🔨 En construcción

3. **Préstamos** (Badge: 3)
   - Ruta: `/usuario/{ruc}/inventario/prestamos`
   - Descripción: Gestiona préstamos de productos
   - Estado: 🔨 En construcción

4. **Ajustes**
   - Ruta: `/usuario/{ruc}/inventario/ajustes`
   - Descripción: Ajustes manuales al inventario
   - Estado: 🔨 En construcción

#### 📊 **REPORTES**
1. **General**
   - Ruta: `/usuario/{ruc}/inventario/reportes-general`
   - Descripción: Reportes y estadísticas generales
   - Estado: 🔨 En construcción

2. **Kardex**
   - Ruta: `/usuario/{ruc}/inventario/reportes-kardex`
   - Descripción: Reporte detallado de movimientos por producto
   - Estado: 🔨 En construcción

3. **Alertas** (Badge: 5)
   - Ruta: `/usuario/{ruc}/inventario/reportes-alertas`
   - Descripción: Alertas de stock bajo y vencimientos
   - Estado: 🔨 En construcción

4. **Financiero**
   - Ruta: `/usuario/{ruc}/inventario/reportes-financiero`
   - Descripción: Análisis financiero del inventario
   - Estado: 🔨 En construcción

### Características del Menú

- **Colapsable**: Botón toggle para expandir/contraer el menú
- **Responsive**: Se adapta a dispositivos móviles
- **Indicador de sección activa**: Resalta la sección actual
- **Animaciones suaves**: Transiciones profesionales
- **Iconos FontAwesome**: Para mejor identificación visual
- **Botón de regreso**: Permite volver al dashboard principal

### Componentes

```
inventario/
├── inventario-layout.component.ts     # Layout principal con sidebar
├── inventario-layout.component.html   # Template del layout
├── inventario-layout.component.scss   # Estilos del sidebar
└── pages/
    ├── dashboard/
    │   ├── inventario-dashboard.component.ts
    │   ├── inventario-dashboard.component.html
    │   └── inventario-dashboard.component.scss
    ├── salida/
    │   └── inventario-salida.component.ts
    ├── stock/
    │   └── inventario-stock.component.ts
    ├── historial-ingresos/
    │   └── inventario-historial-ingresos.component.ts
    └── historial-salidas/
        └── inventario-historial-salidas.component.ts
```

### Cómo Acceder

1. Iniciar sesión en el sistema
2. Navegar a: `http://localhost:4200/usuario/{ruc}/inventario`
3. El sistema redirigirá automáticamente al Dashboard
4. Usar el menú lateral para navegar entre secciones

### Próximos Pasos

- [ ] Implementar funcionalidad de Registrar Salida
- [ ] Implementar visualización de Stock con filtros y búsqueda
- [ ] Crear tablas para Historial de Ingresos
- [ ] Crear tablas para Historial de Salidas
- [ ] Agregar funcionalidad de exportación (Excel, PDF)
- [ ] Implementar gráficos en el Dashboard
- [ ] Agregar notificaciones de stock bajo

### Notas Técnicas

- Todos los componentes son **standalone** para mejor rendimiento
- Uso de **lazy loading** para optimizar la carga inicial
- Rutas protegidas con **AuthGuard**
- Diseño basado en el estándar visual de la aplicación
