import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass, Home } from "lucide-react";
import useSesion from "../hooks/useSesion";

export default function NotFound() {
  const sesion = useSesion();
  const { pathname } = useLocation();
  const inicio = sesion.valida ? "/dashboard/inicio" : "/";

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Compass size={30} aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Error 404
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          No encontramos esta página
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
          La dirección puede estar escrita incorrectamente o la página ya no existe.
        </p>
        <p className="mt-4 break-all rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          {pathname}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Volver
          </button>
          <Link
            to={inicio}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Home size={16} aria-hidden="true" />
            {sesion.valida ? "Ir al inicio" : "Ir al inicio de sesión"}
          </Link>
        </div>
      </section>
    </main>
  );
}