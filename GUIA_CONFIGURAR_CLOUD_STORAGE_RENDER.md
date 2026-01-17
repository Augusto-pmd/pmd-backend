# 📦 Guía Paso a Paso: Configurar Cloud Storage en Render

Esta guía te ayudará a configurar Google Drive o Dropbox en Render para que los documentos de trabajo se puedan descargar correctamente.

## ❗ Problema Actual

En Render, los archivos locales no persisten después de reiniciar el servicio. Si intentas descargar un documento guardado localmente, obtendrás un error 404 "File not found".

**Solución:** Configurar cloud storage (Google Drive o Dropbox) para que los archivos se guarden en la nube.

---

## 🎯 Opción 1: Google Drive (Recomendado)

### Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Si no tienes cuenta, crea una (es gratuita)
3. Haz clic en el selector de proyectos (arriba a la izquierda)
4. Haz clic en **"New Project"**
5. Ingresa un nombre para el proyecto (ej: "PMD Storage")
6. Haz clic en **"Create"**
7. Espera unos segundos y selecciona el proyecto recién creado

### Paso 2: Habilitar Google Drive API

1. En el menú lateral izquierdo, ve a **"APIs & Services"** > **"Library"**
2. En la barra de búsqueda, escribe: `Google Drive API`
3. Haz clic en **"Google Drive API"**
4. Haz clic en el botón **"Enable"** (Habilitar)
5. Espera a que se habilite (puede tardar unos segundos)

### Paso 3: Crear Credenciales OAuth 2.0

1. Ve a **"APIs & Services"** > **"Credentials"** (en el menú lateral)
2. Haz clic en **"+ Create Credentials"** (arriba de la página)
3. Selecciona **"OAuth client ID"**
4. Si te pide configurar la pantalla de consentimiento:
   - Selecciona **"External"**
   - Haz clic en **"Create"**
   - Completa:
     - **App name**: `PMD Storage`
     - **User support email**: Tu email
     - **Developer contact information**: Tu email
   - Haz clic en **"Save and Continue"** 3 veces hasta llegar al final
   - Haz clic en **"Back to Dashboard"**

5. Ahora, en la página de Credentials:
   - Haz clic en **"+ Create Credentials"** > **"OAuth client ID"**
   - En **"Application type"**, selecciona **"Desktop app"**
   - En **"Name"**, escribe: `PMD Desktop Client`
   - Haz clic en **"Create"**

6. **IMPORTANTE:** Copia el **Client ID** y el **Client Secret** (guárdalos en un lugar seguro)

### Paso 4: Generar Refresh Token

