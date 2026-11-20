// =============================================================
//  Registro de estudiantes - lógica del formulario
//  Fundamentos de Programación, UNA Puno 2026-II
// =============================================================

const API = CONFIG.URL_API;
const MODO_DEMO = !API || API.startsWith("PEGAR_AQUI");
const EXTRANJERO = "EXTRANJERO";

// ---------- Referencias a elementos de la página ----------
const $ = (id) => document.getElementById(id);
const formulario    = $("formulario");
const campos        = $("campos");
const botonEnviar   = $("enviar");
const mensaje       = $("mensaje");
const cajaEstado    = $("estado");
const estadoTexto   = $("estado-texto");
const estadoDetalle = $("estado-detalle");
const selectArea    = $("area");
const inputAreaOtro = $("area-otro");
const selRegion     = $("region");
const selProvincia  = $("provincia");
const selDistrito   = $("distrito");
const cajaPais      = $("caja-pais");
const inputPais     = $("pais");
const seccionExito  = $("exito");

let ubigeo = {};          // { REGION: { PROVINCIA: [DISTRITOS] } }
let fechaFin = null;      // cierre del registro (Date)
let temporizador = null;  // intervalo de la cuenta regresiva

// ---------- Utilidades ----------
const formatoFecha = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "full", timeStyle: "short", timeZone: "America/Lima"
});

function mostrarEstado(tipo, texto, detalle = "") {
  cajaEstado.className = `estado estado--${tipo}`;
  estadoTexto.textContent = texto;
  estadoDetalle.textContent = detalle;
}

function tiempoRestante(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const partes = [];
  if (d) partes.push(`${d} d`);
  if (d || h) partes.push(`${h} h`);
  partes.push(`${m} min`);
  if (!d) partes.push(`${seg} s`);
  return partes.join(" ");
}

function llenarSelect(select, opciones, textoVacio) {
  select.innerHTML = "";
  select.append(new Option(textoVacio, ""));
  opciones.forEach((op) => select.append(new Option(op, op)));
}

// ---------- Ubigeo: región → provincia → distrito ----------
async function cargarUbigeo() {
  try {
    const resp = await fetch("datos/ubigeo.json");
    ubigeo = await resp.json();
    llenarSelect(selRegion, Object.keys(ubigeo), "Seleccione la región…");
    selRegion.append(new Option("Nací en el extranjero", EXTRANJERO));
  } catch (error) {
    llenarSelect(selRegion, [], "No se pudo cargar la lista");
  }
}

selRegion.addEventListener("change", () => {
  const region = selRegion.value;
  const esExtranjero = region === EXTRANJERO;
  cajaPais.hidden = !esExtranjero;
  inputPais.required = esExtranjero;

  if (region && !esExtranjero) {
    llenarSelect(selProvincia, Object.keys(ubigeo[region]), "Seleccione la provincia…");
    selProvincia.disabled = false;
  } else {
    llenarSelect(selProvincia, [], esExtranjero ? "No corresponde" : "Elija primero la región");
    selProvincia.disabled = true;
  }
  llenarSelect(selDistrito, [], esExtranjero ? "No corresponde" : "Elija primero la provincia");
  selDistrito.disabled = true;
  if (esExtranjero) inputPais.focus();
});

selProvincia.addEventListener("change", () => {
  const provincia = selProvincia.value;
  if (provincia) {
    llenarSelect(selDistrito, ubigeo[selRegion.value][provincia], "Seleccione el distrito…");
    selDistrito.disabled = false;
  } else {
    llenarSelect(selDistrito, [], "Elija primero la provincia");
    selDistrito.disabled = true;
  }
});

// ---------- Estado del registro (abierto / por iniciar / cerrado) ----------
async function consultarEstado() {
  if (MODO_DEMO) {
    mostrarEstado("pronto", "Modo de prueba: falta conectar la hoja de Google.",
      "Los datos no se guardarán hasta pegar la URL de Apps Script en js/config.js.");
    campos.disabled = false;
    return;
  }
  try {
    const resp = await fetch(`${API}?accion=estado`);
    aplicarEstado(await resp.json());
  } catch (error) {
    mostrarEstado("cerrado", "No se pudo consultar el estado del registro.",
      "Revise su conexión a internet y recargue la página.");
    campos.disabled = true;
  }
}

