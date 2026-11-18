import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import apiInterceptor from '../../services/apiInterceptor';
import useSesion from '../../hooks/useSesion';
import { leerSesion, limpiarSesion } from '../../utils/sesion';

const API_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const LIMITE_FOTO = 2 * 1024 * 1024;
const inputClass = 'w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60';
const primaryClass = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryClass = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

function formatoTelefono(valor) {
  const texto = String(valor ?? '');
  if (!/^[\d\s-]*$/.test(texto)) return texto;
  const digitos = texto.replace(/\D/g, '');
  if (digitos.length > 8) return texto;
  return digitos.length > 4 ? `${digitos.slice(0, 4)}-${digitos.slice(4)}` : digitos;
}

function datosContacto(perfil) {
  return {
    correoPersonal: String(perfil?.correoPersonal ?? ''),
    telefono: formatoTelefono(perfil?.telefono),
    direccion: String(perfil?.direccion ?? ''),
  };
}

function prepararContacto(form) {
  return {
    correoPersonal: form.correoPersonal.trim(),
    telefono: formatoTelefono(form.telefono.trim()),
    direccion: form.direccion.trim(),
  };
}

function erroresContacto(form) {
  const datos = prepararContacto(form);
  const errores = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correoPersonal)) {
    errores.correoPersonal = 'Escribe un correo válido, por ejemplo: nombre@correo.com.';
  }
  if (!/^[267]\d{3}-\d{4}$/.test(datos.telefono)) {
    errores.telefono = 'Usa ocho dígitos, comenzando por 2, 6 o 7. Ejemplo: 7234-5678.';
  }
  if (!datos.direccion) errores.direccion = 'Escribe tu dirección; no puede contener solo espacios.';
  return errores;
}

function requisitosPassword(valor) {
  return {
    'Al menos 8 caracteres': valor.length >= 8,
    'Una mayúscula': /[A-Z]/.test(valor),
    'Una minúscula': /[a-z]/.test(valor),
    'Un número': /[0-9]/.test(valor),
    'Un símbolo (no un espacio)': /[^\p{L}\p{N}\s]/u.test(valor),
  };
}

function validarPassword(form) {
  if (!form.actual) return 'Escribe tu contraseña actual.';
  if (!Object.values(requisitosPassword(form.nueva)).every(Boolean)) return 'La nueva contraseña no cumple todos los requisitos.';
  if (form.actual === form.nueva) return 'La nueva contraseña debe ser diferente de la actual.';
  if (form.nueva !== form.confirmacion) return 'La confirmación no coincide con la nueva contraseña.';
  return '';
}

function objeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function mensajeServidor(data) {
  const mensaje = [data?.mensaje, data?.message, data?.error].find(v => typeof v === 'string' && v.trim());
  if (mensaje) return mensaje.slice(0, 500);
  if (objeto(data?.detalles)) {
    return Object.values(data.detalles).flat().filter(v => typeof v === 'string').join(' ').slice(0, 500);
  }
  return '';
}

async function leerRespuesta(response, permitirVacia = false) {
  const raw = await response.text();
  let data = null;
  if (raw.trim()) {
    try { data = JSON.parse(raw); } catch { /* El cuerpo puede no ser JSON. */ }
  }
  if (!response.ok) {
    throw Object.assign(new Error(mensajeServidor(data) || `No se pudo completar la solicitud (HTTP ${response.status}).`), { status: response.status });
  }
  if (data?.exito === false) throw new Error(mensajeServidor(data) || 'El servidor rechazó la operación.');
  if (raw.trim() && data === null) throw new Error('El servidor devolvió una respuesta inesperada. Actualiza los datos antes de repetir la operación.');
  if (data === null && !permitirVacia) throw new Error('El servidor devolvió una respuesta vacía.');
  return data;
}

function urlFotoSegura(ruta) {
  if (typeof ruta !== 'string' || !ruta.trim() || !API_URL) return '';
  try {
    const base = new URL(API_URL, window.location.origin);
    const url = new URL(ruta, `${base.href.replace(/\/+$/, '')}/`);
    if (!['https:', 'http:'].includes(url.protocol) || url.origin !== base.origin || url.username || url.password) return '';
    if (window.location.protocol === 'https:' && url.protocol !== 'https:') return '';
    return url.href;
  } catch { return ''; }
}

function fechaSesion(valor) {
  if (!valor) return 'No disponible';
  const fecha = new Date(valor);
  if (!Number.isFinite(fecha.getTime())) return 'No disponible';
  return new Intl.DateTimeFormat('es-SV', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/El_Salvador',
  }).format(fecha);
}

function sesionAbierta(sesion) {
  return sesion.exitosa !== false && !sesion.fechaFin;
}

async function cargarImagen(blob) {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 16000000) {
          reject(new Error('La imagen debe tener como máximo 16 megapíxeles.'));
        } else resolve(img);
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen. Selecciona un JPG o PNG válido.'));
      img.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

async function validarFoto(file) {
  if (!file || !file.size || file.size > LIMITE_FOTO) throw new Error('Selecciona una imagen de hasta 2 MB.');
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('Solo se permiten imágenes JPG o PNG.');
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if ((file.type === 'image/png' && !png) || (file.type === 'image/jpeg' && !jpg)) throw new Error('El contenido del archivo no corresponde a su formato.');
  return await cargarImagen(file);
}

