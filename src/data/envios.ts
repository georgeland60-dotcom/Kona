// =============================================================
//  DÓNDE SE ENTREGA Y CUÁNTO CUESTA
//
//  Es la tabla de la tienda, tal cual: cada destino con su precio. No
//  se calcula por distancia ni por mapa, porque el precio real no
//  depende de los kilómetros sino del acuerdo con el courier: Chosica
//  está más lejos que Ancón y cuesta lo mismo.
//
//  Para cambiar un precio se cambia aquí y queda cambiado en el
//  carrito, en el cobro y en el mensaje de WhatsApp a la vez.
// =============================================================

export type Destino = {
  nombre: string;
  precio: number;
  zona: "Lima" | "Provincia";
};

export const DESTINOS: Destino[] = [
  // ---- Lima, S/ 10 ----
  { nombre: "Surco", precio: 10, zona: "Lima" },
  { nombre: "San Borja", precio: 10, zona: "Lima" },
  { nombre: "La Molina", precio: 10, zona: "Lima" },
  { nombre: "Camacho", precio: 10, zona: "Lima" },
  { nombre: "Santa Anita", precio: 10, zona: "Lima" },
  { nombre: "Ate Vitarte", precio: 10, zona: "Lima" },
  { nombre: "San Luis", precio: 10, zona: "Lima" },
  { nombre: "San Isidro", precio: 10, zona: "Lima" },
  { nombre: "Surquillo", precio: 10, zona: "Lima" },
  { nombre: "Miraflores", precio: 10, zona: "Lima" },
  { nombre: "Barranco", precio: 10, zona: "Lima" },
  { nombre: "Jesús María", precio: 10, zona: "Lima" },
  { nombre: "Pueblo Libre", precio: 10, zona: "Lima" },
  { nombre: "San Miguel", precio: 10, zona: "Lima" },
  { nombre: "Lince", precio: 10, zona: "Lima" },
  { nombre: "La Victoria", precio: 10, zona: "Lima" },
  { nombre: "Chorrillos", precio: 10, zona: "Lima" },
  { nombre: "Lima Cercado", precio: 10, zona: "Lima" },
  { nombre: "Salamanca", precio: 10, zona: "Lima" },
  { nombre: "Magdalena", precio: 10, zona: "Lima" },

  // ---- Lima, S/ 12 ----
  { nombre: "Los Olivos", precio: 12, zona: "Lima" },
  { nombre: "San Martín de Porres", precio: 12, zona: "Lima" },
  { nombre: "San Juan de Lurigancho", precio: 12, zona: "Lima" },
  { nombre: "El Agustino", precio: 12, zona: "Lima" },
  { nombre: "Bellavista", precio: 12, zona: "Lima" },

  // ---- Lima, S/ 15 ----
  { nombre: "Rímac", precio: 15, zona: "Lima" },
  { nombre: "La Perla", precio: 15, zona: "Lima" },
  { nombre: "Puente Piedra", precio: 15, zona: "Lima" },
  { nombre: "Ate Santa Clara", precio: 15, zona: "Lima" },
  { nombre: "San Juan de Miraflores", precio: 15, zona: "Lima" },
  { nombre: "Villa El Salvador", precio: 15, zona: "Lima" },
  { nombre: "Villa María del Triunfo", precio: 15, zona: "Lima" },
  { nombre: "Comas", precio: 15, zona: "Lima" },
  { nombre: "Independencia", precio: 15, zona: "Lima" },
  { nombre: "Carabayllo", precio: 15, zona: "Lima" },
  { nombre: "Ventanilla", precio: 15, zona: "Lima" },
  { nombre: "Callao", precio: 15, zona: "Lima" },
  { nombre: "La Punta", precio: 15, zona: "Lima" },
  { nombre: "Ancón", precio: 15, zona: "Lima" },
  { nombre: "Chosica", precio: 15, zona: "Lima" },
  { nombre: "Chaclacayo", precio: 15, zona: "Lima" },
  { nombre: "Cieneguilla", precio: 15, zona: "Lima" },

  // ---- Lima, S/ 18 ----
  { nombre: "Playas de Lima", precio: 18, zona: "Lima" },

  // ---- Provincias ----
  { nombre: "Huancayo", precio: 12, zona: "Provincia" },
  { nombre: "Huánuco", precio: 12, zona: "Provincia" },
  { nombre: "Huaral", precio: 12, zona: "Provincia" },
  { nombre: "Ica", precio: 12, zona: "Provincia" },
  { nombre: "Huacho", precio: 12, zona: "Provincia" },
  { nombre: "Trujillo (La Libertad)", precio: 15, zona: "Provincia" },
  { nombre: "Áncash", precio: 15, zona: "Provincia" },
  { nombre: "Cajamarca", precio: 18, zona: "Provincia" },
  { nombre: "Chiclayo", precio: 18, zona: "Provincia" },
  { nombre: "Piura", precio: 18, zona: "Provincia" },
  { nombre: "Arequipa", precio: 18, zona: "Provincia" },
  { nombre: "Tacna", precio: 18, zona: "Provincia" },
];

// Lo que se le dice a quien vive donde no llegamos con precio cerrado.
// No se inventa una tarifa: se coordina por WhatsApp, como hoy.
export const OTRAS_ZONAS =
  "Tu zona no está en la lista: coordinamos el envío por WhatsApp.";
