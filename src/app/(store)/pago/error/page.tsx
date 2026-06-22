import Link from "next/link";

export default function PagoError() {
  return (
    <div className="max-w-md mx-auto px-4 py-28 text-center">
      <div className="text-5xl mb-6">✕</div>
      <h1 className="text-3xl font-medium mb-4">El pago no se completó</h1>
      <p className="text-muted mb-8">
        No se pudo procesar tu pago. No te preocupes, no se te cobró nada.
        Puedes intentarlo de nuevo o escribirnos por WhatsApp.
      </p>
      <Link
        href="/tienda"
        className="inline-block bg-foreground text-background px-8 py-3 rounded-full hover:bg-accent transition"
      >
        Volver a la tienda
      </Link>
    </div>
  );
}
