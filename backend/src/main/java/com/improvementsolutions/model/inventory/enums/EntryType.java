package com.improvementsolutions.model.inventory.enums;

public enum EntryType {
    COMPRA,           // Compra a proveedor
    DEVOLUCION,       // Devolución de trabajador o cliente
    TRANSFERENCIA,    // Transferencia de otra bodega
    AJUSTE,           // Ajuste de inventario (inventario físico)
    DONACION          // Donación recibida
}