function aplicarEstado(estado) {
  clearInterval(temporizador);
  const inicio = estado.inicio ? new Date(estado.inicio) : null;
  fechaFin = estado.fin ? new Date(estado.fin) : null;
  const total = `Registros recibidos: ${estado.total}.`;

  if (estado.abierto) {
    campos.disabled = false;
    const actualizar = () => {
      const falta = fechaFin - new Date();
      if (falta <= 0) {
        clearInterval(temporizador);
        mostrarEstado("cerrado", "El plazo de registro terminó.", total);
        campos.disabled = true;
        return;
      }
      mostrarEstado("abierto", `Registro abierto · cierra en ${tiempoRestante(falta)}`,
        `Hasta el ${formatoFecha.format(fechaFin)} · ${total}`);
    };
    actualizar();
    temporizador = setInterval(actualizar, 1000);
  } else if (estado.motivo === "pronto" && inicio) {
    campos.disabled = true;
    const actualizar = () => {
      const falta = inicio - new Date();
      if (falta <= 0) { clearInterval(temporizador); consultarEstado(); return; }
      mostrarEstado("pronto", `El registro abre en ${tiempoRestante(falta)}`,
        `Inicio: ${formatoFecha.format(inicio)}.`);
    };
    actualizar();
    temporizador = setInterval(actualizar, 1000);
  } else {
    campos.disabled = true;
    const texto = estado.motivo === "deshabilitado"
      ? "El registro está cerrado por el organizador."
      : "El plazo de registro terminó.";
    mostrarEstado("cerrado", texto, total);
  }
  // los selectores dependientes siguen bloqueados hasta elegir el anterior
  if (!selRegion.value || selRegion.value === EXTRANJERO) selProvincia.disabled = true;
  if (!selProvincia.value) selDistrito.disabled = true;
}

// ---------- "Otro" en área de interés ----------
selectArea.addEventListener("change", () => {
  const esOtro = selectArea.value === "Otro";
  inputAreaOtro.hidden = !esOtro;
  inputAreaOtro.required = esOtro;
  if (esOtro) inputAreaOtro.focus();
});

// ---------- Restricciones mientras se escribe ----------
const LETRAS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";
const filtros = {
  codigo: (v) => v.replace(/\D/g, "").slice(0, 6),
  celular: (v) => v.replace(/\D/g, "").slice(0, 9),
  nombres: (v) => v.replace(new RegExp(`[^${LETRAS}' .-]`, "g"), ""),
  nacionalidad: (v) => v.replace(new RegExp(`[^${LETRAS} ]`, "g"), ""),
  pais: (v) => v.replace(new RegExp(`[^${LETRAS} .-]`, "g"), ""),
  correo: (v) => v.replace(/\s/g, "")
};
Object.entries(filtros).forEach(([id, filtro]) => {
  $(id).addEventListener("input", (e) => {
    const limpio = filtro(e.target.value);
    if (limpio !== e.target.value) e.target.value = limpio;
  });
});

// ---------- Validación ----------
const RE_CORREO = /^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;

const reglas = {
  nombres: (v) => {
    if (!v) return "Escriba sus nombres y apellidos.";
    if (!new RegExp(`^[${LETRAS}' .-]+$`).test(v)) return "Use solo letras y espacios.";
    if (v.split(" ").filter((p) => p.length > 1).length < 2) return "Escriba al menos un nombre y un apellido.";
    return "";
  },
  codigo: (v) => {
    if (!v) return "Escriba su código universitario.";
    return /^\d{6}$/.test(v) ? "" : `El código debe tener exactamente 6 números (lleva ${v.length}).`;
  },
  correo: (v) => {
    if (!v) return "Escriba su correo electrónico.";
    if (!RE_CORREO.test(v) || v.includes("..")) return "Correo no válido. Ej.: nombre@est.unap.edu.pe";
    return "";
  },
  celular: (v) => {
    if (!v) return "Escriba su número de celular.";
    if (!/^9/.test(v)) return "El celular debe empezar con 9.";
    return /^9\d{8}$/.test(v) ? "" : `El celular debe tener 9 dígitos (lleva ${v.length}).`;
  },
  semestre: (v) => v ? "" : "Seleccione su semestre.",
  area: (v, d) => {
    if (!v) return "Seleccione un área de interés.";
    if (v === "Otro" && (d.areaOtro || "").length < 3) return "Escriba su área de interés.";
    return "";
  },
  fechaNac: (v) => {
    if (!v) return "Indique su fecha de nacimiento.";
    const fecha = new Date(`${v}T12:00:00`);
    const hoy = new Date();
    const edad = (hoy - fecha) / (365.25 * 24 * 3600 * 1000);
    if (Number.isNaN(edad) || edad < 14 || edad > 80) return "Revise la fecha de nacimiento.";
    return "";
  },
  estadoCivil: (v) => v ? "" : "Seleccione su estado civil.",
  region: (v) => v ? "" : "Seleccione la región.",
  provincia: (v, d) => d.region === EXTRANJERO || v ? "" : "Seleccione la provincia.",
  distrito: (v, d) => d.region === EXTRANJERO || v ? "" : "Seleccione el distrito.",
  pais: (v, d) => d.region !== EXTRANJERO || v.length >= 3 ? "" : "Escriba el país de nacimiento.",
  nacionalidad: (v) => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{4,}$/.test(v) ? "" : "Escriba su nacionalidad (solo letras).",
  consentimiento: (v) => v ? "" : "Debe aceptar el uso de sus datos para registrarse."
};

