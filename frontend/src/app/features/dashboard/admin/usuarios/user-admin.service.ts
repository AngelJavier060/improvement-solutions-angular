import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { User } from '../../../../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserAdminService {
  private baseUrl = `${environment.apiUrl}/api/admin/users`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene la lista de todos los usuarios
   */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.baseUrl);
  }

  /**
   * Obtiene un usuario por su ID
   */
  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }
  /**
   * Actualiza un usuario existente
   */
  updateUser(id: number, userData: any): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/${id}`, userData);
  }
  
  /**
   * Crea un nuevo usuario
   */
  createUser(userData: any): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}`, userData);
  }

  /**
   * Elimina un usuario
   */
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }  /**
   * Sube una imagen de perfil para un usuario
   */  uploadProfilePicture(userId: number, file: File): Observable<any> {
    // Verificar que el archivo existe y es válido
    if (!file || !(file instanceof File)) {
      console.error('Error: Se intentó subir un archivo inválido', file);
      return throwError(() => new Error('Archivo inválido o no proporcionado'));
    }
    
    console.log('Subiendo archivo:', file.name, 'tipo:', file.type, 'tamaño:', file.size);
    const formData = new FormData();
    formData.append('file', file, file.name);
    
    // Al no especificar Content-Type, el navegador lo configura automáticamente como multipart/form-data
    return this.http.post(
      `${this.baseUrl}/${userId}/profile-picture`, 
      formData,
      {
        reportProgress: true,
        observe: 'body'
      }    ).pipe(
      tap(response => {
        console.log('Respuesta del servidor después de subir imagen:', response);
        
        // Limpiar cualquier caché asociada con este usuario
        const profileImageUrls = new Map<number, string>();
        this.getUsers().subscribe(users => {
          // Forzar una actualización completa de la lista de usuarios
          console.log('Usuarios actualizados después de cambio de imagen');
        });
      })
    );
  }

  /**
   * Activa o desactiva un usuario
   */
  toggleUserActive(userId: number): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/${userId}/toggle-active`, {});
  }
}
