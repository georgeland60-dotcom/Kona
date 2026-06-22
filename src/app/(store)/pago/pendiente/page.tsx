import Link from "next/link";

export default function PagoPendiente() {
  return (
    <div className="max-w-md mx-auto px-4 py-28 text-center">
      <div className="text-5xl mb-6">⏳</div>
      <h1 className="text-3xl font-medium mb-4">Pago en proceso</h1>
      <p className="text-muted mb-8">
        Tu pago está siendo procesado. Te avisaremos apenas se confirme.
        Gracias por tu compra.
      </p>
      <Link
        href="/"
        className="inline-block bg-foreground text-background px-8 py-3 rounded-full hover:bg-accent transition"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
