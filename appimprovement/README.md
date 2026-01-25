# 📱 Improvement Solutions - App Móvil

Aplicación móvil Flutter para el sistema Improvement Solutions.

## 🚀 Configuración

### Backend
- **Servidor:** `https://improvement-solution.com`
- **Configurado en:** `lib/config/app_config.dart`

### Credenciales de Prueba
- Usuario: `javier` / Contraseña: `12345`
- Usuario: `orientservices` / Contraseña: (tu contraseña)

---

## 📱 Compilar e Instalar en Android

### 1. Preparar el Teléfono
1. Activa **Opciones de Desarrollador**:
   - Ve a **Ajustes → Acerca del teléfono**
   - Toca **Número de compilación** 7 veces
2. Activa **Depuración USB**:
   - Ve a **Ajustes → Opciones de desarrollador**
   - Activa **Depuración USB**
3. Conecta el teléfono por USB
4. Acepta el mensaje de autorización

### 2. Verificar Conexión
```bash
flutter devices
```

### 3. Ejecutar en Teléfono (Debug)
```bash
flutter run
```

### 4. Compilar APK (Release)
```bash
flutter build apk --release
```
El APK estará en: `build\app\outputs\flutter-apk\app-release.apk`

---

## 🔧 Comandos Útiles

```bash
# Ver dispositivos conectados
flutter devices

# Ejecutar en teléfono
flutter run

# Compilar APK
flutter build apk --release

# Instalar APK manualmente
adb install build\app\outputs\flutter-apk\app-release.apk

# Limpiar proyecto
flutter clean
flutter pub get

# Ver logs
flutter logs
```

---

## ⚠️ Nota sobre CORS

Si ves errores CORS al ejecutar `flutter run -d chrome` (Flutter Web), es **normal y esperado**.

**Solución:** Usa Flutter Mobile o Desktop:
- ✅ Android: `flutter run` (sin CORS)
- ✅ iOS: `flutter run -d ios` (sin CORS)
- ✅ Windows: `flutter run -d windows` (sin CORS)
- ❌ Web: Tiene restricciones CORS con servidores externos

**Las apps nativas NO tienen restricciones CORS.**

---

## 📂 Estructura del Proyecto

```
lib/
├── config/
│   └── app_config.dart          # Configuración del servidor
├── services/
│   ├── auth_service.dart        # Autenticación
│   ├── business_service.dart    # Empresas
│   ├── employees_service.dart   # Empleados
│   └── legal_service.dart       # Matriz legal
├── login_screen.dart            # Pantalla de login
├── main.dart                    # Pantalla principal
├── employees_list_screen.dart   # Lista de empleados
├── employee_detail_screen.dart  # Detalle de empleado
└── security_legal_screen.dart   # Matriz legal
```

---

## 🎯 Funcionalidades

- ✅ Login con usuario/email
- ✅ Vista de empresas del usuario
- ✅ Lista de empleados por empresa
- ✅ Detalle de empleado con foto
- ✅ Matriz legal de seguridad industrial
- ✅ Navegación entre módulos

---

## 🔨 Solución de Problemas

### "No devices found"
```bash
adb devices
adb kill-server
adb start-server
```

### "Gradle build failed"
```bash
flutter clean
flutter pub get
flutter build apk
```

### Errores de compilación
```bash
# Limpiar todo
flutter clean
flutter pub get

# Actualizar Flutter
flutter upgrade
```

---

## 📦 Dependencias

- `http: ^1.2.2` - Peticiones HTTP
- `cupertino_icons: ^1.0.8` - Iconos iOS

---

## 🚀 Inicio Rápido

```bash
# 1. Instalar dependencias
flutter pub get

# 2. Conectar teléfono por USB

# 3. Ejecutar
flutter run

# ¡Listo!
```

---

## 📝 Notas Importantes

- ✅ La app está configurada para **producción** (`https://improvement-solution.com`)
- ✅ **NO necesitas backend local** para desarrollo móvil
- ✅ Las apps nativas **NO tienen restricciones CORS**
- ❌ **NO uses Flutter Web** para este proyecto (tiene CORS)
- ✅ Compila para **Android/iOS/Windows** sin problemas

---

## 📱 Plataformas Soportadas

- ✅ Android
- ✅ iOS
- ✅ Windows
- ✅ macOS
- ✅ Linux
- ⚠️ Web (limitado por CORS)
