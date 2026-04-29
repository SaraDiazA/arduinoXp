# Arduino Esplora Live Experience

Una aplicación web interactiva que consume los datos en tiempo real de un Arduino Esplora expuesto por la API pública.

## Qué hace

- Conecta vía `wss://arduino.arroyocreativa.com` para recibir datos de los sensores en tiempo real.
- Usa `https://arduino.arroyocreativa.com/api/sensors` como fallback si no hay conexión WebSocket.
- Presenta una experiencia lúdica donde el joystick controla un avatar y los sensores animan la escena.
- Muestra valores en vivo de joystick, botones, luz, temperatura, slider, acelerómetro y micrófono.

## Archivos principales

- `index.html` — interfaz de usuario y estructura de la experiencia.
- `styles.css` — estilos visuales y diseño responsive.
- `app.js` — lógica de conexión, renderizado y animación.

## Cómo usarla

1. Abrir `index.html` en un navegador moderno.
2. Permitir la conexión al origen de datos si el navegador lo solicita.
3. Si no hay acceso al servidor, abrir `index.html?simulate=true` para activar datos simulados.

## Datos y API

- WebSocket: `wss://arduino.arroyocreativa.com`
- REST: `https://arduino.arroyocreativa.com/api/sensors`
- Estado: `https://arduino.arroyocreativa.com/api/status`

## Desarrollo

La aplicación está diseñada como sitio estático. Se puede servir con cualquier servidor simple de archivos estáticos o abrir directamente en el navegador.
