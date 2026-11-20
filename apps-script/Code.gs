/**
 * Registro de estudiantes - backend en Google Apps Script
 * Fundamentos de Programación, UNA Puno 2026-II
 *
 * Uso:
 *  1. En la hoja de cálculo: Extensiones > Apps Script, pegar este código.
 *  2. Ejecutar la función "configurar" una sola vez (crea las hojas).
 *  3. Implementar > Nueva implementación > Aplicación web
 *     (Ejecutar como: Yo; Quién tiene acceso: Cualquier persona).
 *  4. Copiar la URL que termina en /exec en js/config.js de la página.
 */

const HOJA_REGISTROS = 'Registros';
const HOJA_CONFIG = 'Configuracion';
const ZONA = 'America/Lima';

// Orden de las columnas de datos: [clave enviada por la página, encabezado]
const CAMPOS = [
  ['nombres', 'Nombres y apellidos'],
  ['codigo', 'Código universitario'],
  ['correo', 'Correo electrónico'],
  ['celular', 'Número de celular'],
  ['semestre', 'Semestre académico'],
  ['area', 'Área de interés'],
  ['fechaNac', 'Fecha de nacimiento'],
  ['region', 'Región de nacimiento'],
  ['provincia', 'Provincia de nacimiento'],
  ['distrito', 'Distrito de nacimiento'],
  ['estadoCivil', 'Estado civil'],
  ['nacionalidad', 'Nacionalidad']
];
const ENCABEZADOS = ['N°', 'Fecha y hora de registro'].concat(CAMPOS.map(c => c[1]));
const COL_CODIGO = 4;   // columna D
const COL_CORREO = 5;   // columna E
const COL_FECHANAC = 9; // columna I

// ------------------------------------------------------------------
//  Configuración inicial (ejecutar una vez desde el editor)
// ------------------------------------------------------------------
function configurar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(ZONA);

  // Hoja de registros
  let reg = ss.getSheetByName(HOJA_REGISTROS);
  if (!reg) reg = ss.insertSheet(HOJA_REGISTROS, 0);
  if (reg.getLastRow() <= 1) {  // sin registros todavía: (re)escribir encabezados
    reg.clear();
    reg.getRange(1, 1, 1, ENCABEZADOS.length).setValues([ENCABEZADOS]);
  }
  const nCol = ENCABEZADOS.length;
  reg.getRange(1, 1, reg.getMaxRows(), nCol)
     .setFontFamily('Calibri').setFontSize(11).setVerticalAlignment('middle');
  reg.getRange(1, 1, 1, nCol)
     .setFontWeight('bold').setBackground('#FFFF00').setHorizontalAlignment('center')
     .setWrap(true).setBorder(true, true, true, true, true, true);
  reg.setFrozenRows(1);
  reg.setRowHeight(1, 36);

  // Formatos: texto para no perder ceros ni convertir códigos en números
  reg.getRange('A2:A').setNumberFormat('0').setHorizontalAlignment('center');
  reg.getRange('B2:B').setNumberFormat('dd/mm/yyyy hh:mm:ss');
  reg.getRange('C2:H').setNumberFormat('@');
  reg.getRange('I2:I').setNumberFormat('dd/mm/yyyy');
  reg.getRange('J2:N').setNumberFormat('@');

  const anchos = [45, 150, 260, 110, 250, 110, 100, 260, 115, 150, 170, 190, 110, 110];
  anchos.forEach((w, i) => reg.setColumnWidth(i + 1, w));

  // Hoja de configuración (plazo del registro)
  let cfg = ss.getSheetByName(HOJA_CONFIG);
  if (!cfg) {
    cfg = ss.insertSheet(HOJA_CONFIG);
    const ahora = new Date();
    const fin = new Date(ahora.getTime() + 2 * 24 * 60 * 60 * 1000);
    cfg.getRange('A1:C5').setValues([
      ['Parámetro', 'Valor', 'Instrucciones'],
      ['Inicio del registro', ahora, 'Fecha y hora desde la que se aceptan registros (dd/mm/aaaa hh:mm).'],
      ['Fin del registro', fin, 'Fecha y hora en que se cierra el formulario.'],
      ['Registro habilitado', 'SÍ', 'Escriba NO para cerrar el formulario de inmediato.'],
      ['Permitir código repetido', 'NO', 'Escriba SÍ solo si un mismo código puede registrarse dos veces.']
    ]);
    cfg.getRange('B2:B3').setNumberFormat('dd/mm/yyyy hh:mm');
    cfg.getRange('A1:C5').setFontFamily('Calibri').setFontSize(11)
       .setBorder(true, true, true, true, true, true);
    cfg.getRange('A1:C1').setFontWeight('bold').setBackground('#FFFF00');
    cfg.getRange('A2:A5').setFontWeight('bold').setBackground('#FFFF00');
    cfg.setColumnWidth(1, 190); cfg.setColumnWidth(2, 150); cfg.setColumnWidth(3, 430);
  }

  // Eliminar la hoja vacía que Google crea por defecto
  ['Hoja 1', 'Sheet1', 'Hoja1'].forEach(nombre => {
    const h = ss.getSheetByName(nombre);
    if (h && h.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(h);
  });

  ss.setActiveSheet(reg);
}

