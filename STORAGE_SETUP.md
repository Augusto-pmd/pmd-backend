# Configuración de Almacenamiento en la Nube (Google Drive / Dropbox)

Este documento describe cómo configurar el almacenamiento en la nube para los backups del sistema PMD.

## ⚠️ NOTA IMPORTANTE

Esta funcionalidad está **completamente implementada** pero **oculta en el frontend**. Los backups se subirán automáticamente a la nube si las credenciales están configuradas, pero los usuarios no verán opciones de configuración en la interfaz.

## Instalación de Dependencias

Para habilitar el almacenamiento en la nube, instala las dependencias necesarias:

```bash
# Para Google Drive
npm install googleapis

# Para Dropbox
npm install dropbox
```

## Configuración de Google Drive

### 1. Crear un Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google Drive API** en "APIs & Services" > "Library"

### 2. Crear Credenciales OAuth 2.0

1. Ve a "APIs & Services" > "Credentials"
2. Haz clic en "Create Credentials" > "OAuth client ID"
3. Selecciona "Desktop app" como tipo de aplicación
4. Guarda el **Client ID** y **Client Secret**

### 3. Generar Refresh Token

1. Ve a [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Haz clic en el ícono de configuración (⚙️) en la esquina superior derecha
3. Marca "Use your own OAuth credentials"
4. Ingresa tu Client ID y Client Secret
5. En el panel izquierdo, busca "Drive API v3" y selecciona:
   - `https://www.googleapis.com/auth/drive.file`
6. Haz clic en "Authorize APIs"
7. Autoriza la aplicación
8. Haz clic en "Exchange authorization code for tokens"
9. Copia el **Refresh Token**

### 4. (Opcional) Crear una Carpeta en Google Drive

1. Crea una carpeta en Google Drive donde se guardarán los backups
2. Haz clic derecho en la carpeta > "Obtener enlace"
3. Copia el ID de la carpeta de la URL (el ID está entre `/folders/` y el siguiente `/`)

### 5. Configurar Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# Google Drive Configuration
GOOGLE_DRIVE_CLIENT_ID=tu_client_id_aqui
GOOGLE_DRIVE_CLIENT_SECRET=tu_client_secret_aqui
GOOGLE_DRIVE_REFRESH_TOKEN=tu_refresh_token_aqui
GOOGLE_DRIVE_FOLDER_ID=tu_folder_id_aqui  # Opcional
```

## Configuración de Dropbox

### 1. Crear una Aplicación en Dropbox

1. Ve a [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Haz clic en "Create app"
3. Selecciona:
   - **API**: Dropbox API
   - **Type of access**: Full Dropbox
   - **Name**: PMD Backups (o el nombre que prefieras)
4. Haz clic en "Create app"

### 2. Generar Access Token

1. En la página de tu aplicación, ve a la pestaña "Permissions"
2. Asegúrate de que estén habilitados:
   - `files.content.write`
   - `files.content.read`
   - `sharing.write` (para generar enlaces compartidos)
3. Ve a la pestaña "Settings"
4. En "OAuth 2", haz clic en "Generate access token"
5. Copia el **Access Token** (solo se muestra una vez)

### 3. Configurar Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# Dropbox Configuration
DROPBOX_ACCESS_TOKEN=tu_access_token_aqui
DROPBOX_FOLDER_PATH=/backups  # Opcional, por defecto es /backups
```

## Prioridad de Configuración

El sistema usa la siguiente prioridad para determinar qué servicio de almacenamiento usar:

1. **Google Drive** (si `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET` y `GOOGLE_DRIVE_REFRESH_TOKEN` están configurados)
2. **Dropbox** (si `DROPBOX_ACCESS_TOKEN` está configurado y Google Drive no está disponible)
3. **Almacenamiento Local** (si ninguna de las opciones anteriores está configurada)

## Funcionamiento

- Los backups se suben automáticamente a la nube cuando se crean (si las credenciales están configuradas)
- Si falla la subida a la nube, el sistema usa almacenamiento local como respaldo
- Los backups antiguos también se eliminan de la nube cuando se limpian
- La URL del archivo en la nube se guarda en el campo `storage_url` de la tabla `backups`

## Verificación

Para verificar que la configuración funciona:

1. Crea un backup manual desde el frontend (solo Administration/Direction)
2. Revisa los logs del backend - deberías ver mensajes como:
   - `Google Drive storage is enabled` o `Dropbox storage is enabled`
   - `Backup uploaded to cloud storage: [URL]`
3. Verifica que el backup aparezca en tu Google Drive o Dropbox
4. Revisa el campo `storage_url` en la base de datos - debería contener una URL de Google Drive o Dropbox

## Troubleshooting

### Error: "Google Drive is not configured"
- Verifica que todas las variables de entorno de Google Drive estén configuradas
- Asegúrate de que el refresh token sea válido

### Error: "Dropbox is not configured"
- Verifica que `DROPBOX_ACCESS_TOKEN` esté configurado
- Asegúrate de que el access token tenga los permisos necesarios

### Error: "Failed to upload to cloud storage"
- Verifica la conexión a internet
- Revisa que las credenciales sean válidas
- Revisa los logs del backend para más detalles

### Los backups no se suben a la nube
- Verifica que las dependencias estén instaladas (`googleapis` o `dropbox`)
- Revisa los logs del backend para ver qué servicio está activo
- Asegúrate de que las variables de entorno estén correctamente configuradas

