import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImageCacheService {
  private imageCache: Map<string, string> = new Map();
  private defaultImage = 'assets/img/user-placeholder.svg';
  private loadingImages: Map<string, BehaviorSubject<string>> = new Map();

  constructor(private http: HttpClient) {}

  /**
   * Obtiene una imagen del API o de la caché si ya fue cargada antes
   * @param imagePath Ruta relativa de la imagen (sin la URL base del API)
   * @returns Observable con la URL de la imagen
   */
  getImage(imagePath: string | null | undefined): Observable<string> {
    if (!imagePath) {
      return of(this.defaultImage);
    }

    // Generar la clave para el caché
    const cacheKey = imagePath;
    
    // Si la imagen está en caché, retornarla inmediatamente
    if (this.imageCache.has(cacheKey)) {
      return of(this.imageCache.get(cacheKey) || this.defaultImage);
    }
    
    // Si la imagen ya está cargando, devolver el observable existente
    if (this.loadingImages.has(cacheKey)) {
      return this.loadingImages.get(cacheKey)!.asObservable();
    }
    
    // Crear un nuevo subject para esta carga
    const subject = new BehaviorSubject<string>(this.defaultImage);
    this.loadingImages.set(cacheKey, subject);
    
    // Construir la URL completa para la imagen, asegurando la ruta correcta
    let imageUrl: string;
      // Determinar si es una imagen de perfil y construir la URL adecuada
    if (imagePath.includes('profiles/') || (!imagePath.includes('/') && (imagePath.includes('-') || imagePath.includes('_')))) {
      // Es una imagen de perfil con formato UUID o con formato username_timestamp
      const profileName = imagePath.includes('/') ? imagePath.split('/').pop() : imagePath;
      imageUrl = `${environment.apiUrl}/api/files/profiles/${profileName}`;
    } else {
      // Otras imágenes
      imageUrl = `${environment.apiUrl}/api/files/${imagePath}`;
    }
    
    // Añadir el parámetro de caché si existe en la ruta original
    if (imagePath.includes('?cache=')) {
      const cacheBuster = imagePath.split('?cache=')[1];
      imageUrl = `${imageUrl}?cache=${cacheBuster}`;
    }
    
    // Crear un objeto Image para precargar la imagen
    const img = new Image();
    img.onload = () => {
      // La imagen se cargó correctamente, actualizamos la caché y notificamos
      this.imageCache.set(cacheKey, imageUrl);
      subject.next(imageUrl);
      subject.complete();
      this.loadingImages.delete(cacheKey);
    };
    
    img.onerror = () => {
      // Si hay error, usar la imagen por defecto
      console.error('Error cargando imagen:', imageUrl);
      subject.next(this.defaultImage);
      subject.complete();
      this.loadingImages.delete(cacheKey);
    };
    
    // Iniciar la carga de la imagen
    img.src = imageUrl;
    
    return subject.asObservable();
  }
  
  /**
   * Limpia la caché de imágenes
   */
  clearCache(): void {
    this.imageCache.clear();
  }
}
