// Tipos de datos de la tienda (define la "forma" de un producto y categoria)

export type Category = {
  slug: string; // identificador en la URL, ej: "vestidos"
  name: string; // nombre visible, ej: "Vestidos"
};

// Una variante = una talla concreta de un producto.
// Cada variante tiene su propio SKU (código único) y su stock.
export type Variant = {
  size: string; // talla, ej: "S", "M", "L", "Única"
  sku: string; // código único de inventario, ej: "KONA-BALI-AZUL-M"
  stock: number; // unidades disponibles de esa talla
};

// Las medidas de UNA talla de UNA prenda, en centímetros.
//
// Se guardan como pares nombre/valor y no con campos fijos porque cada
// prenda se mide distinto: una blusa por busto, largo y manga; un
// pantalón por cintura, cadera y tiro; unas botas por el largo del pie.
// Obligar a todas al mismo molde dejaría medidas vacías o inventadas.
export type MedidaTalla = {
  talla: string; // "S", "M", "38"...
  // { busto: 92, largo: 62 } o { busto: "80-100" }. El valor puede ser
  // un RANGO porque así lo publica la tienda en sus guías: la tela cede
  // y un número solo prometería una precisión que no existe.
  medidas: Record<string, number | string>;
};

// La referencia de quien sale en las fotos. Es lo que de verdad ayuda a
// decidir: "la modelo mide 1.68 y usa M" dice más que cualquier tabla.
export type ModeloFoto = {
  talla: string;
  altura?: number; // en cm
  medidas?: Record<string, number>;
};

export type Product = {
  id: string;
  slug: string; // para la URL del producto, ej: "vestido-lino-beige"
  name: string;
  price: number; // precio en soles, ej: 129
  category: string; // debe coincidir con un slug de categoria
  image?: string; // foto principal, ej: "/products/vestido.jpg"
  images?: string[]; // galería de fotos adicionales
  description?: string;
  variants: Variant[]; // tallas con su SKU y stock (fuente de verdad del inventario)
  featured?: boolean; // true = aparece en "Favoritos" del inicio
  collections?: string[]; // colecciones transversales, ej: ["nuevos-ingresos","sale"]
  onSale?: boolean; // true = aparece en seccion Sale
  oldPrice?: number; // precio anterior (tachado) si esta en oferta
  active?: boolean; // false = oculto en la tienda (borrador)
  // Guía de tallas de ESTA prenda. Cada producto tiene la suya: el mismo
  // "M" no mide igual en una blusa de gasa que en una chompa.
  guiaTallas?: MedidaTalla[];
  modeloFoto?: ModeloFoto;
};

// Formato "semilla" fácil de escribir a mano en data/products.ts.
// La capa de datos lo convierte a Product (genera SKU y stock por talla).
export type SeedProduct = Omit<Product, "variants"> & {
  sizes?: string[]; // tallas; se convierten a variants con stock inicial
  stock?: number; // stock inicial por talla (por defecto 10)
};

// ---- PEDIDOS (ventas) ------------------------------------------------

export type OrderItem = {
  productId: string;
  sku?: string; // SKU de la talla comprada (para descontar stock)
  name: string;
  size?: string;
  price: number; // precio unitario al momento de la compra
  qty: number;
};

export type OrderStatus = "pendiente" | "pagado" | "cancelado";

// Cómo se paga el pedido:
//  - mercadopago: tarjeta o Yape por la pasarela, se confirma solo.
//  - transferencia: Yape, Plin o transferencia directa a la cuenta de
//    la tienda. La clienta manda la captura por WhatsApp y la dueña lo
//    da por pagado. Es el que más usan en Perú y el que no teníamos.
//  - whatsapp: ni siquiera se eligió forma de pago, se coordina todo
//    por chat.
export type OrderMethod = "mercadopago" | "transferencia" | "whatsapp";

