import Link from "next/link";
import { getProducts } from "@/lib/store-data";
import { getOrders, getSalesSummary } from "@/lib/orders-data";
import {
  getHistorial,
  contarPor,
  TIPOS_CAMBIO,
} from "@/lib/historial-data";
import { categories } from "@/data/categories";
import { formatPrice } from "@/lib/format";
import { isPersistent } from "@/lib/kv";
import { resumirConsumo, getConsumo } from "@/lib/consumo-data";
import { resumenModelos } from "@/lib/agent/modelos";
import { reinicioEnHoraDeLima } from "@/lib/fechas";
import { modeloPreferido } from "@/lib/agent/gemini";

// Siempre datos frescos: es una pantalla de consulta, no vale cachearla.
export const dynamic = "force-dynamic";

const nombreCategoria = (slug: string) =>
  slug === "todas"
    ? "Toda la tienda"
    : slug === "varias"
      ? "Varias categorías"
      : (categories.find((c) => c.slug === slug)?.name ?? slug);

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("es-PE", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export default async function DatosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; tipo?: string }>;
}) {
  const { categoria, tipo } = await searchParams;

  const [productos, pedidos, ventas, cambios, todos, consumo, dias, modelos] =
    await Promise.all([
      getProducts({ includeInactive: true, raw: true }),
      getOrders(),
      getSalesSummary(),
      getHistorial({ categoria, tipo, limite: 100 }),
      getHistorial(),
      resumirConsumo(),
      getConsumo(),
      resumenModelos(),
    ]);

  // El límite de Google es POR MODELO, así que el panel tiene que hablar
  // de modelos y no de un total abstracto: cuál trabaja ahora, cuánto se
  // le pidió hoy a cada uno, y cuál llegó a su tope.
  const agotadoHoy = new Map(modelos.agotados.map((a) => [a.modelo, a]));
  // Google cuenta las consultas en hora del Pacífico, así que su tope no
  // se reinicia a medianoche de Lima sino un par de horas después. Decir
  // la hora exacta evita la pregunta de "ya pasó la medianoche, ¿por qué
  // sigue topado?".
  const horaDeReinicio = reinicioEnHoraDeLima();

  type UsoModelo = {
    llamadas: number;
    tokensEntrada: number;
    tokensSalida: number;
    frenos?: number;
  };
  const usoPorModelo: Array<[string, UsoModelo]> = Object.entries(
    consumo.hoy.porModelo ?? {}
  ).sort((a, b) => b[1].llamadas - a[1].llamadas);

  const vacio: UsoModelo = { llamadas: 0, tokensEntrada: 0, tokensSalida: 0 };
  const asegurar = (modelo?: string) => {
    if (modelo && !usoPorModelo.some(([m]) => m === modelo)) {
      usoPorModelo.push([modelo, { ...vacio }]);
    }
  };
  // Que la lista nunca esté vacía: aunque hoy no se haya usado, hay que
  // poder ver CUÁL modelo va a atender y cómo está.
  for (const a of modelos.agotados) asegurar(a.modelo);
  asegurar(modelos.enUso);
  // El preferido siempre aparece: es el que se va a intentar primero en
  // el próximo mensaje, aunque hoy no se haya usado.
  asegurar(modeloPreferido());

  // Consultas del día que no tienen modelo anotado (son de antes de que
  // se empezara a registrar). Se muestran aparte para que los números
  // cuadren en vez de parecer que faltan.
  const sinDesglose =
    consumo.hoy.llamadas -
    usoPorModelo.reduce((suma, [, u]) => suma + u.llamadas, 0);

  // Cuántos cambios más caben hoy: solo se puede decir si el tope del
  // modelo en uso ya se midió alguna vez. Si no, se dice "sin medir" en
  // lugar de inventar un número.
  const enUso = modelos.enUso;
  const limiteEnUso = enUso ? modelos.limites[enUso] : undefined;
  const usoEnUso = enUso
    ? (consumo.hoy.porModelo?.[enUso] ?? { llamadas: 0, frenos: 0 })
    : undefined;
  const quedanCambios =
    limiteEnUso && usoEnUso && consumo.llamadasPorMensaje > 0
      ? Math.max(
          0,
          Math.floor(
            (limiteEnUso.consultas -
              Math.max(0, usoEnUso.llamadas - (usoEnUso.frenos ?? 0))) /
              consumo.llamadasPorMensaje
          )
        )
      : null;

  const bases = [
    {
      tipo: "productos",
      titulo: "Productos",
      dato: `${productos.length} en catálogo`,
      sub: `${productos.filter((p) => p.active !== false).length} visibles · ${productos.filter((p) => p.onSale).length} en oferta`,
    },
    {
      tipo: "pedidos",
      titulo: "Pedidos",
      dato: `${pedidos.length} registrados`,
      sub: `${ventas.pendientes} pendientes por cobrar`,
    },
    {
      tipo: "ventas",
      titulo: "Ventas",
      dato: formatPrice(ventas.ingresos),
      sub: `${ventas.ventas} ventas · ${ventas.unidades} unidades`,
    },
    {
      tipo: "cambios",
      titulo: "Cambios",
      dato: `${todos.length} registrados`,
      sub: "quién cambió qué y cuándo",
    },
  ];

  // Solo ofrecemos filtrar por lo que de verdad aparece en el historial.
  const porCategoria = contarPor(todos, "categoria");
  const porTipo = contarPor(todos, "tipo");

  const enlaceFiltro = (cambio: { categoria?: string; tipo?: string }) => {
    const p = new URLSearchParams();
    const cat = cambio.categoria ?? categoria;
    const tp = cambio.tipo ?? tipo;
    if (cat) p.set("categoria", cat);
    if (tp) p.set("tipo", tp);
    const q = p.toString();
    return q ? `/admin/datos?${q}` : "/admin/datos";
  };

  const chip = (activo: boolean) =>
    `px-3 py-1.5 rounded-full text-xs border transition ${
      activo
        ? "bg-foreground text-background border-foreground"
        : "border-line hover:border-foreground"
    }`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Datos</h1>
        <p className="text-muted text-sm">
          El estado de la tienda y el registro de todo lo que se ha cambiado.
        </p>
      </div>

      {!isPersistent() && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          <strong>Falta conectar la base de datos.</strong> Sin ella, los
          pedidos y el historial no se guardan al reiniciar el servidor.
        </div>
      )}

      {/* Bases descargables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {bases.map((b) => (
          <div
            key={b.tipo}
            className="bg-background border border-line rounded-xl p-5 flex flex-col"
          >
            <p className="text-sm font-medium">{b.titulo}</p>
            <p className="text-2xl font-semibold mt-1">{b.dato}</p>
            <p className="text-xs text-muted mt-0.5 flex-1">{b.sub}</p>
            <a
              href={`/api/admin/export?tipo=${b.tipo}`}
              className="mt-4 text-center border border-foreground px-3 py-2 rounded-lg text-xs font-medium hover:bg-foreground hover:text-background transition"
            >
              Descargar CSV
            </a>
          </div>
        ))}
      </div>

      {/* Consumo de la IA */}
      <div className="mb-10">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Consumo de la IA</h2>
          <p className="text-muted text-sm">
            No son créditos que se gastan para siempre: es un límite de
            consultas por día, POR MODELO, que se reinicia solo. Google lo
            cuenta en su horario, así que el tope vuelve a cero a las{" "}
            <strong>{horaDeReinicio}</strong> hora de Perú, no a medianoche.
            Si un modelo llega a su tope, el bot pasa solo al siguiente y
            sigue trabajando.
          </p>
        </div>

        <div className="bg-background border border-line rounded-xl p-5">
          {consumo.hoy.mensajes === 0 && consumo.diasConDatos === 0 ? (
            <p className="text-muted text-sm">
              Todavía no hay consumo registrado. Aparecerá en cuanto le pidas
              algo al bot.
            </p>
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
                <p className="text-sm">
                  Hoy: <strong>{consumo.hoy.mensajes}</strong> mensaje
                  {consumo.hoy.mensajes === 1 ? "" : "s"} ·{" "}
                  <strong>{consumo.hoy.llamadas}</strong> consulta
                  {consumo.hoy.llamadas === 1 ? "" : "s"} a la IA
                </p>
              </div>

              {/* Lo único que dice la verdad sobre la cuota. La barra de
                  arriba cuenta lo que pedimos NOSOTROS, contra un límite
                  de referencia; el cupo real lo lleva Google y depende
                  del modelo, así que puede frenarnos con la barra casi
                  vacía. Cuando eso pasa, aquí queda escrito. */}
              {consumo.hoy.ultimoFreno ? (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-medium">
                    {consumo.hoy.ultimoFreno.porDia
                      ? `Google cortó el consumo del día${
                          consumo.hoy.ultimoFreno.modelo
                            ? ` de ${consumo.hoy.ultimoFreno.modelo}`
                            : ""
                        }`
                      : "Google frenó por exceso de peticiones seguidas"}
                    {consumo.hoy.frenos && consumo.hoy.frenos > 1
                      ? ` · ${consumo.hoy.frenos} veces hoy`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs">
                    {consumo.hoy.ultimoFreno.porDia
                      ? `El tope diario lo pone Google y depende del modelo. El bot ya pasó al siguiente modelo disponible; este vuelve a estar libre a las ${horaDeReinicio} (hora de Perú). Con este corte queda medido cuántas consultas aguanta.`
                      : "Es el límite por minuto: se pasa en segundos. El bot ya espera y reintenta solo."}
                  </p>
                  {consumo.hoy.ultimoFreno.detalle && (
                    <p className="mt-1 text-xs text-amber-800/80">
                      Google dijo: {consumo.hoy.ultimoFreno.detalle}
                    </p>
                  )}
                </div>
              ) : null}

              {/* Lo que de verdad responde "¿me queda cupo?": el estado
                  de cada modelo, porque el límite es de cada uno. */}
              {usoPorModelo.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted mb-1.5">
                    Modelos de IA. El límite de consultas es de cada uno por
                    separado, y no lo publica Google: se mide el día que
                    corta, así que aparece cuando ya ha pasado al menos una
                    vez.
                  </p>
                  <div className="rounded-lg border border-line overflow-hidden">
                  {usoPorModelo.map(([nombre, uso]) => {
                    const agotado = agotadoHoy.get(nombre);
                    const enUso = modelos.enUso === nombre && !agotado;
                    // El tope real, medido: lo que aguantó el día que
                    // Google lo cortó. Si nunca cortó, no hay número que
                    // mostrar, y decirlo es mejor que inventarlo.
                    const limite = modelos.limites[nombre];
                    const atendidas = Math.max(
                      0,
                      uso.llamadas - (uso.frenos ?? 0)
                    );
                    const porcentaje = limite
                      ? Math.min(
                          100,
                          Math.round((atendidas / limite.consultas) * 100)
                        )
                      : 0;
                    return (
                      <div
                        key={nombre}
                        className="flex items-center justify-between gap-3 px-3 py-2 border-b border-line last:border-b-0 text-sm flex-wrap"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{nombre}</p>
                          <p className="text-xs text-muted">
                            {limite
                              ? `${atendidas} de ${limite.consultas} consultas`
                              : `${uso.llamadas} consulta${uso.llamadas === 1 ? "" : "s"} hoy`}
                            {uso.frenos
                              ? ` · ${uso.frenos} freno${uso.frenos === 1 ? "" : "s"}`
                              : ""}
                            {uso.tokensEntrada + uso.tokensSalida > 0
                              ? ` · ${(
                                  uso.tokensEntrada + uso.tokensSalida
                                ).toLocaleString("es-PE")} palabras`
                              : ""}
                          </p>
                          {limite ? (
                            <>
                              <div className="h-1.5 rounded-full bg-soft overflow-hidden mt-1.5 max-w-xs">
                                <div
                                  className={`h-full rounded-full ${
                                    porcentaje >= 90 ? "bg-red-500" : "bg-accent"
                                  }`}
                                  style={{ width: `${porcentaje}%` }}
                                />
                              </div>
                              <p className="text-[11px] text-muted mt-1">
                                Tope medido el {limite.fecha.slice(8)}/
                                {limite.fecha.slice(5, 7)}, el día que Google
                                cortó. Google puede cambiarlo sin avisar.
                              </p>
                            </>
                          ) : agotado ? (
                            <p className="text-[11px] text-muted mt-1">
                              Llegó al tope sin atender ninguna consulta hoy,
                              así que no se pudo medir: es probable que el
                              consumo venga de otro uso de la misma clave.
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted mt-1">
                              Tope todavía sin medir: se sabrá el día que
                              Google corte este modelo.
                            </p>
                          )}
                        </div>
                        {agotado ? (
                          <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full whitespace-nowrap">
                            Al tope · libre {horaDeReinicio}
                          </span>
                        ) : enUso ? (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full whitespace-nowrap">
                            En uso
                          </span>
                        ) : (
                          <span className="text-xs bg-soft text-muted px-2 py-1 rounded-full whitespace-nowrap">
                            {uso.llamadas > 0 ? "Usado hoy" : "Disponible"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {sinDesglose > 0 && (
                    <div className="px-3 py-2 text-xs text-muted border-t border-line">
                      {sinDesglose} consulta{sinDesglose === 1 ? "" : "s"} de hoy
                      sin modelo anotado (son anteriores a este registro).
                    </div>
                  )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted text-xs">Cada cambio cuesta</p>
                  <p className="font-medium">
                    {consumo.llamadasPorMensaje > 0
                      ? `${consumo.llamadasPorMensaje.toFixed(1)} consultas`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-xs">Te quedan hoy</p>
                  <p className="font-medium">
                    {quedanCambios === null ? "sin medir" : `~${quedanCambios} cambios`}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-xs">Palabras procesadas hoy</p>
                  <p className="font-medium">
                    {(
                      consumo.hoy.tokensEntrada + consumo.hoy.tokensSalida
                    ).toLocaleString("es-PE")}
                  </p>
                </div>
              </div>

              {dias.length > 1 && (
                <div className="mt-5 pt-4 border-t border-line">
                  <p className="text-xs text-muted mb-2">Últimos días</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    {dias.slice(0, 7).map((d) => (
                      <span key={d.fecha}>
                        <span className="text-muted">
                          {d.fecha.slice(5).replace("-", "/")}
                        </span>{" "}
                        {d.mensajes} cambio{d.mensajes === 1 ? "" : "s"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Historial */}
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Historial de cambios</h2>
          <p className="text-muted text-sm">
            Se anota cada cambio confirmado, con quién lo hizo.
          </p>
        </div>
        {(categoria || tipo) && (
          <Link
            href="/admin/datos"
            className="text-sm text-accent hover:text-accent-dark"
          >
            Quitar filtros
          </Link>
        )}
      </div>

      {todos.length > 0 && (
        <div className="space-y-3 mb-5">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted w-20">Categoría</span>
            <Link href={enlaceFiltro({ categoria: "" })} className={chip(!categoria)}>
              Todas
            </Link>
            {porCategoria.map((c) => (
              <Link
                key={c.clave}
                href={enlaceFiltro({ categoria: c.clave })}
                className={chip(categoria === c.clave)}
              >
                {nombreCategoria(c.clave)} ({c.total})
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted w-20">Tipo</span>
            <Link href={enlaceFiltro({ tipo: "" })} className={chip(!tipo)}>
              Todos
            </Link>
            {TIPOS_CAMBIO.filter((t) =>
              porTipo.some((p) => p.clave === t)
            ).map((t) => (
              <Link
                key={t}
                href={enlaceFiltro({ tipo: t })}
                className={chip(tipo === t)}
              >
                {t} ({porTipo.find((p) => p.clave === t)?.total ?? 0})
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-background border border-line rounded-xl overflow-hidden">
        {cambios.length === 0 ? (
          <p className="p-8 text-center text-muted text-sm">
            {todos.length === 0
              ? "Todavía no hay cambios registrados. Aparecerán aquí en cuanto confirmes uno desde Telegram."
              : "Ningún cambio coincide con esos filtros."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-soft/40 border-b border-line">
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Cuándo</th>
                  <th className="px-4 py-3 font-medium">Quién</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Cambio</th>
                </tr>
              </thead>
              <tbody>
                {cambios.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {fechaCorta(c.fecha)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{c.quien}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-soft px-2 py-1 rounded-full">
                        {c.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {nombreCategoria(c.categoria)}
                    </td>
                    <td className="px-4 py-3">
                      <p className={c.ok ? "" : "text-muted line-through"}>
                        {c.detalle}
                      </p>
                      {!c.ok && (
                        <p className="text-xs text-muted mt-0.5">no se aplicó</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
