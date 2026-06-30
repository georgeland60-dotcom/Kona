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
export type OrderMethod = "mercadopago" | "whatsapp";

export type Order = {
  id: string; // ej "PED-0001"
  createdAt: string; // fecha ISO
  items: OrderItem[];
  total: number;
  method: OrderMethod;
  status: OrderStatus;
  customer?: { name?: string; phone?: string; email?: string };
  stockApplied?: boolean; // true = ya se descontó el stock de este pedido
  mpPaymentId?: string; // id del pago en Mercado Pago (si aplica)
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
export type DiscountKind = "percent" | "fixed";

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