// Cómo se pagó un pedido que NO pasó por la pasarela. Es lo que da
// trazabilidad: sin esto, "pagado" es una palabra sin respaldo.
export type PagoManual = {
  metodo: "yape" | "plin" | "transferencia" | "efectivo" | "otro";
  // La foto del comprobante que mandó la clienta, si la hay.
  comprobante?: string;
  monto?: number;
  nota?: string;
  registradoEn: string; // ISO
  registradoPor?: string; // "telegram" o "panel"
};

export type Order = {
  id: string; // ej "PED-0001"
  createdAt: string; // fecha ISO
  items: OrderItem[];
  total: number;
  method: OrderMethod;
  status: OrderStatus;
  customer?: { name?: string; phone?: string; email?: string };
  // A dónde va y cuánto se cobró por llevarlo. Va aparte de los items
  // porque no es un producto: no tiene stock ni descuentos, y mezclarlo
  // con la mercadería descuadraba el inventario.
  // El envío del pedido. lat/lon es el punto del mapa —el que la
  // clienta confirmó o corrigió moviendo el pin—: es lo que de verdad
  // usa quien reparte, porque la dirección escrita se lee de mil formas.
  envio?: {
    destino: string;
    costo: number;
    direccion?: string;
    lat?: number;
    lon?: number;
    // Si el envío salió gratis por una promoción, cuál fue. Sin esto,
    // en el panel un envío en cero parece un error de cobro.
    promo?: string;
  };
  // true = este pedido tiene stock reservado (se reserva al crearlo).
  stockApplied?: boolean;
  // Cuándo se soltó lo reservado por llevar demasiado tiempo sin pagar.
  stockLiberado?: string;
  mpPaymentId?: string; // id del pago en Mercado Pago (si aplica)
  // El pago hecho por fuera de la pasarela (Yape, Plin, transferencia),
  // tal como lo registró la dueña.
  pago?: PagoManual;
};

// ---- PROMOCIONES (banners + descuentos) -----------------------------

// Un banner del slider principal del inicio.
export type Banner = {
  id: string;
  eyebrow: string; // texto pequeño de arriba, ej "Nueva temporada"
  title: string;
  text: string;
  cta: string; // texto del botón
  href: string; // a dónde lleva, ej "/tienda?cat=shorts"
  image: string; // ruta de la imagen, ej "/products/bb2.webp"
  active: boolean; // false = no se muestra
};

// Una regla de descuento aplicada automáticamente a la tienda.
export type DiscountScope = "all" | "category" | "product";

// "percent" = % de descuento, "fixed" = soles de rebaja,
// "precio_fijo" = deja el producto en ese precio exacto ("todos a S/ 89").
export type DiscountKind = "percent" | "fixed" | "precio_fijo";

// A QUÉ productos apunta una regla. El campo scope/target de siempre solo
// permite un producto o una categoría; en la práctica las campañas apuntan
// a listas ("estos 6 jeans") y sobre todo excluyen ("todo MENOS estos 2").
// Cuando una regla trae filtro, este manda sobre scope/target.
export type Filtro = {
  todos?: boolean; // toda la tienda
  categorias?: string[]; // slugs de categoría
  productos?: string[]; // ids de producto
  // Se descuentan de lo anterior. Un producto excluido nunca entra,
  // aunque lo incluyan las otras condiciones.
  excluirCategorias?: string[];
  excluirProductos?: string[];
};

// Qué CLASE de promoción es. Las reglas viejas no tienen este campo y se
// tratan como "simple", así que nada de lo que ya existe deja de funcionar.
//
// "carrito" es la única que NO baja el precio de un producto: descuenta
// sobre el total de la compra, y suele venir con una condición ("si llevan
// tal cosa") y un tope en soles.
export type DiscountType =
  | "simple"
  | "escalonado"
  | "bogo"
  | "carrito"
  | "envio";

// Un 2x1 y sus parientes. "Lleva 2 paga 1" es porCada:2, regala:1 y
// descuentoRegalo:100. "La 2da prenda al 50%" es lo mismo con 50.
export type BogoConfig = {
  porCada: number; // cada cuántas unidades elegibles...
  regala: number; // ...cuántas se descuentan
  descuentoRegalo: number; // % sobre la regalada; 100 = gratis
  recursivo: boolean; // si se repite en el mismo carrito (4 -> 2 gratis)
  maximoRegalos?: number; // tope de unidades regaladas por carrito
};

