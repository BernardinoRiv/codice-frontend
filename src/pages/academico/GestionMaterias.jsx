import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, BookOpen, ChevronLeft, ChevronRight, CircleCheck, CircleMinus,
  Pencil, Plus, Power, RefreshCw, Search, ShieldAlert, X,
} from "lucide-react";
import { toast } from "sonner";
import apiInterceptor from "../../services/apiInterceptor";

const API = "/api/v1/materias";
const panel = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const boton = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const principal = "inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50";
const campo = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none";
const formatoUV = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 2 });
const formatoConteo = new Intl.NumberFormat("es-SV");

async function solicitar(ruta, { method = "GET", datos, signal } = {}) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Inicia sesión para gestionar las materias.");
  const respuesta = await apiInterceptor(ruta, {
    method,
    signal,
    headers: { Authorization: `Bearer ${token}` },
    body: datos === undefined ? undefined : JSON.stringify(datos),
  });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    const mensaje = cuerpo?.detail || cuerpo?.mensaje || cuerpo?.message;
    throw new Error(respuesta.status === 401
      ? "Tu sesión ha expirado. Inicia sesión nuevamente."
      : mensaje || `No se pudo completar la solicitud (${respuesta.status}).`);
  }
  return respuesta.json();
}

function rutaListado(busqueda, estado, pagina, tamanio) {
  const parametros = new URLSearchParams({ busqueda, pagina, tamanio });
  if (estado !== "") parametros.set("estado", estado);
  return `${API}?${parametros}`;
}

function useConsulta(ruta, revision = 0, espera = 0) {
  const [resultado, setResultado] = useState(null);
  useEffect(() => {
    if (!ruta) return;
    const control = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const datos = await solicitar(ruta, { signal: control.signal });
        if (!control.signal.aborted) setResultado({ ruta, revision, datos });
      } catch (error) {
        if (!control.signal.aborted) setResultado({ ruta, revision, error: error.message });
      }
    }, espera);
    return () => {
      clearTimeout(timer);
      control.abort();
    };
  }, [ruta, revision, espera]);

  return resultado?.ruta === ruta && resultado.revision === revision ? resultado : null;
}

function ResumenMaterias({ estado, filtrar, revision }) {
  const total = useConsulta(rutaListado("", "", 0, 1), revision);
  const activas = useConsulta(rutaListado("", "true", 0, 1), revision);
  const inactivas = useConsulta(rutaListado("", "false", 0, 1), revision);
  const tarjetas = [
    { filtro: "", titulo: "Total de materias", resultado: total, Icono: BookOpen, color: "bg-slate-100 text-slate-900" },
    { filtro: "true", titulo: "Materias activas", resultado: activas, Icono: CircleCheck, color: "bg-emerald-50 text-emerald-700" },
    { filtro: "false", titulo: "Materias inactivas", resultado: inactivas, Icono: CircleMinus, color: "bg-slate-100 text-slate-600" },
  ];

  return (
    <section aria-label="Resumen del catálogo y filtros por estado"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {tarjetas.map(({ filtro, titulo, resultado, Icono, color }) => {
        const seleccionada = estado === filtro;
        return (
          <button key={filtro} type="button" aria-pressed={seleccionada} onClick={() => filtrar(filtro)}
            className={`rounded-2xl border p-4 text-left shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:p-5 ${filtro === "" ? "col-span-2 sm:col-span-1" : ""} ${seleccionada
              ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
              : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"}`}>
            <span className="flex items-start justify-between gap-2">
              <span className="pt-1 text-sm font-bold text-slate-600">{titulo}</span>
              <span className={`shrink-0 rounded-xl p-2.5 ${color}`}><Icono size={19} aria-hidden="true" /></span>
            </span>
            <span className="mt-2 block text-3xl font-extrabold tracking-tight tabular-nums text-slate-900" aria-live="polite">
              {resultado?.datos
                ? formatoConteo.format(resultado.datos.page.totalElements)
                : <span className="text-slate-400" aria-label={resultado?.error ? "Conteo no disponible" : "Cargando conteo"}>—</span>}
            </span>
          </button>
        );
      })}
      {tarjetas.some(({ resultado }) => resultado?.error) && (
        <p role="status" className="col-span-full text-sm text-slate-500">
          Algunos conteos no están disponibles. Usa Actualizar listado para volver a consultarlos.
        </p>
      )}
    </section>
  );
}

function Estado({ activo }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${activo
      ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
      {activo ? "Activa" : "Inactiva"}
    </span>
  );
}

