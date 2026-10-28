# EventSpot App

App móvil de EventSpot (Expo SDK 58 + Expo Router) para descubrir eventos cercanos en un mapa en tiempo real. Consume el backend [`eventspot-api`](../eventspot-api).

## Requisitos

- **Node.js** 20 o superior.
- **Android Studio**, con Android SDK y su JDK.
- **Docker Desktop**, para el backend.
- **ngrok**, para exponer el API con una URL pública.
- Un teléfono Android con **Depuración por USB** activada (*Ajustes → Acerca del teléfono* → toca 7 veces "Número de compilación" → *Opciones de desarrollador* → *Depuración por USB*), conectado por cable. `adb devices` debe mostrarlo con estado `device`.

## 1. Backend + ngrok

```bash
cd eventspot-api
docker compose up -d
ngrok http 3000
```

Copia la URL `https://….ngrok-free.dev` que muestra ngrok. Para comprobarla, abre `<url>/api/docs` en el navegador: debe cargar Swagger.

## 2. Configurar la app

```bash
cd eventspot-app
npm install
```

Crea `eventspot-app/.env.local` a partir de [`.env.example`](.env.example):

```
EXPO_PUBLIC_API_URL=https://tu-subdominio.ngrok-free.dev/api
GOOGLE_MAPS_API_KEY=tu_key
```

- `EXPO_PUBLIC_API_URL`: la URL de ngrok **terminada en `/api`**.
- `GOOGLE_MAPS_API_KEY`: sin ella la app funciona, pero el mapa sale en blanco. Ver [API key de Google Maps](#api-key-de-google-maps).

## 3. Correr en el teléfono

Con el teléfono conectado por cable:

```bash
npx expo run:android
```

Compila la app, la instala en el teléfono, arranca Metro y la abre. La primera vez tarda varios minutos; después es mucho más rápido. Mientras Metro esté corriendo, los cambios en el código se ven al instante en el teléfono.

Cuenta de prueba: `demo@eventspot.com` / `password123`.

> Si reinicias ngrok y la URL cambia, actualiza `.env.local` y vuelve a ejecutar `npx expo run:android`.

### Versión release

```bash
npx expo run:android --variant release
```

Instala una versión optimizada, con el código empaquetado dentro de la app: no necesita Metro ni el cable para seguir usándola. Usa la URL del API que haya en `.env.local` al momento de compilar.

## Ver logs

- **App:** aparecen en la terminal donde corre `npx expo run:android`. En modo desarrollo, cada petición al API se imprime con su resultado, por ejemplo `[api] POST /auth/login → 401 Invalid credentials`. Pulsa `j` en esa terminal para abrir React Native DevTools (consola y red).
- **API:**
  ```bash
  docker logs -f eventspot_api
  ```

## API key de Google Maps

1. En [Google Cloud Console](https://console.cloud.google.com/), habilita **Maps SDK for Android** en tu proyecto. Pide tener facturación configurada; el mapa móvil no tiene costo.
2. *APIs y servicios → Credenciales → Crear credenciales → Clave de API*.
3. Restríngela a **Apps de Android** con:
   - Paquete: `com.eventspot.app`
   - **SHA-1**: después de la primera compilación, ejecuta `cd android && gradlew.bat signingReport` y copia el `SHA1` (debug y release usan el mismo certificado).
4. Ponla en `.env.local` y vuelve a ejecutar `npx expo run:android`.

## Problemas comunes

| Síntoma | Solución |
|---|---|
| "No se pudo conectar con el servidor (…)" | Revisa que ngrok y Docker estén corriendo y que la URL del mensaje sea la de `.env.local`. Si no lo es, vuelve a ejecutar `npx expo run:android`. |
| Mapa en blanco o gris | Falta `GOOGLE_MAPS_API_KEY` o la key no tiene el paquete y SHA-1 correctos. |
| "Ese correo o usuario ya está en uso" | El correo o el nombre de usuario ya existen; usa otros o inicia sesión. |
| `adb devices` no muestra el teléfono | Cable de solo carga, depuración USB apagada o aviso de autorización sin aceptar en el teléfono. |
| `SDK location not found` | Gradle no encuentra el Android SDK. Define `ANDROID_HOME` una vez (PowerShell: `[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")` y reabre la terminal), o crea `android/local.properties` con `sdk.dir=C:/Users/<tu-usuario>/AppData/Local/Android/Sdk`. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Desinstala EventSpot del teléfono y vuelve a ejecutar. |

## Estructura

```
src/
├── app/              # Rutas (Expo Router)
│   ├── (tabs)/       # Mapa, Explorar, Mis eventos, Perfil
│   ├── event/[id]    # Detalle de evento
│   ├── create-event  # Crear evento (3 pasos)
│   └── welcome, sign-in, sign-up, edit-profile
├── components/       # UI del sistema "Neon Pulse", tarjetas, mapa
├── ctx/              # Sesión (auth) y tema
├── hooks/            # Ubicación, carga de datos, socket de asistentes
└── lib/              # Cliente HTTP, endpoints, tipos, formatos
```
