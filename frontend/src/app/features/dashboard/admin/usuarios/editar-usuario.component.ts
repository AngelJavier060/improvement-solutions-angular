import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserAdminService } from './user-admin.service';
import { User } from '../../../../models/user.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NotificationService } from '../../../../services/notification.service';
import { environment } from '../../../../../environments/environment';
import { ImageCacheService } from '../../../../services/image-cache.service';
import { BusinessService } from '../../../../services/business.service';
import { Business } from '../../../../models/business.model';

@Component({
  selector: 'app-editar-usuario',
  templateUrl: './editar-usuario.component.html',
  styleUrls: ['./editar-usuario.component.scss']
})
export class EditarUsuarioComponent implements OnInit {
  userForm: FormGroup;  userId: number | null = null;
  isLoading = false;
  isSubmitting = false;
  isEditMode = false;
  fileToUpload: File | null = null;  imagePreview: string | ArrayBuffer | null = null;
  imageError: string | null = null;
  isImageLoading = false;
  maxFileSize = 2 * 1024 * 1024; // 2MB en bytes
  allowedFileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  environment = environment;
  businesses: Business[] = [];
  availableRoles = [
    // IMPORTANTE: IDs deben coincidir con la BD (ver V1_0__initial_schema.sql)
    // En migraciones: primero se inserta ROLE_USER (id=1), luego ROLE_ADMIN (id=2)
    { id: 2, name: 'ROLE_ADMIN' },
    { id: 1, name: 'ROLE_USER' }
  ];  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserAdminService,
    private modalService: NgbModal,
    private notificationService: NotificationService,
    private imageCacheService: ImageCacheService,
    private businessService: BusinessService
  ) {
    this.userForm = this.fb.group({
      username: ['', [
        Validators.required, 
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z0-9_.-]*$/)
      ]],
      email: ['', [
        Validators.required, 
        Validators.email, 
        Validators.maxLength(100)
      ]],
      name: ['', [
        Validators.maxLength(100),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/)
      ]],
      phone: ['', [
        Validators.maxLength(20),
        Validators.pattern(/^[0-9+\-\s()]*$/)
      ]],
      password: ['', [
        Validators.minLength(6), 
        Validators.maxLength(100),
        // Contraseña segura (al menos una mayúscula, una minúscula y un número)
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      ]],
      confirmPassword: [''],
      userType: ['empresa', Validators.required],
      businessId: [null],
      active: [true],
      roleIds: [[], Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private extractBackendMessage(error: any): string {
    try {
      if (!error) return 'Error desconocido';
      // HttpErrorResponse de Angular
      if (error.error) {
        if (typeof error.error === 'string') {
          return error.error;
        }
        if (typeof error.error.message === 'string') {
          return error.error.message;
        }
      }
      if (typeof error.message === 'string') {
        return error.message;
      }
      // Intentar serializar
      return JSON.stringify(error);
    } catch {
      return 'Error desconocido';
    }
  }

  ngOnInit(): void {
    // Cargar empresas para el desplegable
    this.businessService.getAll().subscribe({
      next: (data) => {
        this.businesses = data;
      },
      error: () => {
        // Silenciar errores de carga de empresas para no bloquear el formulario
      }
    });
    // Inicializar validadores de businessId según el userType por defecto
    this.onUserTypeChange();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.userId = +id;
        this.isEditMode = true;
        this.loadUserData(this.userId);
      } else {
        // En modo creación, se requiere contraseña
        this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(100)]);
        this.userForm.get('confirmPassword')?.setValidators([Validators.required]);
        this.userForm.updateValueAndValidity();
        // Preseleccionar tipo por query param si existe
        this.route.queryParamMap.subscribe(q => {
          const type = q.get('type');
          if (type === 'administrador' || type === 'empresa') {
            this.userForm.get('userType')?.setValue(type);
            this.onUserTypeChange();
          }
          const businessIdParam = q.get('businessId');
          if (businessIdParam) {
            this.userForm.get('businessId')?.setValue(Number(businessIdParam));
          }
        });
      }
    });
  }

  loadUserData(id: number): void {
    this.isLoading = true;
    this.userService.getUserById(id).subscribe({
      next: (user) => {
        this.userForm.patchValue({
          username: user.username,
          email: user.email,
          name: user.name || '',
          phone: user.phone || '',
          active: user.active,
          roleIds: user.roles?.map((role: string) => {
            const foundRole = this.availableRoles.find(r => r.name === role);
            return foundRole ? foundRole.id : null;
          }).filter((id: number | null) => id !== null) || []
        });
        // Definir tipo de usuario según roles
        const isAdmin = (user.roles || []).includes('ROLE_ADMIN');
        this.userForm.get('userType')?.setValue(isAdmin ? 'administrador' : 'empresa');
        this.onUserTypeChange();
        // Precargar asociación de empresa si existe
        this.businessService.getByUserId(id).subscribe({
          next: (list) => {
            if (Array.isArray(list) && list.length > 0) {
              this.userForm.get('businessId')?.setValue(list[0].id ?? null);
            }
          },
          error: () => {}
        });
        
        // Resetear las validaciones de contraseña en modo edición
        this.userForm.get('password')?.clearValidators();
        this.userForm.get('password')?.setValidators([Validators.minLength(6), Validators.maxLength(100)]);
        this.userForm.get('confirmPassword')?.clearValidators();
        this.userForm.updateValueAndValidity();
        
        // Cargar imagen de perfil si existe
        if (user.profilePicture) {
          console.log('Cargando imagen de perfil:', user.profilePicture);
          this.isImageLoading = true;
          
          // Usar el servicio de caché de imágenes para evitar el titileo          // Preparar la ruta de la imagen con el parámetro de caché correcto (updatedAt)
          let profilePath = user.profilePicture;
          if (profilePath.startsWith('profiles/')) {
            profilePath = profilePath;
          } else if (!profilePath.includes('/')) {
            profilePath = `profiles/${profilePath}`;
          }
          
          // Usar timestamp updatedAt como busting de caché si está disponible
          const cacheBuster = user.updatedAt 
            ? new Date(user.updatedAt).getTime() 
            : new Date().getTime();
          const imagePath = `${profilePath}?cache=${cacheBuster}`;
          
          this.imageCacheService.getImage(imagePath).subscribe({
            next: (imageUrl) => {
              this.imagePreview = imageUrl;
              console.log('URL de imagen de perfil (desde caché):', this.imagePreview);
            },
            error: (err) => {
              console.error('Error al cargar la imagen desde caché:', err);
              // En caso de error con el servicio de caché, usamos el método anterior como fallback
              this.imagePreview = `${environment.apiUrl}/api/files/${user.profilePicture}?cache=${cacheBuster}`;
            }
          });
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del usuario', error);
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      return;
    }    this.isSubmitting = true;
    const userData: any = {
      username: this.userForm.get('username')?.value,
      email: this.userForm.get('email')?.value,
      name: this.userForm.get('name')?.value,
      phone: this.userForm.get('phone')?.value,
      password: this.userForm.get('password')?.value,
      active: this.userForm.get('active')?.value,
      roleIds: this.userForm.get('roleIds')?.value
    };

    // Si la contraseña está vacía, eliminarla del objeto
    if (!userData.password) {
      delete userData.password;
    }    // Flujo de trabajo para guardar usuario y foto de perfil
    if (this.isEditMode) {
      // Caso de edición de usuario
      if (this.userId) {        if (this.fileToUpload) {
          // Primero subir la foto si hay una nueva
          this.isSubmitting = true;            this.userService.uploadProfilePicture(this.userId, this.fileToUpload).subscribe({
            next: (response: any) => {
              console.log('Respuesta de subida de imagen (edición):', response);
              // La API devuelve la respuesta en formato SuccessResponse con un campo 'data'
              userData.profilePicture = response.data || (typeof response === 'string' ? response : null);
              console.log('Ruta de imagen guardada:', userData.profilePicture);
              // Ahora actualizamos el usuario con la nueva ruta de imagen
              this.userService.updateUser(this.userId as number, userData).subscribe({
                next: () => this.finalizeAfterAssociation(this.userId as number),
                error: (error: any) => this.handleSaveError(error)
              });
            },            error: (error: any) => {
              console.error('Error al subir imagen de perfil', error);
              this.isSubmitting = false;
              this.isImageLoading = false;
              this.imageError = 'Error al subir la imagen. Posiblemente el Content-Type no fue correctamente configurado. Intente de nuevo.';
              
              // Mostrar un mensaje pero continuar guardando el usuario aunque la imagen falle
              this.userService.updateUser(this.userId as number, userData).subscribe({
                next: () => this.finalizeAfterAssociation(this.userId as number),
                error: (error: any) => this.handleSaveError(error)
              });
            }
          });
        } else {
          // No hay nueva foto, solo actualizar usuario
          this.userService.updateUser(this.userId, userData).subscribe({
            next: () => this.finalizeAfterAssociation(this.userId as number),
            error: (error) => this.handleSaveError(error)
          });
        }
      }
    } else {
      // Caso de creación de usuario
      this.userService.createUser(userData).subscribe({
        next: (createdUser) => {          // Si hay un archivo para subir en modo creación
          if (this.fileToUpload && createdUser && createdUser.id) {
            this.userService.uploadProfilePicture(createdUser.id, this.fileToUpload).subscribe({              next: (uploadResponse: any) => {
              // Actualizar el usuario con la ruta de la imagen
              console.log('Respuesta de subida de imagen:', uploadResponse);
              let profilePicturePath;
              if (uploadResponse && uploadResponse.data) {
                profilePicturePath = uploadResponse.data;
              } else if (uploadResponse && typeof uploadResponse === 'string') {
                profilePicturePath = uploadResponse;
              }
              console.log('Ruta de imagen guardada (creación):', profilePicturePath);
              
              const updateData = { profilePicture: profilePicturePath };
              this.userService.updateUser(createdUser.id, updateData).subscribe({
                next: () => this.finalizeAfterAssociation(createdUser.id),
                error: () => this.finalizeAfterAssociation(createdUser.id) // Continuar aunque falle la actualización
              });
            },
            error: (error: any) => {
              console.error('Error al subir imagen de perfil', error);
              this.finalizeAfterAssociation(createdUser.id); // Continuar aunque la imagen falle
            }
          });
          } else {
            this.finalizeAfterAssociation(createdUser.id);
          }
        },
        error: (error) => this.handleSaveError(error)
      });
    }
  }  
  private finalizeAfterAssociation(userId: number): void {
    const userType = this.userForm.get('userType')?.value;
    const businessId = this.userForm.get('businessId')?.value;
    if (userType === 'empresa' && businessId) {
      this.businessService.addUserToBusiness(Number(businessId), userId).subscribe({
        next: () => this.handleSaveSuccess(),
        error: () => this.handleSaveSuccess()
      });
    } else {
      // Si es administrador, remover cualquier asociación previa
      this.businessService.getByUserId(userId).subscribe({
        next: (list) => {
          if (Array.isArray(list) && list.length > 0) {
            // Remover asociaciones en cadena y finalizar
            let pending = list.length;
            list.forEach(b => {
              if (b.id != null) {
                this.businessService.removeUserFromBusiness(Number(b.id), userId).subscribe({
                  next: () => { if (--pending === 0) this.handleSaveSuccess(); },
                  error: () => { if (--pending === 0) this.handleSaveSuccess(); }
                });
              } else {
                if (--pending === 0) this.handleSaveSuccess();
              }
            });
          } else {
            this.handleSaveSuccess();
          }
        },
        error: () => this.handleSaveSuccess()
      });
    }
  }
  onUserTypeChange(): void {
    const type = this.userForm.get('userType')?.value;
    const businessCtrl = this.userForm.get('businessId');
    if (type === 'empresa') {
      businessCtrl?.setValidators([Validators.required]);
      // Asegurar que no tenga rol de administrador
      const roleIdsControl = this.userForm.get('roleIds');
      const currentRoleIds: number[] = [...(roleIdsControl?.value || [])];
      const adminRole = this.availableRoles.find(r => r.name === 'ROLE_ADMIN');
      if (adminRole) {
        const idx = currentRoleIds.indexOf(adminRole.id);
        if (idx !== -1) {
          currentRoleIds.splice(idx, 1);
          roleIdsControl?.setValue(currentRoleIds);
        }
      }
    } else {
      businessCtrl?.clearValidators();
      businessCtrl?.setValue(null);
      // Asegurar que tenga rol de administrador
      const roleIdsControl = this.userForm.get('roleIds');
      const currentRoleIds: number[] = [...(roleIdsControl?.value || [])];
      const adminRole = this.availableRoles.find(r => r.name === 'ROLE_ADMIN');
      if (adminRole && !currentRoleIds.includes(adminRole.id)) {
        currentRoleIds.push(adminRole.id);
        roleIdsControl?.setValue(currentRoleIds);
      }
    }
    businessCtrl?.updateValueAndValidity();
  }
  handleSaveSuccess(): void {
    this.isSubmitting = false;
    const mensaje = this.isEditMode ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente';
    this.notificationService.success(mensaje);
    this.router.navigate(['/dashboard/admin/usuarios']);
  }

  handleSaveError(error: any): void {
    console.error('Error al guardar usuario', error);
    this.isSubmitting = false;
    const backendMessage = this.extractBackendMessage(error);
    this.notificationService.error('Error al guardar el usuario: ' + backendMessage);
  }  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validar tamaño del archivo
      if (file.size > this.maxFileSize) {
        this.imageError = `El archivo es demasiado grande. El tamaño máximo permitido es ${this.maxFileSize / (1024 * 1024)}MB.`;
        input.value = '';
        return;
      }
      
      // Validar tipo de archivo
      if (!this.allowedFileTypes.includes(file.type)) {
        this.imageError = 'Solo se permiten archivos JPG o PNG.';
        input.value = '';
        return;
      }
      
      this.imageError = null;
      this.isImageLoading = true;
      
      // Crear una vista previa optimizada y redimensionar la imagen
      this.resizeImage(file, 400, 400).then(
        (resizedImage: File) => {
          this.fileToUpload = resizedImage;
          
          // Vista previa de la imagen
          const reader = new FileReader();
          reader.onload = () => {
            this.imagePreview = reader.result;
          };
          reader.readAsDataURL(this.fileToUpload);
        },
        (error) => {
          // Si hay error en el redimensionamiento, usar la imagen original
          console.error("Error al redimensionar la imagen:", error);
          this.fileToUpload = file;
          
          const reader = new FileReader();
          reader.onload = () => {
            this.imagePreview = reader.result;
          };
          reader.readAsDataURL(this.fileToUpload);
        }
      );
    }
  }
  
  // Método para redimensionar imágenes antes de subirlas
  private resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        image.src = e.target.result;
        
        image.onload = () => {
          let width = image.width;
          let height = image.height;
          
          // Calcular las dimensiones respetando la relación de aspecto
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }
          
          // Crear un canvas para redimensionar
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          // Dibujar la imagen redimensionada
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo crear el contexto del canvas'));
            return;
          }
          
          ctx.drawImage(image, 0, 0, width, height);
          
          // Convertir a blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('No se pudo crear el blob'));
                return;
              }
              
              // Crear nuevo archivo con el blob redimensionado
              const newFile = new File(
                [blob],
                file.name,
                { 
                  type: file.type,
                  lastModified: Date.now() 
                }
              );
              
              resolve(newFile);
            },
            file.type,
            0.8 // calidad de compresión
          );
        };
        
        image.onerror = () => {
          reject(new Error('Error al cargar la imagen para redimensionar'));
        };
      };
      
      reader.readAsDataURL(file);
    });
  }  onImageLoaded(): void {
    console.log('Imagen cargada correctamente');
    this.isImageLoading = false;
    
    // Aplicar un pequeño retraso para asegurar que la animación sea visible
    // y evitar el titileo entre imágenes
    setTimeout(() => {
      const profileImg = document.querySelector('.profile-picture') as HTMLElement;
      if (profileImg) {
        profileImg.classList.add('loaded');
        // No necesitamos manipular directamente los estilos aquí,
        // ya que las clases CSS manejarán la animación
      }
    }, 100);

    // Precargar la imagen para futuras visitas
    if (this.imagePreview && typeof this.imagePreview === 'string') {
      // Almacenar en caché del navegador
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'image';
      preloadLink.href = this.imagePreview;
      document.head.appendChild(preloadLink);
    }
  }

  defaultAvatar: string = 'assets/img/default-avatar.svg';

  onImageError(): void {
    console.error('Error al cargar la imagen');
    this.isImageLoading = false;
    this.imagePreview = this.defaultAvatar;
  }

  clearImage(): void {
    this.fileToUpload = null;
    this.imagePreview = null;
    this.imageError = null;
  }
  
  getSelectedBusinessLabel(): string {
    const id = this.userForm.get('businessId')?.value;
    if (!id) return '—';
    const found = this.businesses.find(b => Number(b.id) === Number(id));
    if (!found) return '—';
    return `${found.ruc ? found.ruc + ' - ' : ''}${found.name || found.nameShort || 'Empresa'}`;
  }
  
  passwordMatchValidator(group: FormGroup): {[key: string]: any} | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    if (password && confirmPassword && password !== confirmPassword) {
      return { 'passwordMismatch': true };
    }
    return null;
  }

  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onRoleSelectionChange(event: any, roleId: number): void {
    const roleIdsControl = this.userForm.get('roleIds');
    const currentRoleIds = [...(roleIdsControl?.value || [])];
    
    if (event.target.checked) {
      if (!currentRoleIds.includes(roleId)) {
        currentRoleIds.push(roleId);
      }
    } else {
      const index = currentRoleIds.indexOf(roleId);
      if (index !== -1) {
        currentRoleIds.splice(index, 1);
      }
    }
    
    roleIdsControl?.setValue(currentRoleIds);
  }

  isRoleSelected(roleId: number): boolean {
    const roleIds = this.userForm.get('roleIds')?.value || [];
    return roleIds.includes(roleId);
  }

  cancel(): void {
    this.router.navigate(['/dashboard/admin/usuarios']);
  }
}
