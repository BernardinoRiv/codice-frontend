import React, { useEffect, useMemo, useState } from "react";

// Componente independiente para impresión del nuevo pensum.
// No modifica ni importa GestionPensum.jsx.
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const numero = (valor) =>
  Number(valor ?? 0).toLocaleString("es-SV", { maximumFractionDigits: 2 });

async function consultarDetalle(id, signal) {
  if (!API_URL) throw new Error("VITE_API_URL no está configurada.");
  const respuesta = await fetch(
    `${API_URL}/api/v1/pensum/${encodeURIComponent(id)}`,
    {
      signal,
      headers: { Accept: "application/json" },
    },
  );
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok)
    throw new Error(
      datos?.mensaje ||
        datos?.message ||
        `No se pudo consultar el pensum (${respuesta.status}).`,
    );
  if (!datos?.pensum || !Array.isArray(datos?.materias))
    throw new Error("La respuesta del pensum tiene un formato inesperado.");
  return datos;
}

function MapaCurricularImpresionNuevo({ cabecera, materiasPorCiclo, detalle }) {
  const ciclos = Array.from(
    {
      length: Math.max(
        Number(detalle?.totalCiclos || 0),
        ...materiasPorCiclo.map(([c]) => Number(c)),
        0,
      ),
    },
    (_, i) => i + 1,
  );
  const porCiclo = new Map(
    materiasPorCiclo.map(([ciclo, materias]) => [Number(ciclo), materias]),
  );
  // Numeración vertical por ciclo, como en el mapa curricular institucional.
  // El orden por código es estable mientras el backend no exponga un orden oficial dentro de cada ciclo.
  const correlativos = new Map();
  let consecutivo = 0;
  const ordenadas = new Map(
    ciclos.map((ciclo) => {
      const materias = [...(porCiclo.get(ciclo) || [])].sort(
        (a, b) =>
          String(a.codigoMateria || "").localeCompare(
            String(b.codigoMateria || ""),
            "es",
            { numeric: true },
          ) || Number(a.idMateria || 0) - Number(b.idMateria || 0),
      );
      materias.forEach((materia) => {
        consecutivo += 1;
        correlativos.set(String(materia.idMateria), consecutivo);
      });
      return [ciclo, materias];
    }),
  );
  const maxMaterias = Math.max(
    1,
    ...[...ordenadas.values()].map((materias) => materias.length),
  );
  const prerrequisitoNumero = (pr) => {
    const id = pr?.idMateria ?? pr?.idMateriaRequerida;
    if (id != null && correlativos.has(String(id)))
      return String(correlativos.get(String(id)));
    // Si el DTO no proporciona el ID, se busca por código únicamente cuando es inequívoco.
    const coincidencias = [...ordenadas.values()]
      .flat()
      .filter((m) => m.codigoMateria && m.codigoMateria === pr?.codigoMateria);
    return coincidencias.length === 1
      ? String(correlativos.get(String(coincidencias[0].idMateria)))
      : "EXT";
  };
  const referenciasExternas = [...ordenadas.values()]
    .flat()
    .some((m) =>
      (m.prerrequisitos || []).some((pr) => prerrequisitoNumero(pr) === "EXT"),
    );
  return (
    <div
      className="mapa-curricular-pdf"
      aria-hidden="true"
      style={{ "--mapa-filas": maxMaterias }}
    >
      <header className="mapa-encabezado">
        <div className="mapa-institucion">UNIVERSIDAD MODULAR ABIERTA</div>
        <div className="mapa-encabezado-secundario">
          PLAN DE ESTUDIO DE LA CARRERA
        </div>
        <h2 className="mapa-carrera">{cabecera?.nombreCarrera}</h2>
        <div className="mapa-subtitulo">
          VERSIÓN {cabecera?.version} · VIGENCIA {cabecera?.anioInicio} –{" "}
          {cabecera?.anioFin ?? "SIN AÑO DE CIERRE"} · {cabecera?.estadoPensum}
        </div>
      </header>
      <main
        className="mapa-columnas"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, ciclos.length)}, minmax(0, 1fr))`,
        }}
      >
        {ciclos.map((ciclo) => {
          const materias = ordenadas.get(ciclo) || [];
          const uv = materias.reduce(
            (sum, m) => sum + Number(m.unidadesValorativas || 0),
            0,
          );
          return (
            <section className="mapa-columna" key={ciclo}>
              <div className="mapa-ciclo">CICLO {ciclo}</div>
              <div className="mapa-casillas">
                {materias.map((materia, indice) => (
                  <div
                    className="mapa-materia"
                    key={materia.idMateria ?? `${ciclo}-${indice}`}
                  >
                    <div className="mapa-materia-codigo">
                      <span
                        className="mapa-correlativo"
                        title="Número correlativo"
                      >
                        {correlativos.get(String(materia.idMateria))}
                      </span>
                      <span
                        className="mapa-codigo-texto"
                        title="Código de materia"
                      >
                        {materia.codigoMateria || "S/C"}
                      </span>
                    </div>
                    <div
                      className="mapa-materia-nombre"
                      title="Nombre de asignatura"
                    >
                      {materia.nombreMateria}
                    </div>
                    <div className="mapa-materia-pie">
                      <span title="Prerrequisitos por correlativo">
                        {materia.prerrequisitos?.length
                          ? materia.prerrequisitos
                              .map(prerrequisitoNumero)
                              .join(", ")
                          : "—"}
                      </span>
                      <strong title="Unidades valorativas">
                        {numero(materia.unidadesValorativas)} UV
                      </strong>
                    </div>
                  </div>
                ))}
                {Array.from(
                  { length: maxMaterias - materias.length },
                  (_, i) => (
                    <div className="mapa-espacio" key={i} />
                  ),
                )}
              </div>
              <div className="mapa-ciclo-total">
                {materias.length} materias · {numero(uv)} UV
              </div>
            </section>
          );
        })}
      </main>
      <footer className="mapa-pie">
        <div className="mapa-resumen">
          <span>{detalle?.totalMaterias ?? 0} ASIGNATURAS</span>
          <span>
            {numero(detalle?.totalUnidadesValorativas)} UNIDADES VALORATIVAS
          </span>
          <span>{ciclos.length} CICLOS</span>
        </div>
        <div className="mapa-nota">
          PRERREQUISITOS: NÚMEROS CORRELATIVOS DE LAS ASIGNATURAS
          {referenciasExternas
            ? " · EXT = MATERIA NO INCLUIDA EN ESTE PENSUM"
            : ""}
        </div>
      </footer>
    </div>
  );
}

export default function CrearPensumPdf({ idPensum, onVolver }) {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!idPensum) {
      setDetalle(null);
      return;
    }
    const control = new AbortController();
    setCargando(true);
    setError("");
    setDetalle(null);
    consultarDetalle(idPensum, control.signal)
      .then(setDetalle)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!control.signal.aborted) setCargando(false);
      });
    return () => control.abort();
  }, [idPensum]);

  const materiasPorCiclo = useMemo(() => {
    const grupos = new Map();
    (detalle?.materias || []).forEach((m) => {
      const ciclo = Number(m.cicloRecomendado);
      if (!grupos.has(ciclo)) grupos.set(ciclo, []);
      grupos.get(ciclo).push(m);
    });
    return [...grupos.entries()].sort(([a], [b]) => a - b);
  }, [detalle]);

  const imprimir = () => {
    if (!detalle || cargando) return;
    const documento = document.getElementById("nuevo-pensum-pdf-documento");
    const estilos = document.getElementById("estilos-crear-pensum-pdf");
    if (!documento || !estilos) return;

    // Imprimir en un documento aislado evita los estilos y overflow del layout principal.
    const marco = document.createElement("iframe");
    marco.setAttribute("aria-hidden", "true");
    marco.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(marco);
    const nombre = String(detalle.pensum.nombreCarrera || "Pensum")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_");
    const titulo = `Pensum_${nombre}_${detalle.pensum.version}`;
    const cssAislado = `
      @page { size: A4 landscape; margin: 0; }
      html, body { margin: 0 !important; padding: 0 !important; width: auto !important; height: auto !important; overflow: visible !important; background: white !important; }
      *, *::before, *::after { box-sizing: border-box; }
      body *, #nuevo-pensum-pdf-documento, #nuevo-pensum-pdf-documento * { visibility: visible !important; }
      .nuevo-pensum-pdf { padding: 0 !important; margin: 0 !important; width: auto !important; min-height: 0 !important; }
      #nuevo-pensum-pdf-documento { position: static !important; display: block !important; overflow: visible !important; width: 297mm !important; height: auto !important; padding: 0 !important; margin: 0 !important; }
      .pdf-hoja-mapa { display: block !important; width: 297mm !important; min-width: 0 !important; height: 210mm !important; padding: 5mm !important; margin: 0 !important; break-after: page !important; page-break-after: always !important; overflow: hidden !important; }
      .pdf-hoja-mapa .mapa-curricular-pdf { width: 287mm !important; height: 200mm !important; }
      .pdf-desglose { display: block !important; width: 297mm !important; height: auto !important; padding: 9mm 12mm !important; margin: 0 !important; overflow: visible !important; break-before: auto !important; page-break-before: auto !important; }
      .pdf-ciclo { break-inside: avoid !important; page-break-inside: avoid !important; }
      .pdf-firmas { display: block !important; width: 297mm !important; min-height: 190mm !important; height: auto !important; padding: 15mm 16mm !important; margin: 0 !important; break-before: page !important; page-break-before: always !important; }
      .mapa-columnas { width: 100% !important; min-width: 0 !important; }
      .mapa-columna { min-width: 0 !important; }
      .no-imprimir { display: none !important; }
    `;
    const doc = marco.contentDocument;
    doc.open();
    doc.write(
      `<!doctype html><html lang="es"><head><meta charset="UTF-8"/><title>${titulo}</title><style>${estilos.textContent}\n${cssAislado}</style></head><body><div class="nuevo-pensum-pdf">${documento.outerHTML}</div></body></html>`,
    );
    doc.close();
    let iniciado = false;
    const ejecutar = () => {
      if (iniciado) return;
      iniciado = true;
      const ventana = marco.contentWindow;
      ventana.addEventListener("afterprint", () => marco.remove(), {
        once: true,
      });
      ventana.focus();
      ventana.print();
    };
    // Esperar a que el documento aislado termine de calcular sus dimensiones.
    marco.onload = ejecutar;
    if (doc.readyState === "complete")
      requestAnimationFrame(() => requestAnimationFrame(ejecutar));
  };

  return (
    <div className="nuevo-pensum-pdf min-h-full bg-white px-4 py-6 text-black sm:px-6">
      <style id="estilos-crear-pensum-pdf">{`
        /* Vista previa del documento completo, incluido el mapa curricular. */
        .nuevo-pensum-pdf .pdf-vista-previa { overflow-x: auto; padding: 14px 0 28px; }
        .nuevo-pensum-pdf .pdf-hoja-mapa { width: 1122px; min-width: 1122px; margin: 0 auto 20px; padding: 19px; background: white; box-sizing: border-box; box-shadow: 0 2px 18px #00000018; }
        .nuevo-pensum-pdf .mapa-curricular-pdf { display: flex; flex-direction: column; box-sizing: border-box; width: 1084px; height: 756px; font-family: Arial, Helvetica, sans-serif; color: #26364a; }
        .nuevo-pensum-pdf .mapa-encabezado { flex: 0 0 auto; text-align: center; padding: 4px 0 8px; border-bottom: 1px solid #d5dee8; margin-bottom: 8px; }
        .nuevo-pensum-pdf .mapa-institucion { color: #314b66; font-size: 13px; font-weight: 800; letter-spacing: .08em; }
        .nuevo-pensum-pdf .mapa-encabezado-secundario { font-size: 10px; font-weight: 700; color: #60758d; margin-top: 5px; letter-spacing: .1em; }
        .nuevo-pensum-pdf .mapa-carrera { font-size: 14px; font-weight: 800; line-height: 1.2; margin: 5px 0 0; text-transform: uppercase; }
        .nuevo-pensum-pdf .mapa-subtitulo { font-size: 9px; color: #65758b; margin-top: 5px; text-transform: uppercase; }
        .nuevo-pensum-pdf .mapa-columnas { display: grid; flex: 1 1 auto; min-height: 0; width: 100%; gap: 3px; align-items: stretch; }
        .nuevo-pensum-pdf .mapa-columna { display: flex; flex-direction: column; min-width: 0; min-height: 0; gap: 3px; }
        .nuevo-pensum-pdf .mapa-ciclo { flex: 0 0 auto; background: #edf2f7; border: 1px solid #dce4ed; color: #3c5874; border-radius: 3px; padding: 5px 1px; font-size: 9px; text-align: center; font-weight: 800; }
        .nuevo-pensum-pdf .mapa-casillas { flex: 1 1 auto; min-height: 0; display: grid; grid-template-rows: repeat(var(--mapa-filas), minmax(0, 1fr)); gap: 3px; }
        .nuevo-pensum-pdf .mapa-materia { min-height: 0; min-width: 0; border: 1px solid #d8e0e9; border-radius: 3px; display: flex; flex-direction: column; overflow: hidden; break-inside: avoid; }
        .nuevo-pensum-pdf .mapa-materia-codigo { flex: 0 0 auto; display: flex; align-items: stretch; background: #f4f7fa; border-bottom: 1px solid #dce5ed; font-size: 9px; color: #3d5975; font-weight: 800; min-height: 22px; }
        .nuevo-pensum-pdf .mapa-correlativo { display: flex; align-items: center; justify-content: center; flex: 0 0 22px; border-right: 1px solid #dce5ed; }
        .nuevo-pensum-pdf .mapa-codigo-texto { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; text-align: center; overflow-wrap: anywhere; padding: 2px; }
        .nuevo-pensum-pdf .mapa-materia-nombre { flex: 1 1 auto; display: flex; align-items: center; justify-content: center; text-align: center; padding: 3px 2px; font-size: 10px; line-height: 1.12; font-weight: 700; overflow-wrap: anywhere; }
        .nuevo-pensum-pdf .mapa-materia-pie { flex: 0 0 auto; border-top: 1px solid #dce5ed; display: flex; align-items: stretch; font-size: 9px; color: #52677e; min-height: 25px; }
        .nuevo-pensum-pdf .mapa-materia-pie span { flex: 1; min-width: 0; display: flex; align-items: center; padding: 2px; overflow-wrap: anywhere; line-height: 1.15; }
        .nuevo-pensum-pdf .mapa-materia-pie strong { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; white-space: nowrap; border-left: 1px solid #dce5ed; padding: 2px; color: #344b65; }
        .nuevo-pensum-pdf .mapa-espacio { min-height: 0; }
        .nuevo-pensum-pdf .mapa-ciclo-total { flex: 0 0 auto; border-top: 1px solid #dce4ed; text-align: center; padding: 5px 1px; font-size: 9px; font-weight: 700; color: #5b7087; }
        .nuevo-pensum-pdf .mapa-pie { flex: 0 0 auto; margin-top: 8px; border-top: 1px solid #d5dee8; padding-top: 5px; }
        .nuevo-pensum-pdf .mapa-resumen { display: flex; justify-content: center; gap: 28px; font-size: 9px; font-weight: 800; color: #3c5874; }
        .nuevo-pensum-pdf .mapa-nota { margin-top: 4px; font-size: 8px; color: #8492a3; text-align: center; }
        .nuevo-pensum-pdf .pdf-desglose, .nuevo-pensum-pdf .pdf-firmas { width: 1122px; box-sizing: border-box; margin: 0 auto 20px; padding: 34px 45px; background: white; box-shadow: 0 2px 18px #00000018; }
        .nuevo-pensum-pdf .pdf-ciclo { break-inside: avoid; page-break-inside: avoid; }
        .nuevo-pensum-pdf .pdf-tabla { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .nuevo-pensum-pdf .pdf-tabla th, .nuevo-pensum-pdf .pdf-tabla td { border: 1px solid #333; padding: 7px; text-align: left; overflow-wrap: anywhere; vertical-align: top; }
        .nuevo-pensum-pdf .pdf-firma-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 70px 55px; margin-top: 85px; }
        .nuevo-pensum-pdf .pdf-firma { border-top: 1px solid black; padding-top: 8px; text-align: center; }
        @media screen and (max-width: 1200px) { .nuevo-pensum-pdf .pdf-vista-previa { margin-left: -16px; margin-right: -16px; } }
        @media print {
          @page { size: A4 landscape; margin: 0; }
          .nuevo-pensum-pdf .pdf-vista-previa { overflow: visible !important; padding: 0 !important; margin: 0 !important; }
          .nuevo-pensum-pdf .mapa-columnas { width: 100% !important; min-width: 0 !important; }
          .nuevo-pensum-pdf .mapa-columna { min-width: 0 !important; }
          .nuevo-pensum-pdf .pdf-hoja-mapa { width: 297mm !important; min-width: 297mm !important; height: 210mm !important; padding: 5mm !important; margin: 0 !important; box-shadow: none !important; break-after: page !important; page-break-after: always !important; }
          .nuevo-pensum-pdf .pdf-desglose, .nuevo-pensum-pdf .pdf-firmas { width: 297mm !important; margin: 0 !important; padding: 9mm 12mm !important; box-shadow: none !important; }
          html, body, #root { background: white !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
          body * { visibility: hidden !important; }
          #nuevo-pensum-pdf-documento, #nuevo-pensum-pdf-documento * { visibility: visible !important; }
          /* Un contenedor absoluto impide que Chromium pagine correctamente las secciones siguientes. */
          #nuevo-pensum-pdf-documento { position: static !important; width: 297mm !important; max-width: none !important; height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          .nuevo-pensum-pdf { padding: 0 !important; margin: 0 !important; min-height: 0 !important; }
          .nuevo-pensum-pdf .pdf-hoja-mapa { break-inside: avoid !important; page-break-inside: avoid !important; }
          .nuevo-pensum-pdf .pdf-desglose { break-before: page !important; page-break-before: always !important; height: auto !important; overflow: visible !important; }
          .nuevo-pensum-pdf .pdf-firmas { break-before: page !important; page-break-before: always !important; }
          .nuevo-pensum-pdf .no-imprimir { display: none !important; }
          #nuevo-pensum-pdf-documento .mapa-curricular-pdf {
            display: flex !important; flex-direction: column; box-sizing: border-box;
            width: 287mm; height: 200mm; margin: 0; padding: 0;
            font-family: Arial, Helvetica, sans-serif; color: #26364a;
            print-color-adjust: exact; -webkit-print-color-adjust: exact;
            break-after: auto; page-break-after: auto;
          }
        .nuevo-pensum-pdf .mapa-encabezado { flex: 0 0 auto; text-align: center; padding: 1mm 0 2mm; border-bottom: .3mm solid #d5dee8; margin-bottom: 2mm; }
        .nuevo-pensum-pdf .mapa-institucion { color: #314b66; font-size: 10pt; font-weight: 800; letter-spacing: .08em; }
        .nuevo-pensum-pdf .mapa-encabezado-secundario { font-size: 7pt; font-weight: 700; color: #60758d; margin-top: 1.5mm; letter-spacing: .1em; }
        .nuevo-pensum-pdf .mapa-carrera { font-size: 10pt; font-weight: 800; line-height: 1.2; margin: 1.5mm 0 0; text-transform: uppercase; }
        .nuevo-pensum-pdf .mapa-subtitulo { font-size: 6.5pt; color: #65758b; margin-top: 1.5mm; text-transform: uppercase; }
        .nuevo-pensum-pdf .mapa-columnas { display: grid; flex: 1 1 auto; min-height: 0; width: 100%; gap: .9mm; align-items: stretch; }
        .nuevo-pensum-pdf .mapa-columna { display: flex; flex-direction: column; min-width: 0; min-height: 0; gap: .9mm; }
        .nuevo-pensum-pdf .mapa-ciclo { flex: 0 0 auto; background: #edf2f7 !important; border: .25mm solid #dce4ed; color: #3c5874; border-radius: 1mm; padding: 1.4mm .5mm; font-size: 7pt; text-align: center; font-weight: 800; }
        .nuevo-pensum-pdf .mapa-casillas { flex: 1 1 auto; min-height: 0; display: grid; grid-template-rows: repeat(var(--mapa-filas), minmax(0, 1fr)); gap: .9mm; }
        .nuevo-pensum-pdf .mapa-materia { min-height: 0; min-width: 0; border: .25mm solid #d8e0e9; border-radius: 1mm; display: flex; flex-direction: column; overflow: hidden; break-inside: avoid; }
        .nuevo-pensum-pdf .mapa-materia-codigo { flex: 0 0 auto; display: flex; align-items: stretch; background: #f4f7fa !important; border-bottom: .2mm solid #dce5ed; font-size: 7pt; color: #3d5975; font-weight: 800; min-height: 6mm; }
        .nuevo-pensum-pdf .mapa-correlativo { display: flex; align-items: center; justify-content: center; flex: 0 0 6mm; border-right: .2mm solid #dce5ed; }
        .nuevo-pensum-pdf .mapa-codigo-texto { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; text-align: center; overflow-wrap: anywhere; padding: .5mm; }
        .nuevo-pensum-pdf .mapa-materia-nombre { flex: 1 1 auto; display: flex; align-items: center; justify-content: center; text-align: center; padding: 1mm .5mm; font-size: 8pt; line-height: 1.12; font-weight: 700; overflow-wrap: anywhere; }
        .nuevo-pensum-pdf .mapa-materia-pie { flex: 0 0 auto; border-top: .2mm solid #dce5ed; display: flex; align-items: stretch; font-size: 7pt; color: #52677e; min-height: 7mm; }
        .nuevo-pensum-pdf .mapa-materia-pie span { flex: 1; min-width: 0; display: flex; align-items: center; padding: .5mm .7mm; overflow-wrap: anywhere; line-height: 1.15; }
        .nuevo-pensum-pdf .mapa-materia-pie strong { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; white-space: nowrap; border-left: .2mm solid #dce5ed; padding: .5mm .7mm; color: #344b65; }
        .nuevo-pensum-pdf .mapa-espacio { min-height: 0; }
        .nuevo-pensum-pdf .mapa-ciclo-total { flex: 0 0 auto; border-top: .2mm solid #dce4ed; text-align: center; padding: 1.5mm .5mm; font-size: 6.7pt; font-weight: 700; color: #5b7087; }
        .nuevo-pensum-pdf .mapa-pie { flex: 0 0 auto; margin-top: 2mm; border-top: .3mm solid #d5dee8; padding-top: 1.5mm; }
        .nuevo-pensum-pdf .mapa-resumen { display: flex; justify-content: center; gap: 8mm; font-size: 7pt; font-weight: 800; color: #3c5874; }
        .nuevo-pensum-pdf .mapa-nota { margin-top: 1mm; font-size: 6pt; color: #8492a3; text-align: center; }

          .nuevo-pensum-pdf .pdf-desglose { padding: 9mm 12mm; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 9pt; }
          .nuevo-pensum-pdf .pdf-desglose h2 { font-size: 14pt; text-align: center; margin-bottom: 2mm; }
          .nuevo-pensum-pdf .pdf-desglose .subtitulo { text-align: center; margin-bottom: 6mm; }
          .nuevo-pensum-pdf .pdf-ciclo { break-inside: avoid; page-break-inside: avoid; margin-bottom: 5mm; }
          .nuevo-pensum-pdf .pdf-ciclo h3 { font-size: 10pt; font-weight: 700; margin-bottom: 2mm; }
          .nuevo-pensum-pdf .pdf-tabla { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .nuevo-pensum-pdf .pdf-tabla th, .nuevo-pensum-pdf .pdf-tabla td { border: 1px solid #333; padding: 2mm; text-align: left; overflow-wrap: anywhere; vertical-align: top; }
          .nuevo-pensum-pdf .pdf-tabla th { font-weight: 700; }
          .nuevo-pensum-pdf .pdf-firmas { break-before: page; page-break-before: always; padding: 15mm 16mm; }
          .nuevo-pensum-pdf .pdf-firma-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22mm 18mm; margin-top: 22mm; }
          .nuevo-pensum-pdf .pdf-firma { border-top: 1px solid black; padding-top: 2mm; text-align: center; }
          .nuevo-pensum-pdf .pdf-observacion { color: #b91c1c; }
        }
      `}</style>
      <div className="no-imprimir mx-auto mb-5 flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onVolver}
          className="rounded-lg border border-black bg-white px-4 py-2 text-black"
        >
          ← Volver
        </button>
        <button
          type="button"
          disabled={!detalle || cargando}
          onClick={imprimir}
          className="rounded-lg bg-black px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          Guardar como PDF
        </button>
      </div>
      {cargando && (
        <p className="no-imprimir text-center">Cargando datos del pensum...</p>
      )}
      {error && (
        <p role="alert" className="no-imprimir text-center text-red-700">
          {error}
        </p>
      )}
      {!idPensum && (
        <p className="no-imprimir text-center text-red-700">
          Primero guarda el pensum para generar su PDF.
        </p>
      )}
      {detalle && (
        <article
          id="nuevo-pensum-pdf-documento"
          className="pdf-vista-previa bg-slate-100"
        >
          <div className="pdf-hoja-mapa">
            <MapaCurricularImpresionNuevo
              cabecera={detalle.pensum}
              materiasPorCiclo={materiasPorCiclo}
              detalle={detalle}
            />
          </div>
          <section className="pdf-desglose">
            <h2 className="text-center text-xl font-bold">
              UNIVERSIDAD MODULAR ABIERTA
            </h2>
            <h2 className="text-center text-lg font-bold">
              DESGLOSE DE ASIGNATURAS Y PRERREQUISITOS
            </h2>
            <p className="subtitulo mb-6 text-center text-sm">
              {detalle.pensum.nombreCarrera} · Versión {detalle.pensum.version}{" "}
              · Vigencia {detalle.pensum.anioInicio}–{detalle.pensum.anioFin}
            </p>
            {materiasPorCiclo.map(([ciclo, materias]) => (
              <section key={ciclo} className="pdf-ciclo mb-6">
                <h3 className="mb-2 font-bold">CICLO {ciclo}</h3>
                <table className="pdf-tabla w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th
                        className="border border-black p-2"
                        style={{ width: "15%" }}
                      >
                        Código
                      </th>
                      <th
                        className="border border-black p-2"
                        style={{ width: "35%" }}
                      >
                        Materia
                      </th>
                      <th
                        className="border border-black p-2"
                        style={{ width: "8%" }}
                      >
                        UV
                      </th>
                      <th className="border border-black p-2">
                        Prerrequisitos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {materias.map((m) => (
                      <tr key={m.idMateria}>
                        <td className="border border-black p-2">
                          {m.codigoMateria}
                        </td>
                        <td className="border border-black p-2">
                          {m.nombreMateria}
                        </td>
                        <td className="border border-black p-2">
                          {numero(m.unidadesValorativas)}
                        </td>
                        <td className="border border-black p-2">
                          {m.prerrequisitos?.length
                            ? m.prerrequisitos
                                .map(
                                  (p) =>
                                    `${p.codigoMateria || "S/C"} — ${p.nombreMateria || "Sin nombre"}`,
                                )
                                .join("; ")
                            : "Ninguno"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
            <p className="mt-4 text-sm font-semibold">
              Total: {detalle.totalMaterias} materias ·{" "}
              {numero(detalle.totalUnidadesValorativas)} UV
            </p>
          </section>
          <section className="pdf-firmas mt-12 px-6 pb-12">
            <h2 className="text-center text-xl font-bold">
              OBSERVACIONES Y FIRMAS DE REVISIÓN
            </h2>
            <p className="mt-4 text-sm">
              Carrera: {detalle.pensum.nombreCarrera} · Versión:{" "}
              {detalle.pensum.version}
            </p>
            <p className="mt-5 text-sm font-bold">
              Observaciones de la junta académica:
            </p>
            <div className="mt-3 h-28 border border-black" />
            <div className="pdf-firma-grid mt-20 grid grid-cols-2 gap-x-10 gap-y-24">
              {[
                "Elaborado por",
                "Revisado por",
                "Aprobado por",
                "Fecha de aprobación",
              ].map((label) => (
                <div
                  key={label}
                  className="pdf-firma border-t border-black pt-2 text-center text-sm"
                >
                  {label}
                </div>
              ))}
            </div>
            <p className="mt-12 text-xs">
              Documento generado para revisión académica. Las firmas no
              constituyen aprobación automática en el sistema.
            </p>
          </section>
        </article>
      )}
    </div>
  );
}