function ErrorConsulta({ mensaje, reintentar }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p>{mensaje}</p>
      {reintentar && <button type="button" className="mt-2 font-bold underline" onClick={reintentar}>Intentar de nuevo</button>}
    </div>
  );
}

function Paginacion({ pagina, total, cambiar }) {
  if (total < 2) return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm text-slate-600">
      <span className="mr-2">Página {pagina + 1} de {total}</span>
      <button type="button" aria-label="Página anterior" className={boton} disabled={pagina === 0} onClick={() => cambiar(pagina - 1)}>
        <ChevronLeft size={16} />
      </button>
      <button type="button" aria-label="Página siguiente" className={boton} disabled={pagina >= total - 1} onClick={() => cambiar(pagina + 1)}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function SelectorPrerrequisitos({ materiaId, seleccionados, cambiar, guardando }) {
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);
  const [revision, setRevision] = useState(0);
  const resultado = useConsulta(rutaListado(busqueda.trim(), "true", pagina, 8), revision, 200);
  const opciones = resultado?.datos?.content.filter((materia) =>
    materia.idMateria !== materiaId && !seleccionados.some(({ idMateria }) => idMateria === materia.idMateria),
  );

  return (
    <fieldset disabled={guardando} className="space-y-3">
      <legend className="mb-2 text-sm font-bold text-slate-800">Prerrequisitos</legend>
      <div className="flex flex-wrap gap-2">
        {seleccionados.length === 0 && <p className="text-sm text-slate-500">Sin prerrequisitos seleccionados.</p>}
        {seleccionados.map((materia) => (
          <button key={materia.idMateria} type="button"
            aria-label={`Quitar ${materia.nombreMateria}`}
            onClick={() => cambiar(seleccionados.filter(({ idMateria }) => idMateria !== materia.idMateria))}
            className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">
            {materia.codigoMateria} · {materia.nombreMateria}
            {!materia.estadoMateria && " (inactiva)"}
            <X size={14} />
          </button>
        ))}
      </div>
      <input aria-label="Buscar prerrequisitos activos" placeholder="Buscar materia activa por código o nombre"
        className={campo} value={busqueda} onChange={(event) => {
          setBusqueda(event.target.value);
          setPagina(0);
        }} />
      {resultado?.error ? <ErrorConsulta mensaje={resultado.error} reintentar={() => setRevision(revision + 1)} /> : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {!resultado && <p role="status" className="p-3 text-sm text-slate-500">Buscando materias…</p>}
          {opciones?.length === 0 && <p className="p-3 text-sm text-slate-500">Sin materias disponibles en esta página.</p>}
          {opciones?.map((materia) => (
            <button key={materia.idMateria} type="button" onClick={() => cambiar([...seleccionados, materia])}
              className="flex w-full items-center justify-between gap-2 p-3 text-left text-sm text-slate-700 hover:bg-slate-50">
              <span><strong>{materia.codigoMateria}</strong> · {materia.nombreMateria}</span>
              <Plus size={16} className="shrink-0 text-slate-900" />
            </button>
          ))}
        </div>
      )}
      <Paginacion pagina={pagina} total={resultado?.datos?.page.totalPages ?? 0} cambiar={setPagina} />
    </fieldset>
  );
}

