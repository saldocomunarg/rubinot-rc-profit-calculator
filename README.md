# Rubinot RC Profit Calculator

Aplicación de escritorio (Electron) 100% local/offline para controlar operaciones de RubiniCoins (RC), hunts, mercado, inventario, caja diaria y planificación de capital.

## Ejecutar en desarrollo

```bash
npm install
npm start
```

## Generar el instalador de Windows (.exe)

```bash
npm run build
```

El instalador se genera en `dist/Rubinot-RC-Profit-Calculator-Setup.exe`.

## Notas

- Todos los datos se guardan localmente en tu computadora (JSON en la carpeta de datos de usuario de la app). Nada se envía a internet.
- El ícono de la aplicación usa el logo de Rubinot RC Profit Calculator proporcionado para este proyecto.
- Ningún dato se conecta automáticamente a Rubinot. Todo se carga manualmente desde la interfaz.

## Solucion para Windows: error de winCodeSign

Este proyecto usa electron-builder 24.6.3 porque versiones posteriores de la rama 24 pueden fallar en Windows al extraer winCodeSign cuando el usuario no tiene privilegios para crear enlaces simbolicos.

En Windows, desde la carpeta del proyecto: `npm install` y luego `npm run build`.

Si ya tenias `node_modules`, elimina `node_modules` y `package-lock.json`, ejecuta `npm install` y vuelve a ejecutar `npm run build`.