// Cuándo se activa un descuento de carrito. Todo lo que se indique tiene
// que cumplirse a la vez. Sin nada indicado, aplica siempre.
export type CondicionCarrito = {
  productos?: string[]; // ids: basta con que haya alguno de estos en el carrito
  categorias?: string[]; // slugs: basta con que haya algo de estas categorías
  // Unidades mínimas. Si hay productos/categorías arriba, cuenta solo esas;
  // si no, cuenta todo el carrito.
  cantidadMinima?: number;
  subtotalMinimo?: number; // soles mínimos de compra (ya con los otros descuentos)
};

// Un descuento sobre el total. El cuánto sale de kind/value de la regla
// ("percent" = % del total que aplica, "fixed" = soles fijos).
export type CarritoConfig = {
  condicion?: CondicionCarrito;
  // Tope en soles. "10% de toda la compra con un máximo de S/ 85": el tope
  // es lo que evita que una compra grande se lleve media tienda.
  maximoDescuento?: number;
};

// Envío gratis. No toca ningún precio: pone el costo del envío en cero
// cuando se cumple la condición ("desde S/ 150", "si llevan algo de
// ropa de baño"). Es la promoción más usada de una tienda online y la
// única que no se podía armar aquí.
export type EnvioConfig = {
  condicion?: CondicionCarrito;
  // Solo para ciertos destinos (nombres de la tabla de envíos). Vacío =
  // a donde sea que se entregue.
  destinos?: string[];
};

// Un tramo de un descuento por cantidad: "de 3 a 5 unidades, 10%".
export type Tramo = {
  desde: number; // cantidad mínima para entrar en este tramo
  hasta?: number; // cantidad máxima; sin tope si no se indica
  kind: DiscountKind;
  value: number;
};

export type DiscountRule = {
  id: string;
  name: string; // nombre interno, ej "Cyber 20%"
  scope: DiscountScope; // a qué aplica: toda la tienda / una categoría / un producto
  target?: string; // slug de categoría o id de producto (si scope != all)
  kind: DiscountKind; // "percent" = % de descuento, "fixed" = monto en soles
  value: number; // 20 (%) o 30 (soles)
  active: boolean;
  startsAt?: string; // fecha ISO de inicio (opcional)
  endsAt?: string; // fecha ISO de fin (opcional)
  tipo?: DiscountType; // ausente = "simple"
  tramos?: Tramo[]; // solo en las de tipo "escalonado"
  bogo?: BogoConfig; // solo en las de tipo "bogo"
  carrito?: CarritoConfig; // solo en las de tipo "carrito"
  envio?: EnvioConfig; // solo en las de tipo "envio"
  filtro?: Filtro; // si viene, manda sobre scope/target
};

// Un bloque de TEMPORADA en el inicio (ej "Verano", "Navidad"). Los
// productos entran por su etiqueta de colección: un producto pertenece a
// la temporada si su campo "collections" incluye el slug del bloque.
export type SeasonBlock = {
  id: string;
  slug: string; // etiqueta de colección, ej "verano"
  title: string; // título visible, ej "Verano 2026"
  subtitle: string;
  active: boolean; // false = no se muestra en el inicio
  limit?: number; // cuántos productos mostrar (por defecto 4)
};

// Devuelve solo las tallas (para selects, etc.)
export function productSizes(p: Product): string[] {
  return p.variants.map((v) => v.size);
}

// ¿Hay stock en esa talla?
export function sizeInStock(p: Product, size: string): boolean {
  const v = p.variants.find((x) => x.size === size);
  return !!v && v.stock > 0;
}

// Stock total sumando todas las tallas
export function totalStock(p: Product): number {
  return p.variants.reduce((sum, v) => sum + v.stock, 0);
}
