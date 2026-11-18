export default function AvisoPagoPendiente({ pendiente, verificar }) {
  if (!pendiente) return null;
  return <div role="alert" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
    <p className="font-bold">Pago pendiente de verificación</p>
    <p className="mt-2 text-sm">No vuelvas a enviarlo todavía. Revisa el historial y el estado de cuenta con Finanzas. Referencia: {pendiente.referencia || 'Sin referencia'}.</p>
    <button type="button" onClick={verificar} className="mt-3 rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold">Ya verifiqué el resultado con Finanzas</button>
  </div>;
}
