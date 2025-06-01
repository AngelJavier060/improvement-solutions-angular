import { Department } from './department.model';

export interface Position {
    id?: number;
    name: string;
    description?: string;
    departmentId?: number;
    department?: Department;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}
