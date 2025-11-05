# Configuración de Cloudinary para Almacenamiento de Archivos

## ¿Por qué Cloudinary?

Las imágenes y archivos enviados en el sistema de mensajería ahora se almacenan en **Cloudinary** para garantizar:
- ✅ **Persistencia permanente** - Los archivos no se pierden al reiniciar el servidor
- ✅ **Almacenamiento ilimitado** - Plan gratuito: 25GB de almacenamiento
- ✅ **URLs permanentes** - Los enlaces nunca caducan
- ✅ **Optimización automática** - Cloudinary optimiza las imágenes
- ✅ **CDN global** - Carga rápida desde cualquier ubicación

---

## Paso 1: Crear Cuenta en Cloudinary

1. Ir a: https://cloudinary.com/
2. Hacer clic en **"Sign Up for Free"**
3. Completar el formulario de registro
4. Verificar el email

---

## Paso 2: Obtener Credenciales

Una vez dentro del dashboard de Cloudinary:

1. En la página principal (Dashboard) verás:
   ```
   Product Environment Credentials

   Cloud name: tu_cloud_name
   API Key:    123456789012345
   API Secret: abc123XYZ789def456GHI
   ```

2. **Copiar estos 3 valores**, los necesitarás para la configuración.

---

## Paso 3: Configurar Variables de Entorno

### En Desarrollo Local

Crear o editar el archivo `.env` en la raíz del proyecto:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abc123XYZ789def456GHI
```

**⚠️ IMPORTANTE:** Nunca subas el archivo `.env` a Git. Ya está en `.gitignore`.

### En Heroku (Producción)

Ejecutar estos comandos en la terminal:

```bash
heroku config:set CLOUDINARY_CLOUD_NAME=tu_cloud_name
heroku config:set CLOUDINARY_API_KEY=123456789012345
heroku config:set CLOUDINARY_API_SECRET=abc123XYZ789def456GHI
```

O configurar desde el dashboard de Heroku:
1. Ir a tu app en Heroku
2. Click en **"Settings"**
3. Click en **"Reveal Config Vars"**
4. Agregar las 3 variables

---

## Paso 4: Verificar Configuración

Al iniciar el servidor, deberías ver en los logs:

```
☁️ Cloudinary configurado: {
  cloud_name: '✓ Configurado',
  api_key: '✓ Configurado',
  api_secret: '✓ Configurado'
}
```

Si ves `⚠️ Usando demo`, las variables de entorno no están configuradas correctamente.

---

## Estructura de Archivos en Cloudinary

Los archivos se organizan automáticamente:

```
Cloudinary Media Library/
└── tribus/
    └── messages/
        ├── 1730769600000-123456789.jpg
        ├── 1730769700000-987654321.pdf
        └── 1730769800000-456789123.png
```

---

## Límites del Plan Gratuito

| Característica | Límite |
|---------------|--------|
| Almacenamiento | 25 GB |
| Transformaciones | 25,000/mes |
| Ancho de banda | 25 GB/mes |
| Archivos | Ilimitados |

Para proyectos pequeños y medianos, esto es más que suficiente.

---

## Solución de Problemas

### Error: "Invalid credentials"
- Verificar que las variables de entorno estén correctamente copiadas
- Revisar que no haya espacios extra al inicio o final

### Error: "Upload failed"
- Verificar que el archivo sea menor a 10MB
- Revisar que el tipo de archivo esté permitido

### Error: "Demo mode"
- Las variables de entorno no están configuradas
- Seguir los pasos del Paso 3

---

## URLs de Referencia

- Dashboard Cloudinary: https://console.cloudinary.com/
- Documentación: https://cloudinary.com/documentation
- Límites del plan Free: https://cloudinary.com/pricing
