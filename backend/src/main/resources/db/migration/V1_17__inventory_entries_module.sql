-- =====================================================
-- MÓDULO 2: ENTRADAS DE INVENTARIO
-- Registra cada vez que productos físicos entran a bodega
-- =====================================================

-- Tabla: inventory_entries (Cabecera de Entrada)
-- Representa el acta de recepción general
CREATE TABLE IF NOT EXISTS inventory_entries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT NOT NULL,
    entry_number VARCHAR(50) NOT NULL COMMENT 'Número de documento: factura, guía de remisión, etc.',
    entry_date DATE NOT NULL COMMENT 'Fecha exacta de cuándo llegaron físicamente',
    entry_type VARCHAR(30) NOT NULL COMMENT 'COMPRA, DEVOLUCION, TRANSFERENCIA, AJUSTE, DONACION',
    supplier_id BIGINT NULL COMMENT 'De quién vienen los productos (proveedor)',
    origin VARCHAR(200) NULL COMMENT 'Origen alternativo: bodega central, trabajador, etc.',
    received_by VARCHAR(100) NOT NULL COMMENT 'Quién recibió físicamente (bodeguero)',
    authorized_by VARCHAR(100) NULL COMMENT 'Quién autorizó la compra (jefe, supervisor)',
    document_image VARCHAR(255) NULL COMMENT 'Foto de factura o guía escaneada',
    notes TEXT NULL COMMENT 'Observaciones generales',
    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADO' COMMENT 'BORRADOR, CONFIRMADO, ANULADO',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES inventory_suppliers(id) ON DELETE SET NULL,
    
    INDEX idx_entry_business (business_id),
    INDEX idx_entry_date (entry_date),
    INDEX idx_entry_number (entry_number),
    INDEX idx_entry_supplier (supplier_id),
    UNIQUE KEY uk_entry_number_business (business_id, entry_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: inventory_entry_details (Detalle línea por línea)
-- Cada producto específico que llega en la entrada
CREATE TABLE IF NOT EXISTS inventory_entry_details (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entry_id BIGINT NOT NULL COMMENT 'Cabecera de entrada',
    variant_id BIGINT NOT NULL COMMENT 'Qué producto-variante específico llegó',
    quantity DECIMAL(10,2) NOT NULL COMMENT 'Cuántos llegaron',
    unit_cost DECIMAL(10,4) NOT NULL COMMENT 'Costo unitario SIN IVA',
    tax_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Porcentaje de IVA (ej: 12.00)',
    tax_amount DECIMAL(10,4) DEFAULT 0.00 COMMENT 'Valor del IVA por unidad',
    total_cost DECIMAL(12,4) NOT NULL COMMENT 'Costo total = quantity * (unit_cost + tax_amount)',
    lot_number VARCHAR(100) NULL COMMENT 'Lote del proveedor para trazabilidad',
    manufacturing_date DATE NULL COMMENT 'Fecha de fabricación',
    expiration_date DATE NULL COMMENT 'Fecha de vencimiento',
    warehouse_location VARCHAR(100) NULL COMMENT 'Ubicación física: Pasillo A, Estante 12, Nivel B3',
    item_condition VARCHAR(30) DEFAULT 'NUEVO' COMMENT 'NUEVO, USADO, REACONDICIONADO',
    notes TEXT NULL COMMENT 'Observaciones específicas del producto',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (entry_id) REFERENCES inventory_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES inventory_variants(id) ON DELETE RESTRICT,
    
    INDEX idx_detail_entry (entry_id),
    INDEX idx_detail_variant (variant_id),
    INDEX idx_detail_lot (lot_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: inventory_movements (Kardex - Movimientos de Inventario)
-- Registra TODOS los movimientos (entradas, salidas) para auditoría y costeo
CREATE TABLE IF NOT EXISTS inventory_movements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT NOT NULL,
    variant_id BIGINT NOT NULL COMMENT 'Variante afectada',
    movement_date DATETIME NOT NULL COMMENT 'Fecha y hora del movimiento',
    movement_type VARCHAR(20) NOT NULL COMMENT 'ENTRADA, SALIDA, AJUSTE',
    document_type VARCHAR(30) NULL COMMENT 'COMPRA, VENTA, DEVOLUCION, TRANSFERENCIA, etc.',
    document_number VARCHAR(50) NULL COMMENT 'Número de documento relacionado',
    quantity DECIMAL(10,2) NOT NULL COMMENT 'Cantidad (positivo=entrada, negativo=salida)',
    unit_cost DECIMAL(10,4) NOT NULL COMMENT 'Costo unitario al momento del movimiento',
    balance_qty DECIMAL(10,2) NOT NULL COMMENT 'Saldo después del movimiento',
    balance_cost DECIMAL(10,4) NOT NULL COMMENT 'Costo promedio después del movimiento',
    reference_id BIGINT NULL COMMENT 'ID de la entrada/salida/ajuste origen',
    notes TEXT NULL,
    created_by VARCHAR(100) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES inventory_variants(id) ON DELETE RESTRICT,
    
    INDEX idx_movement_business (business_id),
    INDEX idx_movement_variant (variant_id),
    INDEX idx_movement_date (movement_date),
    INDEX idx_movement_type (movement_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: inventory_lots (Trazabilidad por Lote)
-- Para rastrear lotes específicos (útil para devoluciones, vencimientos, recalls)
CREATE TABLE IF NOT EXISTS inventory_lots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT NOT NULL,
    variant_id BIGINT NOT NULL,
    lot_number VARCHAR(100) NOT NULL COMMENT 'Número de lote',
    manufacturing_date DATE NULL,
    expiration_date DATE NULL,
    current_qty DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Cantidad disponible del lote',
    warehouse_location VARCHAR(100) NULL,
    item_condition VARCHAR(30) DEFAULT 'NUEVO',
    status VARCHAR(20) DEFAULT 'ACTIVO' COMMENT 'ACTIVO, VENCIDO, AGOTADO',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES inventory_variants(id) ON DELETE CASCADE,
    
    INDEX idx_lot_business (business_id),
    INDEX idx_lot_variant (variant_id),
    INDEX idx_lot_number (lot_number),
    INDEX idx_lot_expiration (expiration_date),
    UNIQUE KEY uk_lot_variant_number (business_id, variant_id, lot_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentarios sobre el esquema
-- =====================================================
-- FLUJO DE ENTRADA:
-- 1. Se crea un registro en inventory_entries (cabecera)
-- 2. Por cada producto se crea un inventory_entry_details
-- 3. Por cada detalle se:
--    a) Actualiza inventory_variants.current_qty (suma cantidad)
--    b) Recalcula inventory_variants.unit_cost (promedio ponderado)
--    c) Crea registro en inventory_movements (para kardex)
--    d) Crea/actualiza inventory_lots (si hay lote)
--
-- COSTEO PROMEDIO PONDERADO:
-- Fórmula: (stock_anterior * costo_anterior + cantidad_nueva * costo_nuevo) / (stock_anterior + cantidad_nueva)
-- Ejemplo: Tengo 20 cascos a $15 = $300 total
--          Entran 50 cascos a $17.36 = $868 total
--          Nuevo promedio: (300 + 868) / (20 + 50) = $16.69 por casco
-- =====================================================
