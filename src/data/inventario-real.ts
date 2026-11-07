// =============================================================
//  EL INVENTARIO DE VERDAD
//
//  Las unidades que había de cada talla en konamoda.pe el 1 de
//  noviembre de 2026, sacadas del último backup de la tienda anterior
//  (WordPress + WooCommerce).
//
//  Por qué existe este archivo: la tienda nueva nació con 10 unidades
//  inventadas de cada talla —3.210 unidades que no existen— porque
//  cuando se importó el catálogo no había de dónde sacar el stock. Esto
//  lo reemplaza por lo que de verdad había.
//
//  Tres cosas que se decidieron al leerlo, y que explican los números:
//   - El stock vivía en la VARIACIÓN, no en el producto. El producto
//     padre tenía el stock en NULL; sumarlo de ahí habría dado cero.
//   - 72 ítems estaban marcados "agotado" con la cantidad en NULL.
//     Valen 0, no "no se sabe".
//   - Las tallas son las que EXISTÍAN de verdad. Varios productos solo
//     se habían creado en una talla (la cafarena Edy solo en S), y la
//     tienda nueva les inventó la escala entera.
//
//  La clave es el id de producto, que es el mismo que tenía en
//  WordPress. Las tallas que no aparecen aquí no se venden.
// =============================================================

export const CORTE_INVENTARIO = "2026-11-01";