function leerDatos() {
  const datos = {};
  for (const [clave, valor] of new FormData(formulario).entries()) {
    datos[clave] = typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : valor;
  }
  // los select deshabilitados no entran en FormData
  datos.provincia = selProvincia.value;
  datos.distrito = selDistrito.value;
  datos.consentimiento = $("consentimiento").checked;
  datos.correo = (datos.correo || "").toLowerCase();
  return datos;
}

function marcar(campo, error) {
  const caja = $(`error-${campo}`);
  caja.textContent = error;
  caja.closest(".campo").classList.toggle("campo--invalido", Boolean(error));
}

function validar(datos) {
  let primerError = null;
  for (const [campo, regla] of Object.entries(reglas)) {
    const error = regla(datos[campo] ?? "", datos);
    marcar(campo, error);
    if (error && !primerError) primerError = campo;
  }
  if (primerError) {
    $(primerError).focus();
    $(primerError).closest(".campo").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return !primerError;
}

// Validación inmediata al salir de cada campo
Object.keys(reglas).forEach((campo) => {
  const el = $(campo);
  const evento = el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "blur";
  el.addEventListener(evento, () => {
    const datos = leerDatos();
    if (el.value || el.type === "checkbox") marcar(campo, reglas[campo](datos[campo] ?? "", datos));
  });
});

// ---------- Envío ----------
formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensaje.textContent = "";
  mensaje.className = "mensaje";

  const datos = leerDatos();
  if (!validar(datos)) return;
  if (datos.sitio) return; // robot detectado por el campo trampa

  if (datos.area === "Otro") datos.area = `Otro: ${datos.areaOtro}`;
  if (datos.region === EXTRANJERO) {
    datos.region = `${EXTRANJERO}: ${datos.pais.toUpperCase()}`;
    datos.provincia = "NO APLICA";
    datos.distrito = "NO APLICA";
  }
  delete datos.areaOtro;
  delete datos.pais;
  delete datos.sitio;

  if (MODO_DEMO) {
    mostrarExito({ numero: "DEMO", nombre: datos.nombres });
    console.table(datos);
    return;
  }

  botonEnviar.disabled = true;
  botonEnviar.textContent = "Enviando…";
  try {
    const resp = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(datos)
    });
    const resultado = await resp.json();
    if (resultado.ok) {
      mostrarExito(resultado);
    } else {
      mensaje.textContent = resultado.error || "No se pudo guardar el registro.";
      mensaje.classList.add("mensaje--error");
      if (resultado.estado) aplicarEstado(resultado.estado);
    }
  } catch (error) {
    mensaje.textContent = "Error de conexión. Intente de nuevo en unos segundos.";
    mensaje.classList.add("mensaje--error");
  } finally {
    botonEnviar.disabled = false;
    botonEnviar.textContent = "Enviar registro";
  }
});

function mostrarExito(resultado) {
  formulario.hidden = true;
  seccionExito.hidden = false;
  $("exito-numero").textContent = resultado.numero;
  $("exito-detalle").textContent = `${resultado.nombre} · ${formatoFecha.format(new Date())}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("otro").addEventListener("click", () => {
  formulario.reset();
  inputAreaOtro.hidden = true;
  inputAreaOtro.required = false;
  selRegion.dispatchEvent(new Event("change"));
  document.querySelectorAll(".campo__error").forEach((c) => (c.textContent = ""));
  document.querySelectorAll(".campo--invalido").forEach((c) => c.classList.remove("campo--invalido"));
  seccionExito.hidden = true;
  formulario.hidden = false;
  consultarEstado();
});

// ---------- Inicio ----------
cargarUbigeo();
consultarEstado();