// ------------------------------------------------------------------
//  Estado del registro
// ------------------------------------------------------------------
function leerConfig_() {
  const cfg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_CONFIG);
  const v = cfg.getRange('B2:B5').getValues().map(f => f[0]);
  const si = x => String(x).trim().toUpperCase().replace('Í', 'I') === 'SI';
  return { inicio: v[0], fin: v[1], habilitado: si(v[2]), permitirRepetido: si(v[3]) };
}

function estado_() {
  const c = leerConfig_();
  const reg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_REGISTROS);
  const ahora = new Date();
  let abierto = true, motivo = 'abierto';
  if (!c.habilitado) { abierto = false; motivo = 'deshabilitado'; }
  else if (c.inicio instanceof Date && ahora < c.inicio) { abierto = false; motivo = 'pronto'; }
  else if (c.fin instanceof Date && ahora > c.fin) { abierto = false; motivo = 'cerrado'; }
  return {
    abierto: abierto,
    motivo: motivo,
    inicio: c.inicio instanceof Date ? c.inicio.toISOString() : null,
    fin: c.fin instanceof Date ? c.fin.toISOString() : null,
    total: Math.max(0, reg.getLastRow() - 1)
  };
}

// ------------------------------------------------------------------
//  Puntos de entrada de la aplicación web
// ------------------------------------------------------------------
function doGet() {
  return json_(estado_());
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'El servidor está ocupado. Intente de nuevo en unos segundos.' });
  }
  try {
    const est = estado_();
    if (!est.abierto) {
      return json_({ ok: false, error: 'El registro no está abierto en este momento.', estado: est });
    }

    let d;
    try { d = JSON.parse(e.postData.contents); }
    catch (err) { return json_({ ok: false, error: 'Datos no válidos.' }); }

    if (d.sitio) return json_({ ok: false, error: 'Solicitud rechazada.' });

    const limpio = {};
    CAMPOS.forEach(([clave]) => { limpio[clave] = limpiar_(d[clave]); });
    limpio.correo = limpio.correo.toLowerCase();

    const error = validar_(limpio, d.consentimiento === true);
    if (error) return json_({ ok: false, error: error });

    const reg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_REGISTROS);
    const ultima = reg.getLastRow();

    if (!leerConfig_().permitirRepetido && ultima > 1) {
      const codigos = reg.getRange(2, COL_CODIGO, ultima - 1, 1).getValues().map(f => String(f[0]));
      if (codigos.indexOf(limpio.codigo) !== -1) {
        return json_({ ok: false, error: 'Ese código universitario ya está registrado.' });
      }
    }

    const numero = ultima; // fila 1 = encabezados
    const p = limpio.fechaNac.split('-').map(Number);
    const fila = [numero, new Date()].concat(CAMPOS.map(([clave]) =>
      clave === 'fechaNac' ? new Date(p[0], p[1] - 1, p[2], 12) : limpio[clave]));  // mediodía: evita desfases de zona horaria

    reg.getRange(ultima + 1, 1, 1, fila.length).setValues([fila]);
    reg.getRange(ultima + 1, 1, 1, fila.length)
       .setBorder(true, true, true, true, true, true)
       .setFontFamily('Calibri').setFontSize(11);
    reg.getRange(ultima + 1, COL_FECHANAC).setNumberFormat('dd/mm/yyyy');

    return json_({ ok: true, numero: numero, nombre: limpio.nombres });
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------------
//  Utilidades
// ------------------------------------------------------------------
function limpiar_(valor) {
  return String(valor === undefined || valor === null ? '' : valor)
    .replace(/\s+/g, ' ').trim()
    .replace(/^[=+\-@]+/, '')   // evita fórmulas inyectadas en la hoja
    .slice(0, 120);
}

function validar_(d, consentimiento) {
  if (!consentimiento) return 'Debe aceptar el uso de sus datos.';
  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]{5,}$/.test(d.nombres) || d.nombres.split(' ').length < 2)
    return 'Revise sus nombres y apellidos.';
  if (!/^\d{6}$/.test(d.codigo)) return 'El código universitario debe tener exactamente 6 números.';
  if (!/^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i.test(d.correo)
      || d.correo.indexOf('..') !== -1) return 'Revise el correo electrónico.';
  if (!/^9\d{8}$/.test(d.celular)) return 'Revise el número de celular.';
  if (['I','II','III','IV','V','VI','VII','VIII','IX','X'].indexOf(d.semestre) === -1)
    return 'Revise el semestre.';
  if (d.area.length < 3) return 'Revise el área de interés.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fechaNac)) return 'Revise la fecha de nacimiento.';
  if (d.region.length < 3 || !d.provincia || !d.distrito) return 'Revise el lugar de nacimiento.';
  if (['Soltero(a)','Casado(a)','Conviviente','Divorciado(a)','Viudo(a)'].indexOf(d.estadoCivil) === -1)
    return 'Revise el estado civil.';
  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{4,}$/.test(d.nacionalidad)) return 'Revise la nacionalidad.';
  return '';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
