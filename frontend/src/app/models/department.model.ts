export interface Department {
    id: number;
    name: string;
    description?: string; // Opcional, si puede ser nulo o no siempre presente
    active: boolean;
    // Otros campos que puedan ser relevantes, como createdAt, updatedAt, si los usas en el frontend
    // createdAt?: string; // o Date
    // updatedAt?: string; // o Date
}
