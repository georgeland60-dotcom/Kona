// =============================================================
//  LO QUE SE VENDIÓ DE VERDAD
//
//  Unidades vendidas de cada producto en konamoda.pe desde 2021 hasta
//  el cierre (contador acumulado de WooCommerce, corte 2026-11-01).
//
//  Para qué: "Los favoritos" del inicio se ordenaba por los productos
//  marcados a mano, porque la tienda nueva todavía no tiene ventas
//  propias. Con esto se ordena por lo que de verdad se vendió, que es
//  lo que hace que la primera pantalla enseñe lo que la gente compra.
//
//  Dos cosas sobre estos números, para que nadie los lea de más:
//   - Es el contador de WooCommerce de toda la vida, no la suma de los
//     pedidos que sobrevivieron (73 de los 169 ítems vendidos son de
//     productos ya borrados). Como señal de rotación es el bueno; como
//     contabilidad, no lo es.
//   - En cuanto la tienda nueva tenga ventas propias, mandan esas: esto
//     solo desempata y rellena mientras tanto.
//
//  Solo están los productos que siguen en el catálogo y que vendieron
//  algo: los demás no aportan nada al orden.
// =============================================================

export const CORTE_VENTAS = "2026-11-01";

export const VENTAS_HISTORICAS: Record<string, number> = {
  "9415": 8, // Paper bag Leti Negro
  "9414": 7, // Paper bag Leti Golden B.
  "10141": 7, // Flare Jean Ari Azul
  "9742": 6, // Slouchy Jean Cris Celeste
  "10153": 6, // Flare Jean Ari negro
  "9698": 5, // Básico Ketzy Rosa
  "9785": 5, // Slouchy Jean Cris Azul
  "9959": 5, // Cárdigan Pia Plomo
  "10181": 5, // Paper Bag Jean Lu Azul
  "10930": 5, // Vestido Dreams Rosa
  "9828": 4, // Chaleco Yess Perla
  "8508": 3, // Pantalon Dril Luna Rojo Sandia
  "9716": 3, // Básico Ketzy Beige
  "9756": 3, // Casaca Jean Love Celeste
  "11034": 3, // Palazzo Tefa Beige
  "11140": 3, // Top Princess Fuccia
  "11144": 3, // Top Princess Negro
  "11149": 3, // Top Princess Lila
  "11232": 3, // Cárdigan Ceci Rosa
  "11239": 3, // Cárdigan Ceci Beige
  "12391": 3, // Ropa de baño Bali Negra
  "8651": 2, // Blusa de Gasa Palo Rosa
  "9823": 2, // Chaleco Yess Acero
  "10054": 2, // Básico Feel Calm Beige
  "10059": 2, // Básico Feel Hope Verde
  "11136": 2, // Top Princess Verde
  "11319": 2, // Dress Pams Malva
  "11387": 2, // Sweater Gaby Negro
  "11397": 2, // Sweater Gaby Rosa
  "11435": 2, // Set Majo Negro
  "11826": 2, // Set  Luz Pistacho
  "8259": 1, // Blusas de Gasa Tie Dye
  "8501": 1, // Pantalon Dril Sami
  "8660": 1, // Cafarena Jess Ocre
  "9272": 1, // Set Lau Rosa
  "9623": 1, // Jogger Kia Lila
  "9793": 1, // Casaca Jean Love Azul
  "11145": 1, // Top Princess Beige
  "11227": 1, // Cárdigan Ceci Perla
  "11259": 1, // Butterfly Blue Bag
  "11268": 1, // Dress Pams Negro
  "11392": 1, // Sweater Gaby Plomo
  "11425": 1, // Cafarena Woolly Fucsia
  "11668": 1, // Bikini Waves Celeste
  "11831": 1, // Set Luz Naranja
  "12385": 1, // Set Luz Negro
  "12489": 1, // Shorts Holiday Fucsia
  "12625": 1, // Ropa de baño Bali azul
  "12827": 1, // Palazzo Baggy
};
