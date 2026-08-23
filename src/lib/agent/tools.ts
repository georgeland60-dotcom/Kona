// =============================================================
//  HERRAMIENTAS DEL AGENTE
//
//  Esta es la lista CERRADA de cosas que el agente puede hacer en la
//  tienda. El modelo de IA no toca la base de datos ni el código: solo
//  puede pedir una de estas acciones, con estos parámetros. Si pide
//  cualquier otra cosa (cambiar el diseño, borrar la tienda, tocar
//  código), simplemente no existe la herramienta y no pasa nada.
//
//  Hay dos familias:
//   - LECTURA  (leer: true): se ejecutan al toque, sirven para que el
//     agente sepa qué productos existen antes de proponer nada.
//   - ESCRITURA: NO se ejecutan solas. Se guardan como "plan" y solo
//     corren cuando la dueña aprieta "Confirmar" en Telegram.
// =============================================================

import {
  getProducts,
  upsertProduct,
  deleteProduct,
  nextProductId,
  skuFor,
} from "@/lib/store-data";
import {
  getRules,
  upsertRule,
  deleteRule,
  nextRuleId,
  getRuleById,
  getSeasons,
  upsertSeason,
  deleteSeason,
  nextSeasonId,
} from "@/lib/promos-data";
import { categories } from "@/data/categories";
import type { TipoCambio } from "@/lib/historial-data";
import type {
  Product,
  DiscountRule,
  DiscountKind,
  DiscountScope,
  SeasonBlock,
  Variant,
  Tramo,
} from "@/lib/types";

// ---- Tipos -----------------------------------------------------------

export type ToolArgs = Record<string, unknown>;

export type ToolResult = {
  ok: boolean;
  mensaje: string; // texto corto para el modelo y para la dueña
  datos?: unknown; // solo en herramientas de lectura
};

export type Tool = {
  nombre: string;
  leer: boolean; // true = se ejecuta al instante, no necesita confirmación
  descripcion: string; // se la damos al modelo
  parametros: Record<string, unknown>; // esquema para el modelo
  // Texto legible que se le muestra a la dueña antes de confirmar.
  resumen: (args: ToolArgs) => Promise<string>;
  ejecutar: (args: ToolArgs) => Promise<ToolResult>;
};

// ---- Utilidades ------------------------------------------------------

function texto(args: ToolArgs, clave: string, porDefecto = ""): string {
  const v = args[clave];
  return typeof v === "string" ? v.trim() : porDefecto;
}

