# 🚨 Solución al Error CORS

## ❌ El Problema

Estás ejecutando Flutter **Web** (navegador) que tiene restricciones CORS:
```
Access to fetch at 'https://improvement-solution.com/api/auth/login' 
from origin 'http://localhost:61088' has been blocked by CORS policy
```

## ✅ La Solución

**NO uses Flutter Web.** Usa Flutter **Android** o **Desktop**.

---

## 🎯 Opción 1: Emulador Android (RECOMENDADO)

### Paso 1: Lanzar el emulador
```bash
flutter emulators --launch Small_Phone
```

### Paso 2: Esperar 10-15 segundos a que inicie

### Paso 3: Verificar que está listo
```bash
flutter devices
```

Deberías ver:
```
sdk gphone64 x86 64 (mobile) • emulator-5554 • android-x64
```

### Paso 4: Ejecutar en el emulador
```bash
flutter run -d emulator-5554
```

**✅ NO habrá error CORS en Android**

---

## 🎯 Opción 2: Teléfono Físico (MEJOR)

### Paso 1: Activar depuración USB
1. Ve a **Ajustes → Acerca del teléfono**
2. Toca **Número de compilación** 7 veces
3. Ve a **Opciones de desarrollador**
4. Activa **Depuración USB**

### Paso 2: Conectar por USB

### Paso 3: Verificar conexión
```bash
flutter devices
```

### Paso 4: Ejecutar
```bash
flutter run
```

**✅ NO habrá error CORS en teléfono físico**

---

## 🎯 Opción 3: Especificar Dispositivo

Si tienes múltiples dispositivos, especifica cuál usar:

```bash
# Ver dispositivos
flutter devices

# Ejecutar en Android (emulador o físico)
flutter run -d <device-id>

# Ejemplo:
flutter run -d emulator-5554
flutter run -d SM-G973F
```

---

## ❌ NO Usar Flutter Web

Cuando ejecutas `flutter run` y eliges:
- ❌ **[1]: Windows** → Requiere Visual Studio (no funciona)
- ❌ **[2]: Chrome** → Error CORS ❌
- ❌ **[3]: Edge** → Error CORS ❌

**Solución:** Lanza el emulador ANTES de ejecutar `flutter run`:

```bash
# 1. Lanzar emulador primero
flutter emulators --launch Small_Phone

# 2. Esperar 10 segundos

# 3. Ejecutar (detectará el emulador automáticamente)
flutter run
```

---

## 🔧 Si el Emulador No Aparece

```bash
# Verificar que Android SDK está instalado
flutter doctor

# Listar emuladores
flutter emulators

# Si no hay emuladores, crear uno:
flutter emulators --create

# O usar Android Studio:
# Tools → Device Manager → Create Device
```

---

## 📱 Resumen

| Plataforma | CORS | Estado |
|------------|------|--------|
| Android Emulador | ✅ Sin CORS | ✅ Funciona |
| Android Físico | ✅ Sin CORS | ✅ Funciona |
| iOS | ✅ Sin CORS | ✅ Funciona |
| Windows Desktop | ✅ Sin CORS | ❌ Requiere Visual Studio |
| Chrome/Edge Web | ❌ Con CORS | ❌ NO funciona |

---

## 🚀 Comando Rápido

```bash
# TODO EN UNO:
flutter emulators --launch Small_Phone && timeout /t 15 && flutter run -d emulator-5554
```

O simplemente:

```bash
# 1. Lanzar emulador
flutter emulators --launch Small_Phone

# 2. Esperar 15 segundos

# 3. En otra terminal:
flutter run
```

---

## ✅ Resultado Esperado

Cuando ejecutes en Android:
- ✅ La app se instalará en el emulador/teléfono
- ✅ Se conectará a `https://improvement-solution.com`
- ✅ **NO habrá error CORS**
- ✅ Podrás hacer login sin problemas
- ✅ Todo funcionará correctamente

---

## 🎯 Próximos Pasos

1. **Cierra** cualquier ventana de Chrome/Edge que esté ejecutando la app
2. **Lanza** el emulador: `flutter emulators --launch Small_Phone`
3. **Espera** 15 segundos
4. **Ejecuta**: `flutter run`
5. **Disfruta** de la app sin errores CORS ✅
