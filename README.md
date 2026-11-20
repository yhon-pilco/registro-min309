# Registro de estudiantes – Fundamentos de Programación (UNA Puno, 2026-II)

Formulario web de registro con plazo de apertura, validación de datos y almacenamiento en Google Sheets.

**Página publicada:** https://yhon-pilco.github.io/registro-min309/

## Cómo funciona

```
Compañero (link o QR) ──► Página en GitHub Pages (HTML, CSS, JS)
                               │  fetch POST (JSON)
                               ▼
                         Google Apps Script (apps-script/Code.gs)
                               │  valida y escribe
                               ▼
                         Google Sheets ──► Archivo > Descargar > Excel (.xlsx)
```

## Estructura

| Archivo | Función |
|---|---|
| `index.html` | Estructura del formulario (HTML semántico). |
| `css/estilos.css` | Diseño responsivo: 1 columna en celular, 2 en tablet y laptop. |
| `js/config.js` | URL de la aplicación web de Apps Script. |
| `js/app.js` | Validaciones, selección región → provincia → distrito, cuenta regresiva y envío. |
| `datos/ubigeo.json` | 25 regiones, 196 provincias y 1 893 distritos del Perú. |
| `apps-script/Code.gs` | Servidor: plazo, validación, control de códigos repetidos y escritura en la hoja. |

## Datos que se registran

Nombres y apellidos, código universitario (6 dígitos), correo electrónico, celular (9 dígitos, inicia con 9),
semestre académico, área de interés, fecha de nacimiento, región, provincia y distrito de nacimiento,
estado civil y nacionalidad.

## Validaciones

- En la página: los campos numéricos no aceptan letras, el nombre no acepta números y el correo debe tener formato válido.
- En el servidor: se repiten las mismas validaciones, se rechaza un código universitario ya registrado y se bloquea el envío fuera del plazo.

## Plazo de registro

Se controla desde la pestaña **Configuracion** de la hoja de cálculo (inicio, fin y habilitado SÍ/NO), sin modificar el código.

## Fuente de datos geográficos

Ubigeo INEI/RENIEC tomado de [jmcastagnetto/ubigeo-peru-aumentado](https://github.com/jmcastagnetto/ubigeo-peru-aumentado).

## Protección de datos

Los datos personales no se guardan en este repositorio; se almacenan solo en la hoja de cálculo del organizador.
El formulario solicita consentimiento conforme a la Ley N.° 29733.