function numero(args: ToolArgs, clave: string): number | undefined {
  const v = args[clave];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function booleano(args: ToolArgs, clave: string, porDefecto: boolean): boolean {
  const v = args[clave];
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return /^(true|si|sí|1|yes)$/i.test(v.trim());
  return porDefecto;
}

function lista(args: ToolArgs, clave: string): string[] {
  const v = args[clave];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string" && v.trim())
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

// Quita acentos y pasa a minúsculas, para comparar nombres escritos
// "a la ligera" (así "Cafarena Edy" encuentra "Cafarenas Edy Palo Rosa").
function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function slugificar(s: string): string {
  return normalizar(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Convierte una fecha suelta ("2026-08-20") a ISO. Devuelve undefined si
// no se entiende, para no inventar fechas.
function fechaISO(valor: string, finDelDia = false): string | undefined {
  if (!valor) return undefined;
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(valor);
  const d = new Date(soloFecha && finDelDia ? `${valor}T23:59:59` : valor);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// ---- Resolver un producto por id, slug o nombre ----------------------
//  La dueña habla en nombres ("sube el precio del vestido Pams"), no en
//  ids. Esto traduce ese texto a un producto concreto y, si hay varios
//  parecidos, avisa en vez de adivinar.

type Resolucion =
  | { ok: true; producto: Product }
  | { ok: false; mensaje: string };

async function resolverProducto(ref: string): Promise<Resolucion> {
  const productos = await getProducts({ includeInactive: true, raw: true });
  if (!ref) return { ok: false, mensaje: "No se indicó qué producto." };

  const clave = normalizar(ref);

  const exacto =
    productos.find((p) => p.id === ref) ??
    productos.find((p) => p.slug === ref) ??
    productos.find((p) => normalizar(p.name) === clave) ??
    productos.find((p) => normalizar(p.slug) === clave);
  if (exacto) return { ok: true, producto: exacto };

  // Coincidencia parcial: todas las palabras del texto deben aparecer.
  const palabras = clave.split(/\s+/).filter(Boolean);
  const parciales = productos.filter((p) => {
    const campo = `${normalizar(p.name)} ${normalizar(p.slug)}`;
    return palabras.every((w) => campo.includes(w));
  });

  if (parciales.length === 1) return { ok: true, producto: parciales[0] };
  if (parciales.length > 1) {
    const opciones = parciales
      .slice(0, 8)
      .map((p) => `${p.name} (id ${p.id})`)
      .join(", ");
    return {
      ok: false,
      mensaje: `Hay ${parciales.length} productos que coinciden con "${ref}": ${opciones}. Necesito saber cuál exactamente.`,
    };
  }
  return { ok: false, mensaje: `No encontré ningún producto llamado "${ref}".` };
}

// Nombre legible de un producto para los resúmenes.
async function nombreProducto(ref: string): Promise<string> {
  const r = await resolverProducto(ref);
  return r.ok ? r.producto.name : ref;
}

function soles(n: number): string {
  return `S/ ${n}`;
}

// ---- HERRAMIENTAS DE LECTURA ----------------------------------------

const buscarProductos: Tool = {
  nombre: "buscar_productos",
  leer: true,
  descripcion:
    "Busca productos del catálogo por nombre y/o categoría. Úsala SIEMPRE antes de cambiar precios, ofertas o temporadas, para saber el id exacto y el precio actual de cada producto.",
  parametros: {
    type: "OBJECT",
    properties: {
      texto: {
        type: "STRING",
        description: "Parte del nombre del producto, ej 'vestido pams'.",
      },
      categoria: {
        type: "STRING",
        description: "Slug de categoría, ej 'vestidos'. Opcional.",
      },
      solo_en_oferta: {
        type: "BOOLEAN",
        description: "true = devolver solo los productos que están en oferta.",
      },
    },
  },
  resumen: async () => "Buscar productos",
  ejecutar: async (args) => {
    const q = normalizar(texto(args, "texto"));
    const cat = texto(args, "categoria");
    const soloOferta = booleano(args, "solo_en_oferta", false);

    let productos = await getProducts({ includeInactive: true, raw: true });
    if (cat) productos = productos.filter((p) => p.category === cat);
    if (soloOferta) productos = productos.filter((p) => p.onSale);
    if (q) {
      const palabras = q.split(/\s+/).filter(Boolean);
      productos = productos.filter((p) => {
        const campo = `${normalizar(p.name)} ${normalizar(p.slug)}`;
        return palabras.every((w) => campo.includes(w));
      });
    }

    const datos = productos.slice(0, 40).map((p) => ({
      id: p.id,
      nombre: p.name,
      precio: p.price,
      precio_anterior: p.oldPrice,
      categoria: p.category,
      en_oferta: !!p.onSale,
      destacado: !!p.featured,
      visible: p.active !== false,
      colecciones: p.collections ?? [],
      stock_total: p.variants.reduce((s, v) => s + v.stock, 0),
      tallas: p.variants.map((v) => v.size),
    }));

    return {
      ok: true,
      mensaje:
        datos.length === 0
          ? "No hay productos que coincidan."
          : `${datos.length} producto(s) encontrados (de ${productos.length} en total).`,
      datos,
    };
  },
};

const listarCategorias: Tool = {
  nombre: "listar_categorias",
  leer: true,
  descripcion: "Lista las categorías disponibles de la tienda con su slug.",
  parametros: { type: "OBJECT", properties: {} },
  resumen: async () => "Listar categorías",
  ejecutar: async () => ({
    ok: true,
    mensaje: `${categories.length} categorías.`,
    datos: categories.map((c) => ({ slug: c.slug, nombre: c.name })),
  }),
};

const listarDescuentos: Tool = {
  nombre: "listar_descuentos",
  leer: true,
  descripcion:
    "Lista las reglas de descuento existentes (activas y apagadas) con su id.",
  parametros: { type: "OBJECT", properties: {} },
  resumen: async () => "Listar descuentos",
  ejecutar: async () => {
    const reglas = await getRules();
    return {
      ok: true,
      mensaje: `${reglas.length} regla(s) de descuento.`,
      datos: reglas.map((r) => ({
        id: r.id,
        nombre: r.name,
        alcance: r.scope,
        objetivo: r.target,
        tipo: r.kind,
        valor: r.value,
        activa: r.active,
        desde: r.startsAt,
        hasta: r.endsAt,
      })),
    };
  },
};

const listarTemporadas: Tool = {
  nombre: "listar_temporadas",
  leer: true,
  descripcion:
    "Lista los bloques de temporada del inicio (ej 'Verano') con su slug y si están activos.",
  parametros: { type: "OBJECT", properties: {} },
  resumen: async () => "Listar temporadas",
  ejecutar: async () => {
    const temporadas = await getSeasons();
    return {
      ok: true,
      mensaje: `${temporadas.length} temporada(s).`,
      datos: temporadas.map((t) => ({
        slug: t.slug,
        titulo: t.title,
        subtitulo: t.subtitle,
        activa: t.active,
      })),
    };
  },
};

// ---- DESCUENTOS ------------------------------------------------------

const crearDescuento: Tool = {
  nombre: "crear_descuento",
  leer: false,
  descripcion:
    "Crea una regla de descuento que se aplica sola a los precios de la tienda. Sirve para 'toda la tienda', una categoría o un producto puntual. Puede tener fecha de inicio y fin.",
  parametros: {
    type: "OBJECT",
    properties: {
      nombre: {
        type: "STRING",
        description: "Nombre corto para reconocerla, ej 'Cyber Wow 20%'.",
      },
      alcance: {
        type: "STRING",
        enum: ["all", "category", "product"],
        description:
          "'all' = toda la tienda, 'category' = una categoría, 'product' = un solo producto.",
      },
      objetivo: {
        type: "STRING",
        description:
          "Si alcance es 'category': el slug de la categoría. Si es 'product': el id o nombre del producto. Vacío si es 'all'.",
      },
      tipo: {
        type: "STRING",
        enum: ["percent", "fixed"],
        description:
          "'percent' = porcentaje de descuento, 'fixed' = rebaja fija en soles.",
      },
      valor: {
        type: "NUMBER",
        description: "20 para 20%, o 30 para S/ 30 de rebaja.",
      },
      desde: {
        type: "STRING",
        description: "Fecha de inicio AAAA-MM-DD. Opcional (vacío = ya mismo).",
      },
      hasta: {
        type: "STRING",
        description:
          "Fecha de fin AAAA-MM-DD. Opcional (vacío = sin fecha de término).",
      },
    },
    required: ["nombre", "alcance", "tipo", "valor"],
  },
  resumen: async (args) => {
    const tipo = texto(args, "tipo", "percent");
    const valor = numero(args, "valor") ?? 0;
    const monto = tipo === "percent" ? `${valor}%` : soles(valor);
    const alcance = texto(args, "alcance", "all");
    const objetivo = texto(args, "objetivo");
    let donde = "toda la tienda";
    if (alcance === "category") donde = `la categoría "${objetivo}"`;
    if (alcance === "product") donde = `"${await nombreProducto(objetivo)}"`;
    const desde = texto(args, "desde");
    const hasta = texto(args, "hasta");
    const cuando = [
      desde ? `desde ${desde}` : "",
      hasta ? `hasta ${hasta}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `Crear descuento de ${monto} en ${donde}${cuando ? ` (${cuando})` : ""}`;
  },
  ejecutar: async (args) => {
    const alcance = texto(args, "alcance", "all") as DiscountScope;
    const tipo = texto(args, "tipo", "percent") as DiscountKind;
    const valor = numero(args, "valor");

    if (valor === undefined || valor <= 0) {
      return { ok: false, mensaje: "El descuento debe ser mayor que cero." };
    }
    if (tipo === "percent" && valor >= 100) {
      return {
        ok: false,
        mensaje: "Un descuento en porcentaje debe ser menor que 100%.",
      };
    }

    let objetivo: string | undefined;
    if (alcance === "category") {
      const slug = texto(args, "objetivo");
      const cat = categories.find(
        (c) => c.slug === slug || normalizar(c.name) === normalizar(slug)
      );
      if (!cat) {
        return {
          ok: false,
          mensaje: `No existe la categoría "${slug}". Las válidas son: ${categories
            .map((c) => c.slug)
            .join(", ")}.`,
        };
      }
      objetivo = cat.slug;
    } else if (alcance === "product") {
      const r = await resolverProducto(texto(args, "objetivo"));
      if (!r.ok) return { ok: false, mensaje: r.mensaje };
      objetivo = r.producto.id;
    }

    const regla: DiscountRule = {
      id: await nextRuleId(),
      name: texto(args, "nombre", "Descuento"),
      scope: alcance,
      target: objetivo,
      kind: tipo,
      value: valor,
      active: true,
      startsAt: fechaISO(texto(args, "desde")),
      endsAt: fechaISO(texto(args, "hasta"), true),
    };

    await upsertRule(regla);
    return { ok: true, mensaje: `Descuento "${regla.name}" creado y activo.` };
  },
};

const cambiarDescuento: Tool = {
  nombre: "cambiar_descuento",
  leer: false,
  descripcion:
    "Enciende, apaga o elimina una regla de descuento que ya existe. Usa antes 'listar_descuentos' para saber el id.",
  parametros: {
    type: "OBJECT",
    properties: {
      id: { type: "STRING", description: "Id de la regla, ej 'DSC-1'." },
      accion: {
        type: "STRING",
        enum: ["activar", "desactivar", "eliminar"],
        description: "Qué hacer con la regla.",
      },
    },
    required: ["id", "accion"],
  },
  resumen: async (args) => {
    const accion = texto(args, "accion", "desactivar");
    const regla = await getRuleById(texto(args, "id"));
    const nombre = regla ? `"${regla.name}"` : texto(args, "id");
    const verbo =
      accion === "activar"
        ? "Activar"
        : accion === "eliminar"
          ? "Eliminar"
          : "Apagar";
    return `${verbo} el descuento ${nombre}`;
  },
  ejecutar: async (args) => {
    const id = texto(args, "id");
    const accion = texto(args, "accion", "desactivar");
    const regla = await getRuleById(id);
    if (!regla) return { ok: false, mensaje: `No existe el descuento "${id}".` };

    if (accion === "eliminar") {
      await deleteRule(id);
      return { ok: true, mensaje: `Descuento "${regla.name}" eliminado.` };
    }
    regla.active = accion === "activar";
    await upsertRule(regla);
    return {
      ok: true,
      mensaje: `Descuento "${regla.name}" ${regla.active ? "activado" : "apagado"}.`,
    };
  },
};


// Lee los escalones de cantidad que manda el modelo, tolerando que vengan
// con nombres en español o en inglés.
function leerTramos(args: ToolArgs): Tramo[] {
  const bruto = args["tramos"];
  if (!Array.isArray(bruto)) return [];
  const tramos: Tramo[] = [];
  for (const t of bruto) {
    if (!t || typeof t !== "object") continue;
    const o = t as Record<string, unknown>;
    const desde = Number(o.desde ?? o.from ?? o.min);
    const hastaBruto = o.hasta ?? o.to ?? o.max;
    const hasta = hastaBruto === undefined || hastaBruto === null ? undefined : Number(hastaBruto);
    const kind = String(o.tipo ?? o.kind ?? "percent") === "fixed" ? "fixed" : "percent";
    const value = Number(o.valor ?? o.value ?? 0);
    if (!Number.isFinite(desde) || !Number.isFinite(value)) continue;
    tramos.push({
      desde: Math.floor(desde),
      hasta: hasta !== undefined && Number.isFinite(hasta) ? Math.floor(hasta) : undefined,
      kind,
      value,
    });
  }
  return tramos;
}


const crearDescuentoEscalonado: Tool = {
  nombre: "crear_descuento_escalonado",
  leer: false,
  descripcion:
    "Crea un descuento POR CANTIDAD: mientras más lleve el cliente, mayor el descuento. Ej: 'lleva 3 blusas y te llevas 10%, lleva 6 y 20%'. Las cantidades se cuentan sumando todo lo que entra en el alcance: si es una categoría, cuentan todos los productos de esa categoría en el carrito, aunque sean modelos distintos.",
  parametros: {
    type: "OBJECT",
    properties: {
      nombre: {
        type: "STRING",
        description: "Nombre corto para reconocerla, ej '3x15% en blusas'.",
      },
      alcance: {
        type: "STRING",
        enum: ["all", "category", "product"],
        description:
          "'all' = toda la tienda, 'category' = una categoría, 'product' = un solo producto.",
      },
      objetivo: {
        type: "STRING",
        description:
          "Si alcance es 'category': el slug de la categoría. Si es 'product': el id o nombre. Vacío si es 'all'.",
      },
      tramos: {
        type: "ARRAY",
        description:
          "Los escalones, de menor a mayor cantidad. Cada uno indica desde cuántas unidades aplica y cuánto descuenta.",
        items: {
          type: "OBJECT",
          properties: {
            desde: {
              type: "NUMBER",
              description: "Cantidad mínima de unidades para este escalón.",
            },
            hasta: {
              type: "NUMBER",
              description: "Cantidad máxima. Omitir en el último escalón.",
            },
            tipo: {
              type: "STRING",
              enum: ["percent", "fixed"],
              description: "'percent' = porcentaje, 'fixed' = soles de rebaja.",
            },
            valor: { type: "NUMBER", description: "20 para 20%, o 30 para S/ 30." },
          },
          required: ["desde", "tipo", "valor"],
        },
      },
      desde_fecha: {
        type: "STRING",
        description: "Fecha de inicio AAAA-MM-DD. Opcional.",
      },
      hasta_fecha: {
        type: "STRING",
        description: "Fecha de fin AAAA-MM-DD. Opcional.",
      },
    },
    required: ["nombre", "alcance", "tramos"],
  },
  resumen: async (args) => {
    const tramos = leerTramos(args);
    const alcance = texto(args, "alcance", "all");
    const objetivo = texto(args, "objetivo");
    let donde = "toda la tienda";
    if (alcance === "category") donde = `la categoría "${objetivo}"`;
    if (alcance === "product") donde = `"${await nombreProducto(objetivo)}"`;
    const escalones = tramos
      .map((t) => {
        const monto = t.kind === "percent" ? `${t.value}%` : soles(t.value);
        return t.hasta
          ? `de ${t.desde} a ${t.hasta} → ${monto}`
          : `${t.desde} o más → ${monto}`;
      })
      .join("; ");
    return `Crear descuento por cantidad en ${donde} (${escalones})`;
  },
  ejecutar: async (args) => {
    const tramos = leerTramos(args);
    if (tramos.length === 0) {
      return { ok: false, mensaje: "No entendí los escalones de cantidad." };
    }

    // Un escalón con 0% o que empieza en 0 no descuenta nada y solo
    // confunde; mejor rechazarlo que crear una promo que no hace nada.
    for (const t of tramos) {
      if (t.desde < 1) {
        return { ok: false, mensaje: "Cada escalón debe empezar en 1 unidad o más." };
      }
      if (t.value <= 0) {
        return { ok: false, mensaje: "Cada escalón debe descontar algo (mayor que cero)." };
      }
      if (t.kind === "percent" && t.value >= 100) {
        return { ok: false, mensaje: "Un descuento en porcentaje debe ser menor que 100%." };
      }
      if (t.hasta !== undefined && t.hasta < t.desde) {
        return {
          ok: false,
          mensaje: `Un escalón va de ${t.desde} a ${t.hasta}, que está al revés.`,
        };
      }
    }

    const alcance = texto(args, "alcance", "all") as DiscountScope;
    let objetivo: string | undefined;
    if (alcance === "category") {
      const slug = texto(args, "objetivo");
      const cat = categories.find(
        (c) => c.slug === slug || normalizar(c.name) === normalizar(slug)
      );
      if (!cat) {
        return {
          ok: false,
          mensaje: `No existe la categoría "${slug}". Las válidas son: ${categories
            .map((c) => c.slug)
            .join(", ")}.`,
        };
      }
      objetivo = cat.slug;
    } else if (alcance === "product") {
      const r = await resolverProducto(texto(args, "objetivo"));
      if (!r.ok) return { ok: false, mensaje: r.mensaje };
      objetivo = r.producto.id;
    }

    const regla: DiscountRule = {
      id: await nextRuleId(),
      name: texto(args, "nombre", "Descuento por cantidad"),
      scope: alcance,
      target: objetivo,
      kind: "percent",
      value: 0, // no se usa en los escalonados: manda cada tramo
      active: true,
      tipo: "escalonado",
      tramos: tramos.sort((a, b) => a.desde - b.desde),
      startsAt: fechaISO(texto(args, "desde_fecha")),
      endsAt: fechaISO(texto(args, "hasta_fecha"), true),
    };

    await upsertRule(regla);
    const primero = regla.tramos![0];
    const monto =
      primero.kind === "percent" ? `${primero.value}%` : soles(primero.value);
    return {
      ok: true,
      mensaje: `Descuento por cantidad "${regla.name}" creado: desde ${primero.desde} unidades, ${monto}.`,
    };
  },
};

// ---- PRECIOS Y OFERTAS ----------------------------------------------

const cambiarPrecio: Tool = {
  nombre: "cambiar_precio",
  leer: false,
  descripcion:
    "Cambia el precio base de un producto concreto. Ojo: esto cambia el precio de lista, no crea una oferta. Para una promoción temporal es mejor 'crear_descuento'.",
  parametros: {
    type: "OBJECT",
    properties: {
      producto: {
        type: "STRING",
        description: "Id o nombre del producto.",
      },
      precio: { type: "NUMBER", description: "Nuevo precio en soles." },
      precio_anterior: {
        type: "NUMBER",
        description:
          "Precio tachado que se muestra al lado. Opcional; solo si es una oferta.",
      },
    },
    required: ["producto", "precio"],
  },
  resumen: async (args) => {
    const r = await resolverProducto(texto(args, "producto"));
    const precio = numero(args, "precio") ?? 0;
    if (!r.ok) return `Cambiar precio de "${texto(args, "producto")}" a ${soles(precio)}`;
    return `Cambiar precio de "${r.producto.name}": ${soles(r.producto.price)} → ${soles(precio)}`;
  },
  ejecutar: async (args) => {
    const r = await resolverProducto(texto(args, "producto"));
    if (!r.ok) return { ok: false, mensaje: r.mensaje };

    const precio = numero(args, "precio");
    if (precio === undefined || precio <= 0) {
      return { ok: false, mensaje: "El precio debe ser mayor que cero." };
    }

    const anterior = numero(args, "precio_anterior");
    const producto: Product = {
      ...r.producto,
      price: Math.round(precio),
      oldPrice: anterior && anterior > precio ? Math.round(anterior) : r.producto.oldPrice,
    };

    await upsertProduct(producto);
    return {
      ok: true,
      mensaje: `"${producto.name}" ahora cuesta ${soles(producto.price)} (antes ${soles(r.producto.price)}).`,
    };
  },
};

const marcarOferta: Tool = {
  nombre: "marcar_oferta",
  leer: false,
  descripcion:
    "Pone o quita la etiqueta de OFERTA de un producto, y lo mete o saca de la sección 'Sale' del inicio. Si se indica precio_oferta, además baja el precio y deja el anterior tachado.",
  parametros: {
    type: "OBJECT",
    properties: {
      producto: { type: "STRING", description: "Id o nombre del producto." },
      en_oferta: {
        type: "BOOLEAN",
        description: "true = ponerlo en oferta, false = sacarlo de oferta.",
      },
      precio_oferta: {
        type: "NUMBER",
        description:
          "Precio rebajado en soles. Opcional: si no se indica, solo se marca la etiqueta.",
      },
    },
    required: ["producto", "en_oferta"],
  },
  resumen: async (args) => {
    const r = await resolverProducto(texto(args, "producto"));
    const nombre = r.ok ? r.producto.name : texto(args, "producto");
    const activar = booleano(args, "en_oferta", true);
    const precio = numero(args, "precio_oferta");
    if (!activar) return `Sacar de oferta "${nombre}"`;
    return precio
      ? `Poner en oferta "${nombre}" a ${soles(precio)}${r.ok ? ` (antes ${soles(r.producto.price)})` : ""}`
      : `Poner en oferta "${nombre}"`;
  },
  ejecutar: async (args) => {
    const r = await resolverProducto(texto(args, "producto"));
    if (!r.ok) return { ok: false, mensaje: r.mensaje };

    const activar = booleano(args, "en_oferta", true);
    const precioOferta = numero(args, "precio_oferta");
    const base = r.producto;
    const colecciones = new Set(base.collections ?? []);

    let precio = base.price;
    let anterior = base.oldPrice;

    if (activar) {
      colecciones.add("sale");
      if (precioOferta !== undefined) {
        if (precioOferta <= 0) {
          return { ok: false, mensaje: "El precio de oferta debe ser mayor que cero." };
        }
        if (precioOferta >= base.price) {
          return {
            ok: false,
            mensaje: `El precio de oferta (${soles(precioOferta)}) debe ser menor que el actual (${soles(base.price)}).`,
          };
        }
        anterior = base.price;
        precio = Math.round(precioOferta);
      }
    } else {
      colecciones.delete("sale");
      // Al sacar de oferta devolvemos el precio de lista original.
      if (base.oldPrice && base.oldPrice > base.price) {
        precio = base.oldPrice;
      }
      anterior = undefined;
    }

    const producto: Product = {
      ...base,
      price: precio,
      oldPrice: anterior,
      onSale: activar,
      collections: [...colecciones],
    };

    await upsertProduct(producto);
    return {
      ok: true,
      mensaje: activar
        ? `"${producto.name}" en oferta a ${soles(producto.price)}.`
        : `"${producto.name}" ya no está en oferta (${soles(producto.price)}).`,
    };
  },
};

// ---- ALTA Y BAJA DE PRODUCTOS ---------------------------------------

const agregarProducto: Tool = {
  nombre: "agregar_producto",
  leer: false,
  descripcion:
    "Da de alta un producto nuevo en la tienda. La foto no se puede subir por Telegram: el producto se crea sin foto y se le agrega después desde el panel /admin.",
  parametros: {
    type: "OBJECT",
    properties: {
      nombre: { type: "STRING", description: "Nombre del producto." },
      precio: { type: "NUMBER", description: "Precio en soles." },
      categoria: {
        type: "STRING",
        description: "Slug de la categoría. Usa 'listar_categorias' si dudas.",
      },
      tallas: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "Tallas, ej ['S','M','L']. Si no hay, se usa 'Única'.",
      },
      stock: {
        type: "NUMBER",
        description: "Unidades por talla. Por defecto 10.",
      },
      descripcion: { type: "STRING", description: "Descripción del producto." },
    },
    required: ["nombre", "precio", "categoria"],
  },
  resumen: async (args) => {
    const tallas = lista(args, "tallas");
    return `Crear producto "${texto(args, "nombre")}" a ${soles(numero(args, "precio") ?? 0)} en categoría "${texto(args, "categoria")}"${tallas.length ? ` · tallas ${tallas.join("/")}` : ""}`;
  },
  ejecutar: async (args) => {
    const nombre = texto(args, "nombre");
    const precio = numero(args, "precio");
    const slugCategoria = texto(args, "categoria");

    if (!nombre) return { ok: false, mensaje: "Falta el nombre del producto." };
    if (precio === undefined || precio <= 0) {
      return { ok: false, mensaje: "El precio debe ser mayor que cero." };
    }

    const cat = categories.find(
      (c) =>
        c.slug === slugCategoria ||
        normalizar(c.name) === normalizar(slugCategoria)
    );
    if (!cat) {
      return {
        ok: false,
        mensaje: `No existe la categoría "${slugCategoria}". Las válidas son: ${categories
          .map((c) => c.slug)
          .join(", ")}.`,
      };
    }

    const slug = slugificar(nombre);
    const existentes = await getProducts({ includeInactive: true, raw: true });
    if (existentes.some((p) => p.slug === slug)) {
      return {
        ok: false,
        mensaje: `Ya existe un producto con el nombre "${nombre}". Ponle un nombre distinto o edita el que ya está.`,
      };
    }

    const tallas = lista(args, "tallas");
    const stock = Math.max(0, Math.floor(numero(args, "stock") ?? 10));
    const variants: Variant[] = (tallas.length ? tallas : ["Única"]).map(
      (size) => ({ size, sku: skuFor(slug, size), stock })
    );

    const producto: Product = {
      id: await nextProductId(),
      slug,
      name: nombre,
      price: Math.round(precio),
      category: cat.slug,
      description: texto(args, "descripcion") || undefined,
      variants,
      collections: ["nuevos-ingresos"],
      active: true,
    };

    await upsertProduct(producto);
    return {
      ok: true,
      mensaje: `Producto "${producto.name}" creado a ${soles(producto.price)} (id ${producto.id}). Recuerda subirle la foto desde /admin.`,
    };
  },
};

const quitarProducto: Tool = {
  nombre: "quitar_producto",
  leer: false,
  descripcion:
    "Saca un producto de la tienda. Por defecto solo lo OCULTA (se puede volver a mostrar y no se pierde el historial). Solo usa 'eliminar' si la dueña pide borrarlo de verdad.",
  parametros: {
    type: "OBJECT",
    properties: {
      producto: { type: "STRING", description: "Id o nombre del producto." },
      modo: {
        type: "STRING",
        enum: ["ocultar", "eliminar"],
        description:
          "'ocultar' = deja de verse pero se conserva (recomendado). 'eliminar' = se borra para siempre.",
      },
    },
    required: ["producto"],
  },
  resumen: async (args) => {
    const nombre = await nombreProducto(texto(args, "producto"));
    return texto(args, "modo", "ocultar") === "eliminar"
      ? `⚠️ ELIMINAR para siempre "${nombre}"`
      : `Ocultar de la tienda "${nombre}"`;
  },
  ejecutar: async (args) => {
    const r = await resolverProducto(texto(args, "producto"));
    if (!r.ok) return { ok: false, mensaje: r.mensaje };

    if (texto(args, "modo", "ocultar") === "eliminar") {
      await deleteProduct(r.producto.id);
      return { ok: true, mensaje: `"${r.producto.name}" eliminado de la tienda.` };
    }

    await upsertProduct({ ...r.producto, active: false });
    return {
      ok: true,
      mensaje: `"${r.producto.name}" ya no se muestra en la tienda (sigue guardado).`,
    };
  },
};

const mostrarProducto: Tool = {
  nombre: "mostrar_producto",
  leer: false,
  descripcion: "Vuelve a mostrar en la tienda un producto que estaba oculto.",
  parametros: {
    type: "OBJECT",
    properties: {
      producto: { type: "STRING", description: "Id o nombre del producto." },
    },
    required: ["producto"],
  },
  resumen: async (args) =>
    `Volver a mostrar "${await nombreProducto(texto(args, "producto"))}"`,
  ejecutar: async (args) => {
    const r = await resolverProducto(texto(args, "producto"));
    if (!r.ok) return { ok: false, mensaje: r.mensaje };
    await upsertProduct({ ...r.producto, active: true });
    return { ok: true, mensaje: `"${r.producto.name}" vuelve a estar visible.` };
  },
};

const destacarProducto: Tool = {
  nombre: "destacar_producto",
  leer: false,
  descripcion:
    "Pone o quita un producto de la sección 'Lo que amamos' (favoritos) del inicio.",
  parametros: {
    type: "OBJECT",
    properties: {
      producto: { type: "STRING", description: "Id o nombre del producto." },
      destacado: {
        type: "BOOLEAN",
        description: "true = destacarlo, false = quitarlo de destacados.",
      },
    },
    required: ["producto", "destacado"],
  },
  resumen: async (args) => {
    const nombre = await nombreProducto(texto(args, "producto"));
    return booleano(args, "destacado", true)
      ? `Destacar en el inicio "${nombre}"`
      : `Quitar de destacados "${nombre}"`;
  },
  ejecutar: async (args) => {
    const r = await resolverProducto(texto(args, "producto"));
    if (!r.ok) return { ok: false, mensaje: r.mensaje };
    const destacado = booleano(args, "destacado", true);
    await upsertProduct({ ...r.producto, featured: destacado });
    return {
      ok: true,
      mensaje: `"${r.producto.name}" ${destacado ? "destacado en el inicio" : "quitado de destacados"}.`,
    };
  },
};

const cambiarStock: Tool = {
  nombre: "cambiar_stock",
  leer: false,
  descripcion:
    "Fija las unidades disponibles de un producto. Si se indica talla, cambia solo esa; si no, cambia todas.",
  parametros: {
    type: "OBJECT",
    properties: {
      producto: { type: "STRING", description: "Id o nombre del producto." },
      cantidad: { type: "NUMBER", description: "Unidades disponibles." },
      talla: {
        type: "STRING",
        description: "Talla concreta, ej 'M'. Opcional.",
      },
    },
    required: ["producto", "cantidad"],
  },
  resumen: async (args) => {
    const nombre = await nombreProducto(texto(args, "producto"));
    const talla = texto(args, "talla");
    return `Poner stock de "${nombre}"${talla ? ` talla ${talla}` : " (todas las tallas)"} en ${numero(args, "cantidad") ?? 0}`;
  },
  ejecutar: async (args) => {
    const r = await resolverProducto(texto(args, "producto"));
    if (!r.ok) return { ok: false, mensaje: r.mensaje };

    const cantidad = numero(args, "cantidad");
    if (cantidad === undefined || cantidad < 0) {
      return { ok: false, mensaje: "La cantidad no puede ser negativa." };
    }
    const valor = Math.floor(cantidad);
    const talla = texto(args, "talla");

    if (talla) {
      const variante = r.producto.variants.find(
        (v) => normalizar(v.size) === normalizar(talla)
      );
      if (!variante) {
        return {
          ok: false,
          mensaje: `"${r.producto.name}" no tiene talla "${talla}". Tiene: ${r.producto.variants.map((v) => v.size).join(", ")}.`,
        };
      }
    }

    const variants = r.producto.variants.map((v) =>
      !talla || normalizar(v.size) === normalizar(talla)
        ? { ...v, stock: valor }
        : v
    );

    await upsertProduct({ ...r.producto, variants });
    return {
      ok: true,
      mensaje: `Stock de "${r.producto.name}"${talla ? ` talla ${talla}` : ""} actualizado a ${valor}.`,
    };
  },
};

// ---- TEMPORADAS ------------------------------------------------------

const crearTemporada: Tool = {
  nombre: "crear_temporada",
  leer: false,
  descripcion:
    "Crea (o actualiza) un bloque de temporada en el inicio, ej 'Verano 2026' o 'Navidad'. Después hay que meterle productos con 'asignar_temporada'.",
  parametros: {
    type: "OBJECT",
    properties: {
      nombre: {
        type: "STRING",
        description: "Título visible, ej 'Verano 2026'.",
      },
      subtitulo: {
        type: "STRING",
        description: "Frase corta debajo del título.",
      },
      activa: {
        type: "BOOLEAN",
        description: "true = se muestra en el inicio. Por defecto true.",
      },
    },
    required: ["nombre"],
  },
  resumen: async (args) =>
    `Crear bloque de temporada "${texto(args, "nombre")}" en el inicio`,
  ejecutar: async (args) => {
    const nombre = texto(args, "nombre");
    if (!nombre) return { ok: false, mensaje: "Falta el nombre de la temporada." };

    const slug = slugificar(nombre);
    const existentes = await getSeasons();
    const previa = existentes.find((t) => t.slug === slug);

    const temporada: SeasonBlock = {
      id: previa?.id ?? (await nextSeasonId()),
      slug,
      title: nombre,
      subtitle: texto(args, "subtitulo") || "Selección de temporada",
      active: booleano(args, "activa", true),
      limit: previa?.limit ?? 4,
    };

    await upsertSeason(temporada);
    return {
      ok: true,
      mensaje: `Temporada "${temporada.title}" lista (etiqueta: ${slug}). Ahora asígnale productos.`,
    };
  },
};

const cambiarTemporada: Tool = {
  nombre: "cambiar_temporada",
  leer: false,
  descripcion:
    "Enciende, apaga o elimina un bloque de temporada del inicio. Apagarla no borra los productos, solo esconde la sección.",
  parametros: {
    type: "OBJECT",
    properties: {
      temporada: {
        type: "STRING",
        description: "Nombre o etiqueta de la temporada, ej 'verano'.",
      },
      accion: {
        type: "STRING",
        enum: ["activar", "desactivar", "eliminar"],
      },
    },
    required: ["temporada", "accion"],
  },
  resumen: async (args) => {
    const accion = texto(args, "accion", "desactivar");
    const verbo =
      accion === "activar"
        ? "Mostrar"
        : accion === "eliminar"
          ? "Eliminar"
          : "Ocultar";
    return `${verbo} el bloque de temporada "${texto(args, "temporada")}"`;
  },
  ejecutar: async (args) => {
    const slug = slugificar(texto(args, "temporada"));
    const temporadas = await getSeasons();
    const temporada = temporadas.find(
      (t) => t.slug === slug || normalizar(t.title) === normalizar(texto(args, "temporada"))
    );
    if (!temporada) {
      return {
        ok: false,
        mensaje: `No existe la temporada "${texto(args, "temporada")}".${
          temporadas.length ? ` Hay: ${temporadas.map((t) => t.title).join(", ")}.` : ""
        }`,
      };
    }

    const accion = texto(args, "accion", "desactivar");
    if (accion === "eliminar") {
      await deleteSeason(temporada.id);
      return { ok: true, mensaje: `Temporada "${temporada.title}" eliminada del inicio.` };
    }

    temporada.active = accion === "activar";
    await upsertSeason(temporada);
    return {
      ok: true,
      mensaje: `Temporada "${temporada.title}" ${temporada.active ? "visible" : "oculta"} en el inicio.`,
    };
  },
};

const asignarTemporada: Tool = {
  nombre: "asignar_temporada",
  leer: false,
  descripcion:
    "Mete o saca productos de una temporada (o de una colección como 'nuevos-ingresos' o 'sale'). Acepta varios productos de una vez.",
  parametros: {
    type: "OBJECT",
    properties: {
      productos: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "Ids o nombres de los productos.",
      },
      temporada: {
        type: "STRING",
        description:
          "Etiqueta de la temporada o colección, ej 'verano', 'nuevos-ingresos', 'sale'.",
      },
      accion: {
        type: "STRING",
        enum: ["agregar", "quitar"],
        description: "Si se meten o se sacan de la temporada.",
      },
    },
    required: ["productos", "temporada", "accion"],
  },
  resumen: async (args) => {
    const refs = lista(args, "productos");
    const nombres = await Promise.all(refs.map((ref) => nombreProducto(ref)));
    const accion = texto(args, "accion", "agregar");
    return `${accion === "quitar" ? "Sacar de" : "Meter en"} la temporada "${texto(args, "temporada")}": ${nombres.join(", ")}`;
  },
  ejecutar: async (args) => {
    const refs = lista(args, "productos");
    if (refs.length === 0) {
      return { ok: false, mensaje: "No se indicó ningún producto." };
    }

    const etiqueta = slugificar(texto(args, "temporada"));
    if (!etiqueta) return { ok: false, mensaje: "Falta la temporada." };
    const agregar = texto(args, "accion", "agregar") !== "quitar";

    const hechos: string[] = [];
    const fallos: string[] = [];

    for (const ref of refs) {
      const r = await resolverProducto(ref);
      if (!r.ok) {
        fallos.push(r.mensaje);
        continue;
      }
      const colecciones = new Set(r.producto.collections ?? []);
      if (agregar) colecciones.add(etiqueta);
      else colecciones.delete(etiqueta);
      await upsertProduct({ ...r.producto, collections: [...colecciones] });
      hechos.push(r.producto.name);
    }

    if (hechos.length === 0) {
      return { ok: false, mensaje: fallos.join(" ") || "No se cambió nada." };
    }
    return {
      ok: true,
      mensaje:
        `${hechos.length} producto(s) ${agregar ? "agregados a" : "sacados de"} "${etiqueta}": ${hechos.join(", ")}.` +
        (fallos.length ? ` Ojo: ${fallos.join(" ")}` : ""),
    };
  },
};

// ---- Registro --------------------------------------------------------

export const HERRAMIENTAS: Tool[] = [
  // lectura
  buscarProductos,
  listarCategorias,
  listarDescuentos,
  listarTemporadas,
  // escritura
  crearDescuento,
  crearDescuentoEscalonado,
  cambiarDescuento,
  cambiarPrecio,
  marcarOferta,
  agregarProducto,
  quitarProducto,
  mostrarProducto,
  destacarProducto,
  cambiarStock,
  crearTemporada,
  cambiarTemporada,
  asignarTemporada,
];

// ---- Clasificación para el historial de cambios ---------------------

// De qué trata cada herramienta. Es una de las dos formas de filtrar el
// historial en el panel.
const TIPO_POR_HERRAMIENTA: Record<string, TipoCambio> = {
  crear_descuento: "descuentos",
  crear_descuento_escalonado: "descuentos",
  cambiar_descuento: "descuentos",
  cambiar_precio: "precios",
  marcar_oferta: "ofertas",
  agregar_producto: "productos",
  quitar_producto: "productos",
  mostrar_producto: "productos",
  destacar_producto: "productos",
  cambiar_stock: "stock",
  crear_temporada: "temporada",
  cambiar_temporada: "temporada",
  asignar_temporada: "temporada",
};

export function tipoDeCambio(nombreHerramienta: string): TipoCambio {
  const limpio = nombreHerramienta.includes(":")
    ? nombreHerramienta.split(":").pop()!
    : nombreHerramienta;
  return TIPO_POR_HERRAMIENTA[limpio] ?? "otro";
}

// Qué categoría de productos toca un cambio. Se resuelve mirando los
// argumentos: unas herramientas nombran el producto, otras la categoría, y
// las que afectan a toda la tienda devuelven "todas".
export async function categoriaAfectada(
  nombreHerramienta: string,
  args: ToolArgs
): Promise<string> {
  const limpio = nombreHerramienta.includes(":")
    ? nombreHerramienta.split(":").pop()!
    : nombreHerramienta;

  // Un descuento puede ser global, por categoría o por producto.
  if (limpio === "crear_descuento" || limpio === "crear_descuento_escalonado") {
    const alcance = texto(args, "alcance", "all");
    if (alcance === "category") {
      const slug = texto(args, "objetivo");
      const cat = categories.find(
        (c) => c.slug === slug || normalizar(c.name) === normalizar(slug)
      );
      return cat?.slug ?? slug ?? "todas";
    }
    if (alcance === "product") {
      const r = await resolverProducto(texto(args, "objetivo"));
      return r.ok ? r.producto.category : "todas";
    }
    return "todas";
  }

  // Alta de producto: la categoría viene escrita en el propio pedido.
  if (limpio === "agregar_producto") {
    const slug = texto(args, "categoria");
    const cat = categories.find(
      (c) => c.slug === slug || normalizar(c.name) === normalizar(slug)
    );
    return cat?.slug ?? slug ?? "todas";
  }

  // Varios productos a la vez: si todos son de la misma categoría la
  // usamos; si están mezclados, no hay una sola respuesta honesta.
  const varios = lista(args, "productos");
  if (varios.length > 0) {
    const cats = new Set<string>();
    for (const ref of varios) {
      const r = await resolverProducto(ref);
      if (r.ok) cats.add(r.producto.category);
    }
    if (cats.size === 1) return [...cats][0];
    if (cats.size > 1) return "varias";
    return "todas";
  }

  // Un solo producto nombrado.
  const uno = texto(args, "producto");
  if (uno) {
    const r = await resolverProducto(uno);
    if (r.ok) return r.producto.category;
  }

  return "todas";
}

export function buscarHerramienta(nombre: string): Tool | undefined {
  // El modelo a veces nombra la herramienta con un prefijo de espacio de
  // nombres ("default_api:buscar_productos"). Nos quedamos con la parte
  // final, que es la que nos importa.
  const limpio = nombre.includes(":") ? nombre.split(":").pop()! : nombre;
  return HERRAMIENTAS.find((h) => h.nombre === limpio);
}

// Declaraciones en el formato que espera el modelo de IA.
//
// Ojo con las herramientas SIN parámetros (listar_categorias y compañía):
// hay que omitir "parameters" del todo. Mandar un objeto con properties
// vacío hace que la API responda 400 y tumba toda la conversación, no solo
// esa herramienta.
export function declaracionesParaModelo() {
  return HERRAMIENTAS.map((h) => {
    const props = (h.parametros as { properties?: Record<string, unknown> })
      .properties;
    const sinParametros = !props || Object.keys(props).length === 0;
    return {
      name: h.nombre,
      description: h.descripcion,
      ...(sinParametros ? {} : { parameters: h.parametros }),
    };
  });
}