function dibujarCarnet(pdf, imagen, perfil) {
  pdf.setFillColor(248, 250, 252); pdf.rect(0, 0, 54, 86, 'F');
  pdf.setFillColor(15, 23, 42); pdf.rect(0, 0, 54, 24, 'F');
  pdf.setDrawColor(100, 116, 139); pdf.setLineWidth(0.2); pdf.line(5, 17.5, 49, 17.5);
  pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15);
  pdf.text('UMA', 5, 10.8);
  pdf.setFontSize(5.7); pdf.text(['UNIVERSIDAD', 'MODULAR ABIERTA'], 23, 7.5, { lineHeightFactor: 1.35 });
  pdf.setTextColor(203, 213, 225); pdf.setFontSize(5.2); pdf.setCharSpace(0.7);
  pdf.text('CARNET ESTUDIANTIL', 27, 21.2, { align: 'center' }); pdf.setCharSpace(0);
  pdf.setFillColor(226, 232, 240); pdf.roundedRect(12, 26.5, 30, 30, 2, 2, 'F');
  pdf.setFillColor(255, 255, 255); pdf.roundedRect(11.5, 26, 30, 30, 2, 2, 'F');
  pdf.addImage(imagen, 'JPEG', 13, 27.5, 27, 27);
  const nombre = String(perfil.nombreCompleto || `${perfil.nombres || ''} ${perfil.apellidos || ''}`).replace(/[\r\n]+/g, ' ').trim() || 'Estudiante';
  pdf.setTextColor(15, 23, 42); pdf.setFont('helvetica', 'bold');
  let tamano = 9.5;
  pdf.setFontSize(tamano);
  let lineas = pdf.splitTextToSize(nombre, 44);
  while (lineas.length * tamano * 0.3528 * 1.15 > 9 && tamano > 1) {
    tamano -= 0.25; pdf.setFontSize(tamano); lineas = pdf.splitTextToSize(nombre, 44);
  }
  pdf.text(lineas, 27, 60.5, { align: 'center', lineHeightFactor: 1.15 });
  pdf.setFillColor(15, 23, 42); pdf.roundedRect(5, 71, 44, 10, 2, 2, 'F');
  pdf.setTextColor(203, 213, 225); pdf.setFontSize(4.5); pdf.setCharSpace(0.4);
  pdf.text('NÚMERO DE CARNET', 27, 74.2, { align: 'center' }); pdf.setCharSpace(0);
  pdf.setTextColor(255, 255, 255); pdf.setFontSize(10);
  pdf.text(String(perfil.carnet || ''), 27, 78.8, { align: 'center', maxWidth: 40 });
  pdf.setTextColor(100, 116, 139); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(4.3);
  pdf.text('Codice · Portal Académico Institucional', 27, 84, { align: 'center' });
}

function Aviso({ children, error = false, accion, etiqueta = 'Reintentar' }) {
  return <div role={error ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
    <p>{children}</p>
    {accion && <button type="button" onClick={accion} className="mt-3 min-h-10 font-semibold underline underline-offset-4">{etiqueta}</button>}
  </div>;
}

function Campo({ id, label, error, children }) {
  return <div className="min-w-0">
    <label htmlFor={id} className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</label>
    {children}
    {error && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </div>;
}

function Dato({ label, value }) {
  return <div className="min-w-0"><dt className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="break-words rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-900 [overflow-wrap:anywhere]">{value || 'No registrado'}</dd></div>;
}

function Modal({ titulo, children, cerrar, ocupado = false, tono = 'normal' }) {
  const tituloId = useId();
  const ref = useRef(null);
  const cerrarRef = useRef(cerrar);
  const ocupadoRef = useRef(ocupado);
  useEffect(() => { cerrarRef.current = cerrar; ocupadoRef.current = ocupado; }, [cerrar, ocupado]);
  useEffect(() => {
    const anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const teclado = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!ocupadoRef.current) cerrarRef.current();
      }
      if (e.key !== 'Tab') return;
      const elementos = [...(ref.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || [])].filter(el => el.getClientRects().length);
      const primero = elementos[0], ultimo = elementos.at(-1);
      if (!primero) { e.preventDefault(); ref.current?.focus(); }
      else if (e.shiftKey && (document.activeElement === primero || document.activeElement === ref.current)) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    };
    document.addEventListener('keydown', teclado);
    return () => {
      document.removeEventListener('keydown', teclado);
      document.body.style.overflow = overflow;
      if (anterior?.isConnected) anterior.focus();
    };
  }, []);
  return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 p-3 backdrop-blur-[2px] sm:p-6">
    <section ref={ref} role="dialog" aria-modal="true" aria-labelledby={tituloId} tabIndex={-1} aria-busy={ocupado}
      className="max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-[24px] border border-white/80 bg-white p-6 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.4)] outline-none sm:p-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div aria-hidden="true" className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${tono === 'aviso' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-900'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              {tono === 'aviso' ? <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v4m0 4h.01" /></> : <><path d="M12 3 4 6v6c0 4 8 9 8 9s8-5 8-9V6l-8-3Z" /><path d="m8 12 3 3 5-6" /></>}
            </svg>
          </div>
          <h2 id={tituloId} className="text-xl font-extrabold tracking-tight text-slate-900">{titulo}</h2>
        </div>
        <button type="button" onClick={cerrar} disabled={ocupado} aria-label="Cerrar ventana" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl disabled:opacity-50">×</button>
      </div>{children}
    </section>
  </div>, document.body);
}

function Avatar({ src, nombre }) {
  const [fallo, setFallo] = useState(false);
  return <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 text-3xl font-bold text-slate-600 shadow-sm">
    {src && !fallo ? <img src={src} alt={`Fotografía de ${nombre || 'perfil'}`} onError={() => setFallo(true)} className="h-full w-full object-cover" /> : (nombre?.trim().charAt(0).toUpperCase() || 'U')}
  </div>;
}

function limitarRecorte(ancho, alto, propuesta) {
  const zoom = Math.min(3, Math.max(1, propuesta.zoom));
  const lado = Math.min(ancho, alto) / zoom;
  return {
    zoom,
    x: Math.min(ancho - lado / 2, Math.max(lado / 2, propuesta.x)),
    y: Math.min(alto - lado / 2, Math.max(lado / 2, propuesta.y)),
    lado,
  };
}

function VistaRecorte({ imagen, url, recorte }) {
  return <img src={url} alt="" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{
    width: `${imagen.naturalWidth / recorte.lado * 100}%`,
    height: `${imagen.naturalHeight / recorte.lado * 100}%`,
    left: `${50 - recorte.x / recorte.lado * 100}%`,
    top: `${50 - recorte.y / recorte.lado * 100}%`,
  }} />;
}