function FormularioMateria({ modo, materia, cancelar, guardar }) {
  const [seleccionados, setSeleccionados] = useState(materia?.prerrequisitos ?? []);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [cambioCodigo, setCambioCodigo] = useState(null);
  const dialogoCodigo = useRef(null);
  const creando = modo === "crear";
  const cambiandoEstado = modo === "estado";
  const desactivando = cambiandoEstado && materia.estadoMateria;
  const [revisionEstado, setRevisionEstado] = useState(0);
  const verificacionEstado = useConsulta(desactivando ? `${API}/${materia.idMateria}` : null, revisionEstado);
  const dependientes = verificacionEstado?.datos?.codigosDependientesActivos;
  const desactivacionBloqueada = desactivando && (!Array.isArray(dependientes) || dependientes.length > 0);
  const titulo = {
    crear: "Nueva materia",
    editar: "Editar datos",
    requisitos: "Editar prerrequisitos",
    estado: materia?.estadoMateria ? "Inactivar materia" : "Activar materia",
  }[modo];

  async function guardarSolicitud(ruta, method, datos) {
    setError("");
    setGuardando(true);
    try {
      guardar(await solicitar(ruta, { method, datos }));
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  function enviar(event) {
    event.preventDefault();
    if (guardando || desactivacionBloqueada || dialogoCodigo.current.open) return;

    const ruta = `${API}/${materia?.idMateria}`;
    if (cambiandoEstado) {
      return guardarSolicitud(`${ruta}/estado`, "PATCH", { estadoMateria: !materia.estadoMateria });
    }

    const idsPrerrequisitos = seleccionados.map(({ idMateria }) => idMateria);
    if (modo === "requisitos") {
      return guardarSolicitud(`${ruta}/prerrequisitos`, "PUT", { idsPrerrequisitos });
    }

    const campos = new FormData(event.currentTarget);
    const codigoMateria = campos.get("codigoMateria").trim();
    const nombreMateria = campos.get("nombreMateria").trim();
    if (!codigoMateria || !nombreMateria) {
      setError("Escribe el código y el nombre de la materia.");
      return;
    }

    const datos = { codigoMateria, nombreMateria, unidadesValorativas: Number(campos.get("unidadesValorativas")) };
    if (creando) return guardarSolicitud(API, "POST", { ...datos, idsPrerrequisitos });
    if (codigoMateria === materia.codigoMateria) return guardarSolicitud(ruta, "PUT", datos);

    setError("");
    setCambioCodigo(datos);
    dialogoCodigo.current.showModal();
  }

  function confirmarCambioCodigo() {
    if (!dialogoCodigo.current.open || !cambioCodigo || guardando) return;
    dialogoCodigo.current.close();
    guardarSolicitud(`${API}/${materia.idMateria}`, "PUT", cambioCodigo);
  }

  return (
    <>
      <form className={`${panel} space-y-5`} onSubmit={enviar}>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">{titulo}</h2>
          {materia && <p className="mt-1 text-sm text-slate-500">{materia.codigoMateria} · {materia.nombreMateria}</p>}
        </div>
        {(creando || modo === "editar") && (
          <fieldset disabled={guardando} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-semibold">Código
              <input required name="codigoMateria" maxLength={20} className={campo} defaultValue={materia?.codigoMateria}
                aria-describedby={creando ? undefined : "materia-codigo-ayuda"} />
              {!creando && <span id="materia-codigo-ayuda" className="block text-xs font-normal text-slate-500">
                Cambiar el código requiere una confirmación al guardar.
              </span>}
            </label>
            <label className="space-y-1 text-sm font-semibold">Unidades valorativas
              <input required name="unidadesValorativas" type="number" min="0.01" max="99.99" step="0.01"
                className={campo} defaultValue={materia?.unidadesValorativas} />
            </label>
            <label className="space-y-1 text-sm font-semibold sm:col-span-2">Nombre
              <input required name="nombreMateria" maxLength={150} className={campo} defaultValue={materia?.nombreMateria} />
            </label>
          </fieldset>
        )}
        {(creando || modo === "requisitos") && (
          <SelectorPrerrequisitos materiaId={materia?.idMateria} seleccionados={seleccionados}
            cambiar={setSeleccionados} guardando={guardando} />
        )}
        {desactivando && !verificacionEstado && (
          <p role="status" className="text-sm text-slate-600">Comprobando si otras materias requieren este prerrequisito…</p>
        )}
        {desactivando && verificacionEstado?.error && (
          <ErrorConsulta mensaje={verificacionEstado.error} reintentar={() => setRevisionEstado((valor) => valor + 1)} />
        )}
        {desactivando && verificacionEstado?.datos && !Array.isArray(dependientes) && (
          <p role="status" className="text-sm text-slate-600">La API no proporcionó la información necesaria para comprobar los prerrequisitos.</p>
        )}
        {desactivando && dependientes?.length > 0 && (
          <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-bold">Esta materia sigue siendo un prerrequisito</p>
            <p className="mt-1">Materias activas que la requieren: <strong>{dependientes.join(", ")}</strong>.</p>
            <p className="mt-2">
              Busca esos códigos en el catálogo y abre <strong>Editar prerrequisitos</strong>. Si esta materia ya no es un requisito académico,
              quítala de esas listas, guarda los cambios y vuelve a intentar la desactivación. Si sigue siendo un requisito, mantenla activa.
            </p>
          </div>
        )}
        {cambiandoEstado && !desactivacionBloqueada && (
          <p className="text-sm text-slate-600">
            {desactivando
              ? "La materia dejará de estar disponible para nuevas asignaciones."
              : "La materia volverá a estar disponible para nuevas asignaciones."}
          </p>
        )}
        {error && <ErrorConsulta mensaje={error} />}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" className={boton} onClick={cancelar} disabled={guardando}>Cancelar</button>
          <button type="submit" className={principal} disabled={guardando || desactivacionBloqueada}>
            {guardando ? "Guardando…" : cambiandoEstado ? titulo : "Guardar materia"}
          </button>
        </div>
      </form>
      <dialog ref={dialogoCodigo} onClose={() => setCambioCodigo(null)}
        aria-labelledby="materia-codigo-titulo" aria-describedby="materia-codigo-aviso"
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-black/50 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><ShieldAlert size={21} aria-hidden="true" /></span>
          <div>
            <h2 id="materia-codigo-titulo" className="text-lg font-extrabold">Confirmar cambio de código</h2>
            <p id="materia-codigo-aviso" className="mt-1 text-sm text-slate-600">
              El código identifica la materia. Cambiarlo actualizará el catálogo y puede cambiar cómo aparece en los pénsum y documentos que lo consultan. Verifica el código nuevo antes de continuar.
            </p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <div><dt className="text-slate-500">Código actual</dt><dd className="mt-1 break-words font-bold">{materia?.codigoMateria}</dd></div>
          <div><dt className="text-slate-500">Código nuevo</dt><dd className="mt-1 break-words font-bold">{cambioCodigo?.codigoMateria}</dd></div>
        </dl>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={boton} onClick={() => dialogoCodigo.current.close()}>Volver a editar</button>
          <button type="button" className={principal} onClick={confirmarCambioCodigo}>Confirmar cambio</button>
        </div>
      </dialog>
    </>
  );
}

function DetalleMateria({ materia, editar }) {
  const vinculada = materia.pensums.length > 0;
  return (
    <>
      <section className={`${panel} space-y-4`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{materia.nombreMateria}</h2>
            <p className="mt-1 text-sm text-slate-500">{materia.codigoMateria} · {formatoUV.format(materia.unidadesValorativas)} UV</p>
          </div>
          <Estado activo={materia.estadoMateria} />
        </div>
        {vinculada && <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
          Esta materia se usa en un pénsum. Los cambios del catálogo pueden repercutir en esos planes y en la inscripción de estudiantes.
        </p>}
        <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
          <button type="button" className={principal} onClick={() => editar("editar")}>
            <Pencil size={16} aria-hidden="true" /> Editar datos
          </button>
          <button type="button" className={boton} onClick={() => editar("estado")}>
            <Power size={16} aria-hidden="true" /> {materia.estadoMateria ? "Inactivar materia" : "Activar materia"}
          </button>
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-extrabold text-slate-900">Prerrequisitos</h3>
            <button type="button" className={boton} onClick={() => editar("requisitos")}>
              <Pencil size={16} aria-hidden="true" /> Editar prerrequisitos
            </button>
          </div>
          {!materia.prerrequisitos.length && <p className="mt-3 text-sm text-slate-500">Esta materia no tiene prerrequisitos.</p>}
          <ul className="mt-2 divide-y divide-slate-100">
            {materia.prerrequisitos.map((requisito) => (
              <li key={requisito.idMateria} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm text-slate-700">
                <span><strong>{requisito.codigoMateria}</strong> · {requisito.nombreMateria}</span>
                <Estado activo={requisito.estadoMateria} />
              </li>
            ))}
          </ul>
        </section>
        <section className={panel}>
          <h3 className="font-extrabold text-slate-900">Pénsum que usan esta materia</h3>
          {!vinculada && <p className="mt-3 text-sm text-slate-500">Esta materia aún no está asignada a un pénsum.</p>}
          <ul className="mt-2 divide-y divide-slate-100">
            {materia.pensums.map((pensum) => (
              <li key={pensum.idPensum} className="py-3 text-sm text-slate-700">
                <p className="font-bold">{pensum.nombreCarrera}</p>
                <p className="mt-1 text-slate-500">Versión {pensum.version} · {pensum.estadoPensum}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

export default function GestionMaterias() {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(0);
  const [revision, setRevision] = useState(0);
  const [idSeleccionado, setIdSeleccionado] = useState(null);
  const [modo, setModo] = useState(null);
  const [materiaFormulario, setMateriaFormulario] = useState(null);
  const detalleAbierto = idSeleccionado !== null;
  const listado = useConsulta(!modo && !detalleAbierto ? rutaListado(busqueda.trim(), estado, pagina, 20) : null, revision, 200);
  const detalle = useConsulta(detalleAbierto && !modo ? `${API}/${idSeleccionado}` : null, revision);

  function actualizar() {
    setRevision((valor) => valor + 1);
  }

  function guardar(materia) {
    toast.success(modo === "crear" ? "Materia creada correctamente" : "Cambios guardados");
    setModo(null);
    setIdSeleccionado(materia.idMateria);
    setPagina(0);
    actualizar();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Gestión de materias</h1>
          <p className="mt-2 text-sm text-slate-500">Consulta el catálogo, sus prerrequisitos y los pénsum donde se usan.</p>
        </div>
        {!modo && !detalleAbierto && <div className="flex flex-wrap gap-3">
          <button type="button" className={principal} onClick={() => {
            setMateriaFormulario(null);
            setModo("crear");
          }}><Plus size={18} /> Nueva materia</button>
          <button type="button" className={boton} disabled={!listado} onClick={() => {
            setPagina(0);
            actualizar();
          }}>
            <RefreshCw size={16} className={!listado ? "animate-spin" : ""} /> Actualizar listado
          </button>
        </div>}
      </header>

      {modo ? (
        <FormularioMateria modo={modo} materia={materiaFormulario} cancelar={() => setModo(null)} guardar={guardar} />
      ) : detalleAbierto ? (
        <div className="space-y-4">
          <button type="button" className={boton} onClick={() => setIdSeleccionado(null)}>
            <ArrowLeft size={16} /> Volver al listado
          </button>
          {!detalle && <p role="status" className={panel}>Cargando materia…</p>}
          {detalle?.error && <ErrorConsulta mensaje={detalle.error} reintentar={actualizar} />}
          {detalle?.datos && <DetalleMateria materia={detalle.datos} editar={(accion) => {
            setMateriaFormulario(detalle.datos);
            setModo(accion);
          }} />}
        </div>
      ) : (
        <>
          <ResumenMaterias estado={estado} revision={revision} filtrar={(filtro) => {
            setEstado(filtro);
            setPagina(0);
          }} />
          <section aria-labelledby="catalogo-materias" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 id="catalogo-materias" className="text-base font-extrabold text-slate-900">Catálogo de materias</h2>
                {listado?.datos && (
                  <p aria-live="polite" className="mt-1 text-sm text-slate-500">
                    {formatoConteo.format(listado.datos.page.totalElements)} {listado.datos.page.totalElements === 1 ? "materia encontrada" : "materias encontradas"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 focus-within:border-blue-500 sm:w-80">
                <Search size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
                <input className="w-full bg-transparent text-sm outline-none"
                  aria-label="Buscar materias" placeholder="Buscar por código o nombre" value={busqueda}
                  onChange={(event) => { setBusqueda(event.target.value); setPagina(0); }} />
                {busqueda && (
                  <button type="button" aria-label="Limpiar búsqueda" className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-200"
                    onClick={() => { setBusqueda(""); setPagina(0); }}><X size={16} /></button>
                )}
              </div>
            </div>
            {!listado && <p role="status" className="p-10 text-center text-sm text-slate-500">Cargando materias…</p>}
            {listado?.error && <div className="p-5"><ErrorConsulta mensaje={listado.error} reintentar={actualizar} /></div>}
            {listado?.datos && <>
              {listado.datos.content.length === 0 && (
                <div className="p-10 text-center">
                  <BookOpen size={28} aria-hidden="true" className="mx-auto mb-3 text-slate-400" />
                  <p className="text-sm font-bold text-slate-800">No se encontraron materias</p>
                  {(busqueda || estado) && <button type="button" className="mt-2 text-sm font-semibold text-black hover:underline"
                    onClick={() => { setBusqueda(""); setEstado(""); setPagina(0); }}>Ver todas las materias</button>}
                </div>
              )}
              <ul className="divide-y divide-slate-100">
                {listado.datos.content.map((materia) => (
                  <li key={materia.idMateria}>
                    <button type="button" onClick={() => {
                      actualizar();
                      setIdSeleccionado(materia.idMateria);
                    }}
                      className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50 sm:gap-4 sm:px-5">
                      <span className="hidden shrink-0 rounded-xl bg-slate-100 p-3 text-slate-900 sm:inline-flex"><BookOpen size={20} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words font-bold text-slate-900">{materia.nombreMateria}</span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {materia.codigoMateria} · {formatoUV.format(materia.unidadesValorativas)} UV · {materia.cantidadPrerrequisitos} {materia.cantidadPrerrequisitos === 1 ? "prerrequisito" : "prerrequisitos"}
                        </span>
                      </span>
                      <Estado activo={materia.estadoMateria} />
                      <ChevronRight size={18} className="shrink-0 text-slate-400" />
                    </button>
                  </li>
                ))}
              </ul>
              {listado.datos.page.totalPages > 1 && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
                  <Paginacion pagina={pagina} total={listado.datos.page.totalPages} cambiar={setPagina} />
                </div>
              )}
            </>}
          </section>
        </>
      )}
    </div>
  );
}