1. Ve a [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Haz clic en el ícono de configuración (⚙️) en la **esquina superior derecha**
3. Marca la casilla **"Use your own OAuth credentials"**
4. Pega tu **Client ID** y **Client Secret** en los campos correspondientes
5. Haz clic en **"Close"**

6. En el panel izquierdo, desplázate hasta encontrar **"Drive API v3"**
7. Expande **"Drive API v3"** y marca la casilla:
   - ✅ `https://www.googleapis.com/auth/drive.file`

8. Haz clic en **"Authorize APIs"** (botón azul arriba)
9. Selecciona tu cuenta de Google
10. Si te aparece una advertencia de que la app no está verificada:
    - Haz clic en **"Advanced"**
    - Haz clic en **"Go to PMD Storage (unsafe)"**
11. Haz clic en **"Allow"** para dar permisos
12. En el panel derecho, verás un **"Authorization code"**
13. Haz clic en **"Exchange authorization code for tokens"** (botón azul)
14. **IMPORTANTE:** Copia el **Refresh token** (guárdalo en un lugar seguro)

### Paso 5: (Opcional) Crear Carpeta en Google Drive

1. Abre [Google Drive](https://drive.google.com/)
2. Crea una nueva carpeta (ej: "PMD Documents")
3. Haz clic derecho en la carpeta > **"Obtener enlace"** o **"Share"** > **"Get link"**
4. Copia el enlace (ej: `https://drive.google.com/drive/folders/1ABC123XYZ...`)
5. Del enlace, copia el **Folder ID** (la parte que está después de `/folders/` y antes del siguiente `/`)
   - Ejemplo: Si el enlace es `https://drive.google.com/drive/folders/1ABC123XYZ456`, el Folder ID es `1ABC123XYZ456`

### Paso 6: Instalar Dependencia en el Backend

**IMPORTANTE:** Asegúrate de que el paquete `googleapis` esté instalado en tu backend:

1. En tu máquina local, abre una terminal en la carpeta `pmd-backend`
2. Ejecuta:
   ```bash
   npm install googleapis
   ```
3. Si ya está en `package.json`, simplemente ejecuta `npm install`

### Paso 7: Configurar Variables de Entorno en Render

1. Ve a tu [Render Dashboard](https://dashboard.render.com/)
2. Selecciona tu servicio de backend (Web Service)
3. En el menú lateral, haz clic en **"Environment"**
4. Haz clic en **"Environment Variables"**
5. Haz clic en **"Add Environment Variable"** para cada una:

   ```
   Key: GOOGLE_DRIVE_CLIENT_ID
   Value: [Pega aquí tu Client ID del Paso 3]
   ```

   ```
   Key: GOOGLE_DRIVE_CLIENT_SECRET
   Value: [Pega aquí tu Client Secret del Paso 3]
   ```

   ```
   Key: GOOGLE_DRIVE_REFRESH_TOKEN
   Value: [Pega aquí tu Refresh Token del Paso 4]
   ```

   ```
   Key: GOOGLE_DRIVE_FOLDER_ID
   Value: [Pega aquí tu Folder ID del Paso 5] (opcional, pero recomendado)
   ```

6. Para cada variable, haz clic en **"Save Changes"**

### Paso 8: Verificar la Configuración

1. Después de agregar todas las variables, Render reiniciará automáticamente tu servicio
2. Espera a que el servicio se reinicie (verás el estado "Live")
3. Revisa los logs del servicio (en Render Dashboard > "Logs")
4. Deberías ver un mensaje como:
   ```
   [StorageService] Using Google Drive as storage backend
   [GoogleDriveService] Google Drive storage is enabled
   ```

### Paso 9: Probar la Configuración

1. En el frontend, intenta subir un nuevo documento a una Obra
2. Verifica que el documento se suba correctamente
3. Intenta descargar el documento (debería funcionar)
4. Verifica en Google Drive que el archivo aparezca en la carpeta configurada

---

## 🎯 Opción 2: Dropbox (Alternativa)

### Paso 1: Crear Aplicación en Dropbox

1. Ve a [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Si no tienes cuenta, crea una (es gratuita)
3. Haz clic en **"Create app"**
4. Configura:
   - **Choose an API**: Selecciona **"Dropbox API"**
   - **Choose the type of access you need**: Selecciona **"Full Dropbox"**
   - **Name your app**: `PMD Storage` (o el nombre que prefieras)
   - Acepta los términos y haz clic en **"Create app"**

### Paso 2: Configurar Permisos

1. En la página de tu aplicación, ve a la pestaña **"Permissions"**
2. Asegúrate de que estén habilitados:
   - ✅ `files.content.write`
   - ✅ `files.content.read`
   - ✅ `sharing.write` (para generar enlaces compartidos)
3. Si los cambias, haz clic en **"Submit"** para guardar

### Paso 3: Generar Access Token

1. Ve a la pestaña **"Settings"** de tu aplicación
2. Desplázate hasta la sección **"OAuth 2"**
3. Haz clic en el botón **"Generate access token"**
4. **IMPORTANTE:** Copia el **Access Token** inmediatamente (solo se muestra una vez)
   - Si lo pierdes, tendrás que generar uno nuevo

### Paso 4: Instalar Dependencia en el Backend

**IMPORTANTE:** Asegúrate de que el paquete `dropbox` esté instalado en tu backend:

1. En tu máquina local, abre una terminal en la carpeta `pmd-backend`
2. Ejecuta:
   ```bash
   npm install dropbox
   ```
3. Si ya está en `package.json`, simplemente ejecuta `npm install`

### Paso 5: Configurar Variables de Entorno en Render

1. Ve a tu [Render Dashboard](https://dashboard.render.com/)
2. Selecciona tu servicio de backend (Web Service)
3. En el menú lateral, haz clic en **"Environment"**
4. Haz clic en **"Environment Variables"**
5. Haz clic en **"Add Environment Variable"** para cada una:

   ```
   Key: DROPBOX_ACCESS_TOKEN
   Value: [Pega aquí tu Access Token del Paso 3]
   ```

   ```
   Key: DROPBOX_FOLDER_PATH
   Value: /PMD_Documents
   ```
   (Opcional: puedes cambiarlo a otra ruta como `/backups`)

6. Para cada variable, haz clic en **"Save Changes"**

### Paso 6: Verificar la Configuración

1. Después de agregar todas las variables, Render reiniciará automáticamente tu servicio
2. Espera a que el servicio se reinicie (verás el estado "Live")
3. Revisa los logs del servicio (en Render Dashboard > "Logs")
4. Deberías ver un mensaje como:
   ```
   [StorageService] Using Dropbox as storage backend
   [DropboxService] Dropbox storage is enabled
   ```

### Paso 7: Probar la Configuración

1. En el frontend, intenta subir un nuevo documento a una Obra
2. Verifica que el documento se suba correctamente
3. Intenta descargar el documento (debería funcionar)
4. Verifica en Dropbox que el archivo aparezca en la carpeta configurada

---

## ⚠️ Problema: Documentos Antiguos con Rutas Locales

Si tienes documentos que fueron subidos antes de configurar cloud storage, estos tendrán rutas locales y **no se podrán descargar**. 

### Solución: Re-subir los Documentos

1. **Para cada documento afectado:**
   - Edita el documento en el frontend
   - Elimina el archivo actual (si es posible)
   - Sube el archivo nuevamente
   - Con cloud storage configurado, el nuevo archivo se guardará en la nube y funcionará correctamente

2. **Nota:** No hay forma automática de migrar archivos locales a cloud storage porque los archivos locales ya no existen en Render (se perdieron al reiniciar el servicio).

---

## 🔍 Verificar que Todo Funciona

### En los Logs de Render

Después de configurar, deberías ver en los logs:
- ✅ `[StorageService] Using Google Drive as storage backend` (o Dropbox)
- ✅ `[GoogleDriveService] Google Drive storage is enabled` (o Dropbox)

### Al Subir un Documento

1. Sube un nuevo documento desde el frontend
2. Revisa los logs de Render, deberías ver:
   - ✅ `[uploadFile] File uploaded successfully. URL: https://...`
3. El `file_url` en la base de datos debería ser una URL HTTP/HTTPS (no una ruta local)

### Al Descargar un Documento

1. Intenta descargar un documento recién subido
2. Debería funcionar correctamente
3. El navegador debería descargar el archivo o redirigirte a la URL de cloud storage

---

## 🐛 Troubleshooting

### Error: "Google Drive is not configured"

**Causa:** Falta alguna variable de entorno o el paquete `googleapis` no está instalado.

**Solución:**
1. Verifica que todas las variables de entorno estén configuradas en Render
2. Verifica que el paquete `googleapis` esté en `package.json` y se haya instalado
3. Revisa los logs para ver qué variable falta

### Error: "Dropbox is not configured"

**Causa:** Falta `DROPBOX_ACCESS_TOKEN` o el paquete `dropbox` no está instalado.

**Solución:**
1. Verifica que `DROPBOX_ACCESS_TOKEN` esté configurado en Render
2. Verifica que el paquete `dropbox` esté en `package.json` y se haya instalado
3. Revisa los logs para ver si el token es válido

### Error: "Cloud storage is required in production"

**Causa:** Estás intentando subir un archivo en producción sin cloud storage configurado.

**Solución:**
1. Configura Google Drive o Dropbox siguiendo los pasos anteriores
2. Reinicia el servicio en Render después de configurar las variables

### Error: "File not found" al descargar

**Causa:** El documento tiene una ruta local que no existe en Render.

**Solución:**
1. Re-sube el documento (elimínalo y súbelo de nuevo)
2. Con cloud storage configurado, el nuevo archivo funcionará correctamente

### El servicio no usa cloud storage después de configurar

**Causa:** Las variables de entorno no están configuradas correctamente o el servicio no se reinició.

**Solución:**
1. Verifica que todas las variables estén correctamente escritas (sin espacios extra)
2. Verifica que los valores sean correctos (copia y pega directamente)
3. Forza un reinicio manual en Render (Settings > Manual Deploy > Clear build cache & deploy)

---

## 📝 Resumen de Variables de Entorno

### Para Google Drive:
```
GOOGLE_DRIVE_CLIENT_ID=tu_client_id
GOOGLE_DRIVE_CLIENT_SECRET=tu_client_secret
GOOGLE_DRIVE_REFRESH_TOKEN=tu_refresh_token
GOOGLE_DRIVE_FOLDER_ID=tu_folder_id (opcional)
```

### Para Dropbox:
```
DROPBOX_ACCESS_TOKEN=tu_access_token
DROPBOX_FOLDER_PATH=/PMD_Documents (opcional, default: /backups)
```

---

## ✅ Lista de Verificación

Antes de considerar que está todo configurado:

- [ ] Variables de entorno configuradas en Render
- [ ] Paquete `googleapis` o `dropbox` instalado en el backend
- [ ] Servicio reiniciado en Render
- [ ] Logs muestran que cloud storage está habilitado
- [ ] Puedo subir un nuevo documento
- [ ] Puedo descargar el documento subido
- [ ] El archivo aparece en Google Drive/Dropbox

---

## 🆘 ¿Necesitas Ayuda?

Si después de seguir esta guía sigues teniendo problemas:

1. **Revisa los logs de Render** para ver errores específicos
2. **Verifica las credenciales** (Client ID, Client Secret, Refresh Token, etc.)
3. **Asegúrate de que los permisos** estén configurados correctamente
4. **Verifica que los paquetes** (`googleapis` o `dropbox`) estén instalados

---

**¡Listo!** Con esta configuración, todos los documentos nuevos se guardarán en cloud storage y podrán descargarse correctamente desde Render. 🎉