function EditorFoto({ imagen, url, cancelar, aceptar }) {
  const ancho = imagen.naturalWidth, alto = imagen.naturalHeight;
  const inicial = limitarRecorte(ancho, alto, { x: ancho / 2, y: alto / 2, zoom: 1 });
  const [recorte, setRecorte] = useState(inicial);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const actual = useRef(inicial);
  const punteros = useRef(new Map());
  const gesto = useRef(null);
  const area = useRef(null);
  const bloqueado = useRef(false);
  const montado = useRef(true);
  const zoomId = useId();
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);
  const cambiar = valor => {
    if (bloqueado.current) return;
    const nuevo = limitarRecorte(ancho, alto, valor);
    actual.current = nuevo;
    setRecorte(nuevo);
  };
  const iniciarGesto = () => {
    const puntos = [...punteros.current.values()];
    const rect = area.current?.getBoundingClientRect();
    if (!puntos.length || !rect?.width) { gesto.current = null; return; }
    const primero = puntos[0], segundo = puntos[1];
    gesto.current = {
      recorte: { ...actual.current }, rect,
      x: segundo ? (primero.x + segundo.x) / 2 : primero.x,
      y: segundo ? (primero.y + segundo.y) / 2 : primero.y,
      distancia: segundo ? Math.hypot(segundo.x - primero.x, segundo.y - primero.y) : 0,
    };
  };
  const presionar = e => {
    if (bloqueado.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    iniciarGesto();
  };
  const mover = e => {
    if (bloqueado.current || !punteros.current.has(e.pointerId) || !gesto.current) return;
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const puntos = [...punteros.current.values()];
    const g = gesto.current, a = puntos[0], b = puntos[1];
    if (b && g.distancia > 0) {
      const distancia = Math.hypot(b.x - a.x, b.y - a.y);
      const zoom = Math.min(3, Math.max(1, g.recorte.zoom * distancia / g.distancia));
      const lado = Math.min(ancho, alto) / zoom;
      const medioX = (a.x + b.x) / 2, medioY = (a.y + b.y) / 2;
      const anclaX = g.recorte.x + ((g.x - g.rect.left) / g.rect.width - 0.5) * g.recorte.lado;
      const anclaY = g.recorte.y + ((g.y - g.rect.top) / g.rect.width - 0.5) * g.recorte.lado;
      cambiar({ zoom, x: anclaX - ((medioX - g.rect.left) / g.rect.width - 0.5) * lado, y: anclaY - ((medioY - g.rect.top) / g.rect.width - 0.5) * lado });
    } else {
      cambiar({ ...g.recorte, x: g.recorte.x - (a.x - g.x) * g.recorte.lado / g.rect.width, y: g.recorte.y - (a.y - g.y) * g.recorte.lado / g.rect.width });
    }
  };
  const soltar = e => {
    punteros.current.delete(e.pointerId);
    iniciarGesto();
  };
  const teclado = e => {
    const paso = actual.current.lado * (e.shiftKey ? 0.1 : 0.02);
    const desplazamientos = { ArrowLeft: [paso, 0], ArrowRight: [-paso, 0], ArrowUp: [0, paso], ArrowDown: [0, -paso] };
    if (desplazamientos[e.key]) {
      e.preventDefault();
      const [dx, dy] = desplazamientos[e.key];
      cambiar({ ...actual.current, x: actual.current.x + dx, y: actual.current.y + dy });
    }
  };
  const confirmar = async () => {
    if (bloqueado.current) return;
    bloqueado.current = true; setProcesando(true); setError('');
    try {
      const r = actual.current;
      const tamano = Math.max(1, Math.min(1024, Math.floor(r.lado)));
      const canvas = document.createElement('canvas'); canvas.width = tamano; canvas.height = tamano;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Tu navegador no permite procesar la fotografía.');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, tamano, tamano);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imagen, r.x - r.lado / 2, r.y - r.lado / 2, r.lado, r.lado, 0, 0, tamano, tamano);
      const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('No se pudo crear el recorte.')), 'image/jpeg', 0.9));
      if (blob.size > LIMITE_FOTO) throw new Error('La foto procesada supera los 2 MB. Prueba con otra imagen.');
      if (montado.current) aceptar(new File([blob], 'foto-perfil.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
    } catch (e) { if (montado.current) setError(e.message || 'No se pudo procesar la imagen.'); }
    finally { bloqueado.current = false; if (montado.current) setProcesando(false); }
  };
  return <Modal titulo="Acomoda tu fotografía" cerrar={cancelar} ocupado={procesando}>
    <p className="mb-4 text-sm leading-relaxed text-slate-500">Arrastra la imagen para centrar tu rostro. En celular puedes ampliar con dos dedos.</p>
    <div ref={area} role="group" tabIndex={procesando ? -1 : 0} aria-label="Área de recorte. Arrastra la foto o usa las flechas del teclado para moverla."
      onPointerDown={presionar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} onLostPointerCapture={soltar} onKeyDown={teclado}
      className="relative mx-auto aspect-square w-full max-w-[320px] touch-none select-none overflow-hidden rounded-2xl border border-slate-200 bg-white outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
      style={{ cursor: procesando ? 'wait' : 'grab' }}>
      <VistaRecorte imagen={imagen} url={url} recorte={recorte} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/90 shadow-[0_0_0_100px_rgba(15,23,42,0.45)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30"><div className="absolute left-1/3 top-0 h-full border-l border-white" /><div className="absolute left-2/3 top-0 h-full border-l border-white" /><div className="absolute left-0 top-1/3 w-full border-t border-white" /><div className="absolute left-0 top-2/3 w-full border-t border-white" /></div>
    </div>
    <div className="mt-5"><div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600"><label htmlFor={zoomId}>Ampliación</label><output htmlFor={zoomId}>{recorte.zoom.toFixed(1)}×</output></div>
      <input id={zoomId} type="range" min="1" max="3" step="0.01" value={recorte.zoom} disabled={procesando} onChange={e => cambiar({ ...actual.current, zoom: Number(e.target.value) })} className="h-8 w-full accent-slate-900" />
    </div>
    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><div aria-hidden="true" className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white bg-white shadow-sm"><VistaRecorte imagen={imagen} url={url} recorte={recorte} /></div>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Así se verá tu perfil</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Se guardará un recorte cuadrado para usarlo también en el carnet.</p></div>
      <button type="button" disabled={procesando} onClick={() => cambiar(inicial)} className="min-h-11 text-xs font-semibold text-slate-700 underline underline-offset-4">Centrar</button>
    </div>
    {recorte.lado < 300 && <p role="status" className="mt-3 text-xs text-amber-800">Este recorte tiene poca resolución. Reduce el zoom o elige una foto más grande para obtener un carnet más nítido.</p>}
    {error && <div className="mt-3"><Aviso error>{error}</Aviso></div>}
    <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" disabled={procesando} onClick={cancelar} className={secondaryClass}>Cancelar</button><button type="button" disabled={procesando} onClick={confirmar} className={primaryClass}>{procesando ? 'Preparando…' : 'Usar este recorte'}</button></div>
    <p className="mt-3 text-center text-xs text-slate-500">La foto se subirá cuando pulses Guardar fotografía.</p>
  </Modal>;
}

