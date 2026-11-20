import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AulaVirtualService {
  constructor(private http: HttpClient) {}

  listar(businessId: number): Observable<any[]> {
    return this.http.get<any[]>(`/api/aula/business/${businessId}`);
  }

  crear(businessId: number, datos: unknown, video?: File | null, pdf?: File | null): Observable<any> {
    const form = new FormData();
    form.append('datos', JSON.stringify(datos));
    if (video) form.append('video', video);
    if (pdf) form.append('pdf', pdf);
    return this.http.post(`/api/aula/business/${businessId}`, form);
  }

  editar(businessId: number, cursoId: number, datos: unknown, video?: File | null, pdf?: File | null): Observable<any> {
    const form = new FormData();
    form.append('datos', JSON.stringify(datos));
    if (video) form.append('video', video);
    if (pdf) form.append('pdf', pdf);
    return this.http.patch(`/api/aula/business/${businessId}/${cursoId}`, form);
  }

  actualizarContenido(businessId: number, cursoId: number, instructor: string, video?: File | null, pdf?: File | null): Observable<any> {
    const form = new FormData();
    form.append('instructor', instructor);
    if (video) form.append('video', video);
    if (pdf) form.append('pdf', pdf);
    return this.http.patch(`/api/aula/business/${businessId}/${cursoId}/contenido`, form);
  }

  guardarInstructor(businessId: number, cursoId: number, instructor: string): Observable<any> {
    return this.http.patch(`/api/aula/business/${businessId}/${cursoId}/instructor`, { instructor });
  }

  guardarCharla(businessId: number, cursoId: number, employeeIds: number[], hora: string): Observable<any> {
    return this.http.put(`/api/aula/business/${businessId}/${cursoId}/charla`, { employeeIds, hora });
  }

  cambiarLimite(businessId: number, cursoId: number, horaLimite: string): Observable<any> {
    return this.http.patch(`/api/aula/business/${businessId}/${cursoId}/limite`, { horaLimite });
  }

  importarPreguntas(businessId: number, cursoId: number, preguntas: unknown[]): Observable<any> {
    return this.http.put(`/api/aula/business/${businessId}/${cursoId}/preguntas`, { preguntas });
  }

  misCursos(): Observable<any[]> {
    return this.http.get<any[]>('/api/aula/my');
  }

  video(businessId: number, cursoId: number): Observable<Blob> {
    return this.http.get(`/api/aula/business/${businessId}/${cursoId}/video`, { responseType: 'blob' });
  }

  material(businessId: number, cursoId: number): Observable<Blob> {
    return this.http.get(`/api/aula/business/${businessId}/${cursoId}/material`, { responseType: 'blob' });
  }

  ingreso(cursoId: number): Observable<void> {
    return this.http.post<void>(`/api/aula/my/${cursoId}/ingreso`, {});
  }

  videoVisto(cursoId: number): Observable<void> {
    return this.http.post<void>(`/api/aula/my/${cursoId}/video-visto`, {});
  }

  iniciarEvaluacion(cursoId: number): Observable<{ preguntas: { texto: string; opciones: string[] }[] }> {
    return this.http.post<{ preguntas: { texto: string; opciones: string[] }[] }>(`/api/aula/my/${cursoId}/evaluacion/iniciar`, {});
  }

  responder(cursoId: number, respuestas: number[]): Observable<{ nota: number; estado: string; minimo: number; intentosUsados: number; intentos: number }> {
    return this.http.post<{ nota: number; estado: string; minimo: number; intentosUsados: number; intentos: number }>(`/api/aula/my/${cursoId}/evaluacion`, { respuestas });
  }
}
