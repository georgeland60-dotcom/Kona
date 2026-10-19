import { store } from "@/config/store";

// =============================================================
//  PREGUNTAS FRECUENTES
//  Las respuestas salen de las politicas que ya estan publicadas
//  en la tienda (/politicas-de-envio y /cuidados), para que no
//  haya dos versiones distintas de lo mismo. Si cambia una
//  politica, cambia aqui tambien.
// =============================================================

export type Pregunta = {
  q: string;
  a: string;
};

export const preguntas: Pregunta[] = [
  {
    q: "¿En cuánto tiempo llega mi pedido?",
    a: "En Lima Metropolitana entregamos entre 24 y 72 horas hábiles después de confirmado el pago. A provincia enviamos por agencia de transporte y el tiempo depende de la agencia que elijas.",
  },
  {
    q: "¿Cuánto cuesta el envío?",
    a: "El costo se calcula según tu zona de entrega y lo coordinamos contigo al confirmar el pedido.",
  },
  {
    q: "¿Puedo cambiar una prenda si no me queda?",
    a: "Sí. Aceptamos cambios hasta 7 días después de la compra, siempre que la prenda esté sin uso, en perfecto estado y con su etiqueta.",
  },
  {
    q: "¿Qué tallas manejan?",
    a: "Trabajamos tallas que representan la diversidad del cuerpo de la mujer peruana. En cada prenda verás las tallas disponibles y las medidas de la modelo, para que puedas compararte con ella antes de comprar.",
  },
  {
    q: "¿Cómo cuido mis prendas para que duren?",
    a: "Lávalas a mano o en ciclo delicado con agua fría, del revés y sin lejía. No las retuerzas, sécalas a la sombra y plancha a temperatura baja.",
  },
  {
    q: "¿Cómo puedo pagar?",
    a: `Puedes pagar en la web de forma segura, o escribirnos por WhatsApp al +${store.whatsapp} si prefieres coordinar el pago con nosotras.`,
  },
];
