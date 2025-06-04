export interface User {
  id: number;
  username: string;
  email: string;
  name?: string;
  phone?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  profilePicture?: string;
  roles?: string[];
  lastLogin?: string;
}
