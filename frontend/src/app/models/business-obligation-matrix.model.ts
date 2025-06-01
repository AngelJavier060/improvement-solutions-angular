export interface BusinessObligationMatrix {
  id?: number;
  business: {
    id: number;
  };
  obligationMatrix?: {
    id: number;
  };
  name: string;
  obligationType?: string;
  description: string;
  dueDate?: string | Date;
  status?: string;
  priority?: string;
  responsiblePerson?: string;
  completed?: boolean;
  completionDate?: string | Date;
  createdAt?: string;
  updatedAt?: string;
}