export const INVENTARIO_REAL: Record<string, [string, number][]> = {
  // Pantalon Dril Killa
  "8229": [["30", 23], ["32", 9], ["34", 3]],
  // Cafarenas Edy Palo Rosa
  "8231": [["S", 1]],
  // Blusas de Gasa Tie Dye
  "8259": [["L", 2], ["M", 0], ["S", 0], ["XL", 2]],
  // Pantalon Dril Sami
  "8501": [["28", 3], ["30", 18], ["32", 15], ["34", 5]],
  // Pantalon Dril Luna Rojo Sandia
  "8508": [["30", 13], ["32", 18], ["34", 9]],
  // Pantalon Dril Yuri
  "8515": [["28", 8], ["30", 7], ["32", 0], ["34", 0]],
  // Blusa de Gasa Palo Rosa
  "8651": [["L", 1], ["M", 0], ["S", 0], ["XL", 1]],
  // Cafarena Jess Ocre
  "8660": [["L", 0], ["M", 3], ["S", 1], ["XL", 0]],
  // Cafarenas Edy Perla
  "8665": [["M", 3]],
  // Chompa Ani Negro
  "8676": [["L", 1], ["M", 1]],
  // Chompa Ani Turquesa
  "8683": [["M", 1], ["S", 0]],
  // Set Lau Rosa
  "9272": [["S", 1]],
  // Paper bag Leti Golden B.
  "9414": [["30", 4], ["32", 4], ["34", 0], ["36", 0], ["38", 0], ["40", 0]],
  // Paper bag Leti Negro
  "9415": [["30", 4], ["32", 2], ["34", 0], ["36", 0], ["38", 0], ["40", 0]],
  // Jogger Kia Lila
  "9623": [["L", 0], ["M", 0], ["S", 2], ["XL", 0]],
  // Jogger Kia Beige
  "9631": [["L", 0], ["M", 0], ["S", 1], ["XL", 0]],
  // Básico Ketzy Rosa
  "9698": [["L", 0], ["M", 0], ["S", 2], ["XL", 0]],
  // Básico Ketzy Beige
  "9716": [["L", 0], ["M", 0], ["S", 1], ["XL", 0]],
  // Slouchy Jean Cris Celeste
  "9742": [["30", 1], ["32", 4], ["34", 0], ["36", 0], ["38", 0], ["40", 0]],
  // Casaca Jean Love Celeste
  "9756": [["L", 0], ["M", 0], ["S", 1], ["XL", 0], ["XXL", 0]],
  // Slouchy Jean Cris Azul
  "9785": [["30", 0], ["32", 2], ["34", 0], ["36", 0], ["38", 0], ["40", 0]],
  // Casaca Jean Love Azul
  "9793": [["L", 0], ["M", 0], ["S", 1], ["XL", 0], ["XXL", 0]],
  // Chaleco Yess Acero
  "9823": [["L", 2], ["M", 0], ["S", 0], ["XL", 1]],
  // Chaleco Yess Perla
  "9828": [["L", 1], ["M", 0], ["S", 0], ["XL", 1]],
  // Cárdigan Pia Plomo
  "9959": [["L", 0], ["M", 0], ["S", 1], ["XL", 0]],
  // Básico Feel Calm Beige
  "10054": [["L", 3], ["M", 0], ["S", 0], ["XL", 1]],
  // Básico Feel Hope Verde
  "10059": [["L", 3], ["M", 0], ["S", 0], ["XL", 0]],
  // Flare Jean Ari Azul
  "10141": [["30", 0], ["32", 1], ["34", 0], ["36", 0], ["38", 0], ["40", 0]],
  // Flare Jean Ari negro
  "10153": [["30", 2], ["32", 1], ["34", 3], ["36", 0], ["38", 0], ["40", 0]],
  // Paper Bag Jean Lu Azul
  "10181": [["30", 3], ["32", 1], ["34", 4], ["36", 0], ["38", 0], ["40", 0]],
  // Vestido Flowers Celeste
  "10258": [["L", 1], ["M", 0], ["S", 0], ["XL", 0]],
  // Vestidos Flowers Beige
  "10263": [["L", 2], ["M", 1], ["S", 0], ["XL", 1]],
  // Cinnamon Bag Beige
  "10346": [["Única", 1]],
  // Ribbon Bag Verde
  "10361": [["Única", 0]],
  // Vestido Dreams Rosa
  "10930": [["L", 0], ["M", 2], ["S", 0], ["XL", 0]],
  // Vestido Dreams Verde
  "10935": [["L", 2], ["M", 2], ["S", 1], ["XL", 1]],
  // Palazzo Tefa Lila
  "11007": [["L", 1], ["M", 2], ["XL", 0]],
  // Palazzo Tefa Beige
  "11034": [["L", 0], ["M", 2], ["XL", 0]],
  // Heart bag Verde
  "11050": [["Única", 1]],
  // Top Princess Verde
  "11136": [["L", 0], ["M", 0], ["XL", 2]],
  // Top Princess Fuccia
  "11140": [["L", 0], ["M", 1], ["XL", 0]],
  // Top Princess Negro
  "11144": [["L", 1], ["M", 1], ["XL", 1]],
  // Top Princess Beige
  "11145": [["L", 3], ["M", 1], ["XL", 2]],
  // Top Princess Lila
  "11149": [["L", 2], ["M", 0], ["XL", 0]],
  // Cárdigan Ceci Perla
  "11227": [["L", 3], ["M", 2], ["S", 0], ["XL", 0]],
  // Cárdigan Ceci Rosa
  "11232": [["L", 0], ["M", 1], ["S", 0], ["XL", 1]],
  // Cárdigan Ceci Beige
  "11239": [["L", 2], ["M", 0], ["S", 0], ["XL", 0]],
  // Butterfly Blue Bag
  "11259": [["Única", 0]],
  // Dress Pams Negro
  "11268": [["L", 0], ["M", 2], ["S", 0], ["XL", 1]],
  // Dress Pams Verde pastel
  "11314": [["L", 2], ["M", 2], ["S", 1], ["XL", 3]],
  // Dress Pams Malva
  "11319": [["L", 0], ["M", 0], ["S", 0], ["XL", 0]],
  // Sweater Gaby Negro
  "11387": [["L", 1], ["M", 1], ["S", 1], ["XL", 3]],
  // Sweater Gaby Plomo
  "11392": [["L", 3], ["M", 0], ["S", 1], ["XL", 0]],
  // Sweater Gaby Rosa
  "11397": [["L", 0], ["M", 0], ["S", 1], ["XL", 0]],
  // Cafarena Woolly Fucsia
  "11425": [["L", 0], ["M", 0], ["S", 0], ["XL", 3]],
  // Set Majo Celeste
  "11430": [["L", 1], ["M", 0], ["S", 0], ["XL", 2]],
  // Set Majo Negro
  "11435": [["L", 0], ["M", 0], ["S", 1], ["XL", 2]],
  // Blush Stick Rubor en barra
  "11631": [["Única", 6]],
  // Lipstick Mate Hidratante Labial en barra
  "11653": [["Única", 6]],
  // Sombras en Stick en barra
  "11656": [["Única", 4]],
  // Bikini Waves Celeste
  "11668": [["L", 2], ["M", 0], ["XL", 0], ["XXL", 0]],
  // Set Arena Blanco
  "11678": [["L", 1], ["M", 1], ["XL", 1], ["XXL", 1]],
  // Set Arena Negro
  "11721": [["L", 0], ["M", 0], ["XL", 0]],
  // Strapless Waves Negro
  "11726": [["L-XL", 1], ["S-M", 1]],
  // Strapless Waves Lila
  "11731": [["L-XL", 2], ["S-M", 0]],
  // Shorts Libertad Rosa
  "11788": [["L", 2], ["M", 1], ["S", 0], ["XL", 0]],
  // Shorts Libertad Negro
  "11793": [["L", 0], ["M", 0], ["S", 0], ["XL", 0]],
  // Set  Luz Pistacho
  "11826": [["L", 1], ["M", 0], ["XL", 0], ["XXL", 1]],
  // Set Luz Naranja
  "11831": [["L", 1], ["M", 1], ["XL", 2], ["XXL", 0]],
  // Set Luz Negro
  "12385": [["L", 0], ["M", 0], ["XL", 1], ["XXL", 0]],
  // Ropa de baño Bali Negra
  "12391": [["L", 1], ["M", 0], ["XL", 1], ["XXL", 1]],
  // Ropa de baño Bali verde
  "12404": [["L", 1], ["M", 0], ["XL", 1], ["XXL", 0]],
  // Ropa de baño Bali Roja
  "12410": [["L", 1], ["M", 0], ["XL", 1], ["XXL", 0]],
  // Shorts Holiday Fucsia
  "12489": [["L", 2], ["M", 2], ["XL", 0], ["XXL", 1]],
  // Shorts Holiday Vainilla
  "12494": [["L", 2], ["M", 2], ["XL", 0], ["XXL", 2]],
  // Cárdigan Joy Rosa
  "12545": [["L", 0], ["M", 0], ["S", 0], ["XL", 0], ["XXL", 0]],
  // Cárdigan Joy Celeste
  "12564": [["L", 0], ["M", 0], ["S", 0], ["XL", 0], ["XXL", 0]],
  // Cárdigan Joy verde
  "12571": [["L", 3], ["M", 0], ["S", 0], ["XL", 1], ["XXL", 0]],
  // Shorts Holiday Moca
  "12610": [["L", 2], ["M", 1], ["XL", 2], ["XXL", 2]],
  // Ropa de baño Bali azul
  "12625": [["L", 0], ["M", 0], ["XL", 2], ["XXL", 1]],
  // Cárdigan Cloud Amarillo
  "12675": [["L", 2], ["M", 1], ["S", 1], ["XL", 1], ["XXL", 2]],
  // Cárdigan Cloud Verde
  "12683": [["L", 0], ["M", 1], ["S", 1], ["XL", 0], ["XXL", 0]],
  // Chaleco Lazos
  "12820": [["L", 2], ["M", 0], ["XL", 0], ["XXL", 2], ["XXXL", 2]],
  // Palazzo Baggy
  "12827": [["L", 1], ["M", 0], ["XL", 2], ["XXL", 2], ["XXXL", 1]],
};
