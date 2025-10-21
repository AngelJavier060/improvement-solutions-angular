package com.improvementsolutions.model.inventory.enums;

public enum EntryStatus {
    BORRADOR,    // No afecta stock aún
    CONFIRMADO,  // Afecta stock
    ANULADO      // No afecta stock (reversado)
}