function PanelAjustes({ token, idSesionActual }) {
  const [tab, setTab] = useState('perfil');
  const [perfil, setPerfil] = useState(null);
  const [form, setForm] = useState(datosContacto(null));
  const [editando, setEditando] = useState(false);
  const [tocados, setTocados] = useState({});
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [errorPerfil, setErrorPerfil] = useState('');
  const [errorGuardar, setErrorGuardar] = useState('');
  const [sesiones, setSesiones] = useState([]);
  const [cargandoSesiones, setCargandoSesiones] = useState(false);
  const [errorSesiones, setErrorSesiones] = useState('');
  const [revisionPerfil, setRevisionPerfil] = useState(0);
  const [revisionSesiones, setRevisionSesiones] = useState(0);
  const [ocupacion, setOcupacion] = useState('');
  const [modal, setModal] = useState(null);
  const [clave, setClave] = useState({ actual: '', nueva: '', confirmacion: '' });
  const [visibles, setVisibles] = useState({});
  const [errorClave, setErrorClave] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [previa, setPrevia] = useState('');
  const [errorFoto, setErrorFoto] = useState('');
  const fileRef = useRef(null);
  const ocupadoRef = useRef(false);
  const vivo = useRef(false);
  const peticiones = useRef(new Set());
  const id = useId();
  const ocupado = Boolean(ocupacion);
  const errores = erroresContacto(form);
  const cambios = editando && JSON.stringify(prepararContacto(form)) !== JSON.stringify(prepararContacto(datosContacto(perfil)));
  const pendiente = cambios || Boolean(archivo) || modal?.tipo === 'recortar' || Boolean(clave.actual || clave.nueva || clave.confirmacion);
  const fotoUrl = urlFotoSegura(perfil?.urlFoto);

  useEffect(() => {
    vivo.current = true;
    const controles = peticiones.current;
    return () => { vivo.current = false; controles.forEach(c => c.abort()); controles.clear(); };
  }, []);

  const vigente = useCallback(() => vivo.current && leerSesion().token === token, [token]);

  const solicitar = useCallback(async (ruta, opciones = {}, permitirVacia = false) => {
    if (leerSesion().token !== token) throw new Error('La sesión cambió. Vuelve a abrir Ajustes.');
    const control = new AbortController();
    const externo = opciones.signal;
    const abortar = () => control.abort();
    if (externo?.aborted) control.abort();
    externo?.addEventListener('abort', abortar, { once: true });
    peticiones.current.add(control);
    let timeout = false;
    const timer = setTimeout(() => { timeout = true; control.abort(); }, 30000);
    try {
      const response = await apiInterceptor(ruta, { ...opciones, signal: control.signal });
      const data = await leerRespuesta(response, permitirVacia);
      if (leerSesion().token !== token) throw new Error('La sesión cambió durante la operación.');
      return data;
    } catch (error) {
      if (timeout) throw new Error('El servidor tardó demasiado. Comprueba el resultado antes de repetir la operación.', { cause: error });
      if (error instanceof TypeError) throw new Error('No se pudo confirmar la respuesta. Revisa la conexión y actualiza los datos antes de reintentar.', { cause: error });
      throw error;
    } finally {
      clearTimeout(timer);
      externo?.removeEventListener('abort', abortar);
      peticiones.current.delete(control);
    }
  }, [token]);

  useEffect(() => {
    const control = new AbortController();
    solicitar('/api/v1/ajustes/perfil', { signal: control.signal }).then(data => {
      if (!objeto(data) || !['nombreCompleto', 'nombres', 'correoInstitucional'].some(k => typeof data[k] === 'string')) throw new Error('El perfil recibido tiene un formato inesperado.');
      if (!control.signal.aborted && vigente()) {
        setPerfil(data); setForm(datosContacto(data)); setErrorPerfil('');
      }
    }).catch(error => {
      if (!control.signal.aborted && vigente()) setErrorPerfil(error.message);
    }).finally(() => {
      if (!control.signal.aborted && vigente()) setCargandoPerfil(false);
    });
    return () => control.abort();
  }, [revisionPerfil, solicitar, vigente]);

  useEffect(() => {
    if (tab !== 'sesiones') return;
    const control = new AbortController();
    solicitar('/api/v1/sesiones/historial', { signal: control.signal }).then(data => {
      if (!Array.isArray(data) || data.some(s => !objeto(s) || !/^[1-9]\d*$/.test(String(s.idSesion)))) throw new Error('El historial recibido tiene un formato inesperado.');
      if (!control.signal.aborted && vigente()) {
        setSesiones([...data].sort((a, b) => (Date.parse(b.fechaInicio) || 0) - (Date.parse(a.fechaInicio) || 0)));
        setErrorSesiones('');
      }
    }).catch(error => {
      if (!control.signal.aborted && vigente()) setErrorSesiones(error.message);
    }).finally(() => {
      if (!control.signal.aborted && vigente()) setCargandoSesiones(false);
    });
    return () => control.abort();
  }, [tab, revisionSesiones, solicitar, vigente]);

  useEffect(() => {
    if (!pendiente && !ocupado) return;
    const advertir = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', advertir);
    return () => window.removeEventListener('beforeunload', advertir);
  }, [pendiente, ocupado]);

  useEffect(() => {
    if (!previa) return;
    return () => URL.revokeObjectURL(previa);
  }, [previa]);

  const fuenteRecorte = modal?.tipo === 'recortar' ? modal.url : '';
  useEffect(() => {
    if (!fuenteRecorte) return;
    return () => URL.revokeObjectURL(fuenteRecorte);
  }, [fuenteRecorte]);

  const iniciar = nombre => {
    if (ocupadoRef.current || !vigente()) return false;
    ocupadoRef.current = true; setOcupacion(nombre); return true;
  };
  const terminar = () => {
    ocupadoRef.current = false;
    if (vigente()) setOcupacion('');
  };
  const refrescarSesiones = () => { setCargandoSesiones(true); setErrorSesiones(''); setRevisionSesiones(v => v + 1); };
  const descartar = () => {
    setForm(datosContacto(perfil)); setEditando(false); setTocados({}); setErrorGuardar('');
    setArchivo(null); setPrevia(''); setErrorFoto('');
  };
  const cambiarTab = siguiente => {
    if (ocupado || tab === siguiente) return;
    if (cambios || archivo) { setModal({ tipo: 'descartar', destino: siguiente }); return; }
    descartar();
    if (siguiente === 'sesiones') { setCargandoSesiones(true); setErrorSesiones(''); }
    setTab(siguiente);
  };
  const cerrarModal = () => {
    if (ocupadoRef.current) return;
    setModal(null); setClave({ actual: '', nueva: '', confirmacion: '' }); setVisibles({}); setErrorClave('');
  };

  const solicitarGuardado = e => {
    e.preventDefault();
    setTocados({ correoPersonal: true, telefono: true, direccion: true });
    if (ocupadoRef.current || Object.keys(errores).length || !cambios) return;
    setErrorGuardar('');
    setModal({ tipo: 'guardar', datos: prepararContacto(form) });
  };
  const cancelarEdicion = () => {
    if (ocupadoRef.current) return;
    if (cambios) { setModal({ tipo: 'descartar', destino: 'contacto' }); return; }
    setForm(datosContacto(perfil)); setEditando(false); setTocados({}); setErrorGuardar('');
  };
  const confirmarDescarte = () => {
    if (ocupadoRef.current) return;
    const destino = modal?.destino;
    if (destino === 'contacto') {
      setForm(datosContacto(perfil)); setEditando(false); setTocados({}); setErrorGuardar('');
    } else {
      descartar();
      if (destino === 'sesiones') { setCargandoSesiones(true); setErrorSesiones(''); }
      if (destino === 'sesiones' || destino === 'perfil') setTab(destino);
    }
    cerrarModal();
  };
  const guardarPerfil = async () => {
    const enviados = modal?.tipo === 'guardar' ? modal.datos : null;
    if (!enviados || Object.keys(erroresContacto(enviados)).length || !iniciar('perfil')) return;
    setErrorGuardar('');
    try {
      await solicitar('/api/v1/ajustes/perfil', { method: 'PUT', body: JSON.stringify(enviados) }, true);
      if (!vigente()) return;
      setPerfil(prev => ({ ...prev, ...enviados })); setForm(enviados); setEditando(false); setTocados({}); setModal(null);
      toast.success('Datos de contacto actualizados');
    } catch (error) { if (vigente()) setErrorGuardar(error.message); }
    finally { terminar(); }
  };

  const guardarClave = async e => {
    e.preventDefault();
    const error = validarPassword(clave);
    if (error) { setErrorClave(error); return; }
    if (!iniciar('password')) return;
    setErrorClave('');
    try {
      await solicitar('/api/v1/ajustes/password', { method: 'PUT', body: JSON.stringify({
        passwordActual: clave.actual, nuevaPassword: clave.nueva, confirmarPassword: clave.confirmacion,
      }) }, true);
      if (!vigente()) return;
      setClave({ actual: '', nueva: '', confirmacion: '' }); setVisibles({}); setModal(null);
      toast.success('Contraseña actualizada');
    } catch (error) { if (vigente()) setErrorClave(error.message); }
    finally { terminar(); }
  };

  const seleccionarFoto = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !iniciar('validar-foto')) return;
    setErrorFoto('');
    try {
      const imagen = await validarFoto(file);
      if (vigente()) setModal({ tipo: 'recortar', imagen, url: URL.createObjectURL(file) });
    } catch (error) { if (vigente()) { setErrorFoto(error.message); setModal(null); } }
    finally { terminar(); }
  };

  const subirFoto = async () => {
    if (!archivo || !iniciar('foto')) return;
    setErrorFoto('');
    try {
      const body = new FormData(); body.append('foto', archivo);
      const data = await solicitar('/api/v1/ajustes/foto', { method: 'POST', body });
      if (!urlFotoSegura(data?.urlFoto)) throw new Error('No se recibió una dirección válida para la foto. Actualiza el perfil antes de volver a subirla.');
      if (!vigente()) return;
      setPerfil(prev => ({ ...prev, urlFoto: data.urlFoto })); setArchivo(null); setPrevia('');
      try { localStorage.setItem('urlFoto', data.urlFoto); } catch { /* La foto ya quedó guardada en el servidor. */ }
      window.dispatchEvent(new CustomEvent('fotoActualizada', { detail: data.urlFoto }));
      toast.success('Fotografía actualizada');
    } catch (error) { if (vigente()) setErrorFoto(error.message); }
    finally { terminar(); }
  };

  const cerrarSesiones = async () => {
    const todas = modal?.tipo === 'todas';
    const sesionId = modal?.id;
    if ((!todas && !/^[1-9]\d*$/.test(String(sesionId))) || !iniciar('cerrar')) return;
    try {
      await solicitar(todas ? '/api/v1/sesiones/cerrar-todas' : `/api/v1/sesiones/${encodeURIComponent(sesionId)}/cerrar`, { method: 'POST' }, true);
      if (!vigente()) return;
      if (todas || String(sesionId) === String(idSesionActual)) {
        limpiarSesion();
        toast.success(todas ? 'Se cerraron todas tus sesiones' : 'Sesión cerrada');
      } else {
        setModal(null); refrescarSesiones(); toast.success('Sesión cerrada correctamente');
      }
    } catch (error) { if (vigente()) toast.error('No se pudo cerrar la sesión', { description: error.message }); }
    finally { terminar(); }
  };

  const generarCarnet = async () => {
    if (perfil?.esEstudiante !== true || !fotoUrl || !perfil.carnet || !iniciar('carnet')) return;
    const control = new AbortController();
    peticiones.current.add(control);
    const timer = setTimeout(() => control.abort(), 30000);
    try {
      const response = await fetch(fotoUrl, { signal: control.signal });
      if (!response.ok) throw new Error('No se pudo descargar la fotografía para el carnet.');
      const blob = await response.blob();
      if (!['image/jpeg', 'image/png'].includes(blob.type) || blob.size > LIMITE_FOTO) throw new Error('La fotografía guardada no es compatible con el carnet. Sube una imagen JPG o PNG de hasta 2 MB.');
      const img = await cargarImagen(blob);
      const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('El navegador no permite generar la imagen del carnet.');
      const lado = Math.min(img.naturalWidth, img.naturalHeight);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 600, 600);
      ctx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, 600, 600);
      const { default: jsPDF } = await import('jspdf');
      if (!vigente() || control.signal.aborted) return;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [54, 86] });
      dibujarCarnet(pdf, canvas.toDataURL('image/jpeg', 0.94), perfil);
      pdf.save('carnet-codice.pdf');
      toast.success('Carnet generado', { description: 'Se inició la descarga del PDF.' });
    } catch (error) {
      if (vigente()) toast.error('No se pudo generar el carnet', { description: error.name === 'AbortError' ? 'La descarga tardó demasiado. Inténtalo nuevamente.' : error.message });
    } finally { clearTimeout(timer); peticiones.current.delete(control); terminar(); }
  };

  const nombre = perfil?.nombreCompleto || [perfil?.nombres, perfil?.apellidos].filter(Boolean).join(' ') || 'Mi cuenta';

  return <main className="mx-auto w-full max-w-5xl space-y-6 pb-16 text-slate-900">
    <header><p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Mi cuenta</p>
      <h1 className="text-3xl font-extrabold tracking-tight">Ajustes</h1><p className="mt-2 text-sm text-slate-500">Administra tus datos de contacto, fotografía y seguridad.</p></header>
    <div role="group" aria-label="Secciones de ajustes" className="flex flex-wrap gap-2">
      {[['perfil', 'Perfil y seguridad'], ['sesiones', 'Historial de sesiones']].map(([valor, texto]) => <button key={valor} type="button" aria-pressed={tab === valor} disabled={ocupado} onClick={() => cambiarTab(valor)} className={tab === valor ? primaryClass : secondaryClass}>{texto}</button>)}
    </div>
    {tab === 'perfil' && <>
      {cargandoPerfil ? <Aviso>Cargando tu información…</Aviso> : errorPerfil ? <Aviso error accion={() => { setCargandoPerfil(true); setErrorPerfil(''); setRevisionPerfil(v => v + 1); }}>{errorPerfil}</Aviso> : perfil && <>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="text-xl font-bold">Información personal</h2><p className="mt-1 text-sm text-slate-500">Los datos institucionales son de solo lectura.</p></div>
            {!editando && <button type="button" disabled={ocupado} onClick={() => { setForm(datosContacto(perfil)); setTocados({}); setErrorGuardar(''); setEditando(true); }} className={secondaryClass}>Editar contacto</button>}
          </div>
          <div className="my-6 flex flex-wrap items-center gap-5 border-b border-slate-100 pb-6">
            <Avatar key={archivo ? previa : fotoUrl} src={archivo ? previa : fotoUrl} nombre={nombre} />
            <div className="min-w-0 flex-1"><h3 className="break-words text-lg font-bold">{nombre}</h3>
              {perfil.esEstudiante === true && <p className="mt-1 text-sm text-slate-500">Carnet: {perfil.carnet || 'No disponible'}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {archivo ? <><button type="button" disabled={ocupado} onClick={subirFoto} className={primaryClass}>{ocupacion === 'foto' ? 'Subiendo…' : 'Guardar fotografía'}</button>
                  <button type="button" disabled={ocupado} onClick={() => { setArchivo(null); setPrevia(''); setErrorFoto(''); }} className={secondaryClass}>Descartar foto</button></> : <button type="button" disabled={ocupado} onClick={() => setModal({ tipo: 'foto' })} className={secondaryClass}>{ocupacion === 'validar-foto' ? 'Revisando imagen…' : 'Cambiar fotografía'}</button>}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={seleccionarFoto} className="hidden" aria-label="Seleccionar fotografía de perfil" />
          </div>
          {errorFoto && <div className="mb-5"><Aviso error>{errorFoto}</Aviso></div>}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Dato label="Nombres" value={perfil.nombres} /><Dato label="Apellidos" value={perfil.apellidos} />
            <Dato label="Documento de identidad" value={perfil.numeroDocumento} /><Dato label="Correo institucional" value={perfil.correoInstitucional} />
          </dl>
          <div className="mt-6 border-t border-slate-100 pt-6">
            {!editando ? <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Dato label="Correo personal" value={perfil.correoPersonal} /><Dato label="Teléfono" value={formatoTelefono(perfil.telefono)} /><div className="sm:col-span-2"><Dato label="Dirección" value={perfil.direccion} /></div></dl> :
              <form onSubmit={solicitarGuardado} noValidate className="space-y-5" aria-busy={ocupacion === 'perfil'}>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Campo id={`${id}-correo`} label="Correo personal" error={tocados.correoPersonal && errores.correoPersonal}>
                    <input id={`${id}-correo`} type="email" autoComplete="email" required disabled={ocupado} value={form.correoPersonal} onChange={e => setForm(prev => ({ ...prev, correoPersonal: e.target.value }))} onBlur={() => setTocados(prev => ({ ...prev, correoPersonal: true }))} aria-invalid={Boolean(tocados.correoPersonal && errores.correoPersonal)} aria-describedby={tocados.correoPersonal && errores.correoPersonal ? `${id}-correo-error` : undefined} className={inputClass} />
                  </Campo>
                  <Campo id={`${id}-telefono`} label="Teléfono" error={tocados.telefono && errores.telefono}>
                    <input id={`${id}-telefono`} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="7234-5678" required disabled={ocupado} value={form.telefono}
                      onChange={e => { const valor = e.target.value; if (!/^[\d\s-]*$/.test(valor) || valor.replace(/\D/g, '').length > 8) { setTocados(prev => ({ ...prev, telefono: true })); toast.warning('Teléfono inválido', { id: 'ajustes-telefono', description: 'Solo se admiten ocho dígitos. No se aceptan letras ni símbolos.' }); return; } setForm(prev => ({ ...prev, telefono: formatoTelefono(valor) })); }}
                      onBlur={() => setTocados(prev => ({ ...prev, telefono: true }))} aria-invalid={Boolean(tocados.telefono && errores.telefono)} aria-describedby={tocados.telefono && errores.telefono ? `${id}-telefono-error` : undefined} className={inputClass} />
                  </Campo>
                </div>
                <Campo id={`${id}-direccion`} label="Dirección" error={tocados.direccion && errores.direccion}>
                  <textarea id={`${id}-direccion`} autoComplete="street-address" rows={3} required disabled={ocupado} value={form.direccion} onChange={e => setForm(prev => ({ ...prev, direccion: e.target.value }))} onBlur={() => setTocados(prev => ({ ...prev, direccion: true }))} aria-invalid={Boolean(tocados.direccion && errores.direccion)} aria-describedby={tocados.direccion && errores.direccion ? `${id}-direccion-error` : undefined} className={`${inputClass} resize-y`} />
                </Campo>
                {errorGuardar && <Aviso error>{errorGuardar}</Aviso>}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" disabled={ocupado} onClick={cancelarEdicion} className={secondaryClass}>Cancelar</button>
                  <button type="submit" disabled={ocupado || !cambios || Object.keys(errores).length > 0} className={primaryClass}>{ocupacion === 'perfil' ? 'Guardando…' : 'Guardar cambios'}</button>
                </div>
                {!cambios && <p className="text-sm text-slate-500">No hay cambios pendientes.</p>}
              </form>}
          </div>
        </section>
        <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:p-6">
          <div><h2 className="text-lg font-bold">Seguridad de la cuenta</h2><p className="mt-1 text-sm text-slate-500">Actualiza tu contraseña utilizando tu clave actual.</p></div>
          <button type="button" disabled={ocupado} onClick={() => setModal({ tipo: 'password' })} className={secondaryClass}>Cambiar contraseña</button>
        </section>
        {perfil.esEstudiante === true && <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:p-6">
          <div><h2 className="text-lg font-bold">Carnet digital</h2><p className="mt-1 text-sm text-slate-500">Descarga tu carnet con la fotografía guardada en tu perfil.</p>{(!fotoUrl || !perfil.carnet) && <p className="mt-2 text-sm text-slate-500">Necesitas una fotografía guardada y un número de carnet.</p>}</div>
          <button type="button" onClick={generarCarnet} disabled={ocupado || !fotoUrl || !perfil.carnet || Boolean(archivo)} className={secondaryClass}>{ocupacion === 'carnet' ? 'Generando…' : 'Descargar carnet'}</button>
        </section>}
      </>}
    </>}
    {tab === 'sesiones' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Historial de sesiones</h2><p className="mt-1 text-sm text-slate-500">Accesos registrados. Horarios de El Salvador.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={refrescarSesiones} disabled={ocupado || cargandoSesiones} className={secondaryClass}>Actualizar</button><button type="button" disabled={ocupado || cargandoSesiones || Boolean(errorSesiones) || !sesiones.some(sesionAbierta)} onClick={() => setModal({ tipo: 'todas' })} className={`${secondaryClass} text-red-700`}>Cerrar todas</button></div></div>
      {cargandoSesiones ? <Aviso>Cargando sesiones…</Aviso> : errorSesiones ? <Aviso error accion={refrescarSesiones}>{errorSesiones}</Aviso> : !sesiones.length ? <Aviso>No hay sesiones registradas.</Aviso> : <ul className="space-y-3">
        {sesiones.map(s => {
          const actual = String(s.idSesion) === String(idSesionActual);
          const abierta = sesionAbierta(s);
          return <li key={s.idSesion} className={`rounded-xl border p-4 ${actual ? 'border-slate-400 bg-slate-50' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold [overflow-wrap:anywhere]">{typeof s.dispositivo === 'string' && s.dispositivo.trim() ? s.dispositivo : 'Dispositivo no informado'}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">{actual && <span className="rounded-full bg-black px-3 py-1 text-white">Esta sesión</span>}<span className={`rounded-full px-3 py-1 ${s.exitosa === false ? 'bg-red-50 text-red-700' : abierta ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{s.exitosa === false ? 'Intento fallido' : abierta ? 'Sin cierre registrado' : 'Finalizada'}</span>{s.esAnomalia === true && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-900">Acceso marcado para revisión</span>}</div>
            </div>{abierta && <button type="button" disabled={ocupado} onClick={() => setModal({ tipo: 'sesion', id: s.idSesion, actual })} className={`${secondaryClass} text-red-700`}>{ocupacion === 'cerrar' && modal?.id === s.idSesion ? 'Cerrando…' : actual ? 'Cerrar esta sesión' : 'Cerrar sesión'}</button>}</div>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3"><div><dt className="text-xs text-slate-500">Dirección IP</dt><dd className="mt-1 break-all font-mono">{s.direccionIp || 'No disponible'}</dd></div><div><dt className="text-xs text-slate-500">Inicio</dt><dd className="mt-1">{fechaSesion(s.fechaInicio)}</dd></div><div><dt className="text-xs text-slate-500">Fin</dt><dd className="mt-1">{s.fechaFin ? fechaSesion(s.fechaFin) : 'Sin cierre registrado'}</dd></div></dl>
          </li>;
        })}
      </ul>}
    </section>}
    {modal?.tipo === 'guardar' && <Modal titulo="¿Guardar estos cambios?" cerrar={cerrarModal} ocupado={ocupado}>
      <p className="text-sm leading-relaxed text-slate-500">Revisa tus datos de contacto antes de actualizar el perfil.</p>
      <dl className="mt-5 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        {[['correoPersonal', 'Correo personal'], ['telefono', 'Teléfono'], ['direccion', 'Dirección']].map(([campo, etiqueta]) => {
          const anterior = prepararContacto(datosContacto(perfil))[campo];
          const actualizado = modal.datos[campo];
          const cambio = anterior !== actualizado;
          return <div key={campo} className="min-w-0"><dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{etiqueta}{cambio && <span className="ml-2 normal-case tracking-normal text-slate-800">· Modificado</span>}</dt>
            {cambio && <dd className="mt-1 break-words text-xs text-slate-400 line-through [overflow-wrap:anywhere]">{anterior || 'Sin registrar'}</dd>}
            <dd className="mt-1 break-words text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{actualizado}</dd></div>;
        })}
      </dl>
      {errorGuardar && <div className="mt-4"><Aviso error>{errorGuardar}</Aviso></div>}
      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <button type="button" disabled={ocupado} onClick={cerrarModal} className={secondaryClass}>Seguir editando</button>
        <button type="button" disabled={ocupado} onClick={guardarPerfil} className={primaryClass}>{ocupacion === 'perfil' ? 'Guardando…' : 'Confirmar y guardar'}</button>
      </div>
    </Modal>}
    {modal?.tipo === 'descartar' && <Modal titulo="¿Descartar los cambios?" tono="aviso" cerrar={cerrarModal} ocupado={ocupado}>
      <p className="text-sm leading-relaxed text-slate-500">{modal.destino === 'contacto' ? 'Los cambios del formulario todavía no se han guardado. Si los descartas, se restaurarán los datos anteriores.' : 'Hay información o una fotografía pendiente de guardar. Si cambias de sección, perderás esos cambios.'}</p>
      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <button type="button" onClick={cerrarModal} className={secondaryClass}>Seguir editando</button>
        <button type="button" onClick={confirmarDescarte} className={primaryClass}>Sí, descartar</button>
      </div>
    </Modal>}
    {modal?.tipo === 'recortar' && <EditorFoto imagen={modal.imagen} url={modal.url} cancelar={cerrarModal} aceptar={file => { if (!vigente()) return; setArchivo(file); setPrevia(URL.createObjectURL(file)); setErrorFoto(''); setModal(null); }} />}
    {modal?.tipo === 'foto' && <Modal titulo="Fotografía de perfil" cerrar={cerrarModal} ocupado={ocupado}>
      <p className="text-sm leading-relaxed text-slate-600">Selecciona una fotografía clara de tu rostro, preferiblemente con fondo liso. Estas recomendaciones no se verifican automáticamente.</p>
      <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">JPG o PNG · Hasta 2 MB · Hasta 16 megapíxeles para la previsualización.</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" disabled={ocupado} onClick={cerrarModal} className={secondaryClass}>Cancelar</button><button type="button" disabled={ocupado} onClick={() => fileRef.current?.click()} className={primaryClass}>{ocupacion === 'validar-foto' ? 'Revisando…' : 'Seleccionar imagen'}</button></div>
    </Modal>}
    {modal?.tipo === 'password' && <Modal titulo="Cambiar contraseña" cerrar={cerrarModal} ocupado={ocupado}>
      <form onSubmit={guardarClave} className="space-y-4">
        {[['actual', 'Contraseña actual', 'current-password'], ['nueva', 'Nueva contraseña', 'new-password'], ['confirmacion', 'Confirmar nueva contraseña', 'new-password']].map(([campo, label, autocomplete]) => <Campo key={campo} id={`${id}-${campo}`} label={label}>
          <div className="relative"><input id={`${id}-${campo}`} type={visibles[campo] ? 'text' : 'password'} autoComplete={autocomplete} required disabled={ocupado} value={clave[campo]} onChange={e => { setClave(prev => ({ ...prev, [campo]: e.target.value })); setErrorClave(''); }} className={`${inputClass} pr-24`} />
            <button type="button" disabled={ocupado} aria-label={`${visibles[campo] ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-pressed={Boolean(visibles[campo])} onClick={() => setVisibles(prev => ({ ...prev, [campo]: !prev[campo] }))} className="absolute inset-y-0 right-1 px-3 text-xs font-semibold text-slate-600">{visibles[campo] ? 'Ocultar' : 'Mostrar'}</button></div>
        </Campo>)}
        <ul className="space-y-2 rounded-xl bg-slate-50 p-4 text-xs">{Object.entries(requisitosPassword(clave.nueva)).map(([texto, cumple]) => <li key={texto} className={cumple ? 'text-emerald-800' : 'text-slate-500'}>{cumple ? '✓' : '○'} {texto}</li>)}</ul>
        {clave.confirmacion && clave.confirmacion !== clave.nueva && <p role="alert" className="text-sm text-red-700">Las contraseñas no coinciden.</p>}
        {clave.actual && clave.nueva && clave.actual === clave.nueva && <p role="alert" className="text-sm text-red-700">La nueva contraseña debe ser diferente de la actual.</p>}
        {errorClave && <Aviso error>{errorClave}</Aviso>}
        <div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={ocupado} onClick={cerrarModal} className={secondaryClass}>Cancelar</button><button type="submit" disabled={ocupado || Boolean(validarPassword(clave))} className={primaryClass}>{ocupacion === 'password' ? 'Actualizando…' : 'Actualizar contraseña'}</button></div>
      </form>
    </Modal>}
    {['sesion', 'todas'].includes(modal?.tipo) && <Modal titulo={modal.tipo === 'todas' ? 'Cerrar todas las sesiones' : 'Cerrar sesión'} cerrar={cerrarModal} ocupado={ocupado}>
      <p className="text-sm leading-relaxed text-slate-600">{modal.tipo === 'todas' ? 'Se solicitará el cierre de todas tus sesiones, incluida la que estás usando. Tendrás que iniciar sesión nuevamente.' : modal.actual ? 'Vas a cerrar la sesión de este navegador y volver al inicio de sesión.' : 'Se solicitará al servidor que cierre esta sesión. Tu sesión actual permanecerá abierta.'}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" disabled={ocupado} onClick={cerrarModal} className={secondaryClass}>Cancelar</button><button type="button" disabled={ocupado} onClick={cerrarSesiones} className={primaryClass}>{ocupacion === 'cerrar' ? 'Cerrando…' : 'Confirmar cierre'}</button></div>
    </Modal>}
  </main>;
}

export default function Ajustes() {
  const sesion = useSesion();
  if (!sesion.valida) return null;
  return <PanelAjustes key={sesion.token} token={sesion.token} idSesionActual={sesion.payload?.idSesion} />;
}
