/* ============================================================
   RUMBO — datos y utilidades compartidas
   Se carga antes que el script de cada página y expone todo en
   window.RUMBO. Sin módulos ES a propósito: así el proyecto
   funciona abriendo el HTML con doble clic, sin servidor.

   Índice:
     1. Destinos y servicios
     2. Hoteles
     3. Fotografía
     4. Ilustración SVG (respaldo de la foto)
     5. Formato y búsqueda
     6. Habitaciones y cálculo de precio
     7. Almacenamiento en el navegador
     8. Reseñas por categoría
     9. Distribución de precios
    10. Mapa ilustrado
   ============================================================ */
(function (global) {
  "use strict";

  /* ---------- 1. DESTINOS Y SERVICIOS ----------
     `centro` son las coordenadas reales de cada ciudad, tomadas del
     geocodificador de OpenStreetMap. Las usa el mapa de resultados.
     Los hoteles, en cambio, son inventados: su posición se deriva de
     `mapa` (ver `coordenadas`), no corresponde a ningún edificio. */
  const DESTINOS = [
    { id:"cancun",     nombre:"Cancún",     pais:"México",          tipo:"costa", centro:{lat:21.1527,lng:-86.8426},  desde:82,  tag:"Mar sin oleaje y resorts todo incluido" },
    { id:"cusco",      nombre:"Cusco",      pais:"Perú",            tipo:"sierra", centro:{lat:-13.5171,lng:-71.9785}, desde:54,  tag:"Centro histórico caminable, poco traslado" },
    { id:"punta-cana", nombre:"Punta Cana", pais:"Rep. Dominicana", tipo:"costa", centro:{lat:18.5566,lng:-68.3692},  desde:95,  tag:"La mayor concentración de kids club" },
    { id:"orlando",    nombre:"Orlando",    pais:"Estados Unidos",  tipo:"ciudad", centro:{lat:28.5421,lng:-81.379}, desde:110, tag:"Parques temáticos a menos de 20 minutos" },
    { id:"cartagena",  nombre:"Cartagena",  pais:"Colombia",        tipo:"costa", centro:{lat:10.4266,lng:-75.5442},  desde:68,  tag:"Ciudad amurallada y playa el mismo día" },
    { id:"bariloche",  nombre:"Bariloche",  pais:"Argentina",       tipo:"lago", centro:{lat:-41.1335,lng:-71.3101},   desde:74,  tag:"Nieve en julio, lagos en enero" },
    { id:"mancora",    nombre:"Máncora",    pais:"Perú",            tipo:"costa", centro:{lat:-4.1552,lng:-81.0061},  desde:46,  tag:"Agua cálida los doce meses del año" },
    { id:"iquitos",    nombre:"Iquitos",    pais:"Perú",            tipo:"selva", centro:{lat:-3.7494,lng:-73.2444},  desde:58,  tag:"Lodges con guía y rutas cortas para niños" }
  ];

  /* Etiqueta de entorno que se muestra en la tarjeta del hotel.
     Se deriva del `tipo` del destino, no se escribe a mano en cada
     hotel: así nunca se desincronizan la ilustración y la etiqueta. */
  const ENTORNOS = {
    costa:  "Playa",
    ciudad: "Ciudad",
    sierra: "Montaña",
    lago:   "Lago",
    selva:  "Selva"
  };
  const entornoDe = function (tipo) { return ENTORNOS[tipo] || "Campo"; };

  const SERVICIOS = [
    { id:"piscina",      label:"Piscina para niños" },
    { id:"kidsclub",     label:"Kids club" },
    { id:"desayuno",     label:"Desayuno incluido" },
    { id:"cuna",         label:"Cuna sin costo" },
    { id:"todoincluido", label:"Todo incluido" },
    { id:"traslado",     label:"Traslado al aeropuerto" }
  ];

  /* ---------- 2. HOTELES ----------
     `gratisHasta` es la edad hasta la que el menor no paga cama
     supletoria, incluida. Es el dato que la mayoría de buscadores
     esconde hasta el último paso del pago.

     `patrocinado` marca el hotel que paga por posición en la lista de
     resultados. Va declarado en los datos, no escondido en la lógica
     de pintado, para que se vea de un vistazo cuál es. */
  const HOTELES = [
    { id:1, nombre:"Coral Bay Family Resort", destino:"cancun", estrellas:5, rating:4.7, resenas:2841, precio:196, foto:"h1-piscina",
      badge:"Niños hasta 12 gratis", gratisHasta:12, servicios:["piscina","kidsclub","desayuno","cuna","todoincluido","traslado"],
      descripcion:"Resort de playa con tres piscinas, una de ellas de 40 cm de profundidad con sombra permanente. El kids club abre de 9 a 21 h y admite desde los 4 años.",
      distancias:{ playa:"En primera línea, acceso directo", centro:"18 min en auto", aeropuerto:"25 min en auto" },
      fotos:["h1-piscina","h1-cuarto","h1-bano","h1-mesa","h1-vista"],
      notas:{ limpieza:4.8, ubicacion:4.9, personal:4.8, precio:4.3 },
      mapa:{ x:38, y:28 } },

    { id:2, nombre:"Hotel Laguna Azul", destino:"cancun", estrellas:4, rating:4.4, resenas:1620, precio:118, foto:"h2-piscina",
      badge:"Cancelación gratis", gratisHasta:6, servicios:["piscina","desayuno","cuna","traslado"],
      descripcion:"Hotel tranquilo frente a la laguna, a dos cuadras de la playa. Las habitaciones familiares dan a un patio interior sin paso de autos.",
      distancias:{ playa:"6 min a pie", centro:"12 min en auto", aeropuerto:"30 min en auto" },
      fotos:["h2-piscina","h2-cuarto","h2-bano","h2-mesa","h2-salon"],
      notas:{ limpieza:4.5, ubicacion:4.2, personal:4.6, precio:4.5 },
      mapa:{ x:64, y:34 } },

    { id:3, nombre:"Casona San Blas", destino:"cusco", estrellas:4, rating:4.6, resenas:1184, precio:86, foto:"h3-salon",
      badge:"Cancelación gratis", gratisHasta:8, servicios:["desayuno","cuna","traslado"],
      descripcion:"Casona colonial restaurada en el barrio de San Blas. Tiene oxígeno disponible en recepción, algo a considerar el primer día con niños pequeños.",
      distancias:{ playa:"Sin playa", centro:"7 min a pie a la Plaza de Armas", aeropuerto:"20 min en auto" },
      fotos:["h3-salon","h3-cuarto","h3-bano","h3-mesa","h3-vista"],
      notas:{ limpieza:4.7, ubicacion:4.9, personal:4.8, precio:4.2 },
      mapa:{ x:52, y:30 } },

    { id:4, nombre:"Mirador Andino Suites", destino:"cusco", estrellas:3, rating:4.2, resenas:742, precio:54, foto:"h4-vista",
      badge:null, gratisHasta:4, servicios:["desayuno","cuna"],
      descripcion:"Hostal familiar en altura con vistas al valle. La cuesta de acceso es empinada: con coche de bebé conviene subir en taxi.",
      distancias:{ playa:"Sin playa", centro:"15 min a pie cuesta abajo", aeropuerto:"25 min en auto" },
      fotos:["h4-vista","h4-cuarto","h4-bano","h4-mesa","h4-salon"],
      notas:{ limpieza:4.1, ubicacion:3.9, personal:4.5, precio:4.6 },
      mapa:{ x:30, y:42 } },

    { id:5, nombre:"Palma Real All Inclusive", destino:"punta-cana", estrellas:5, rating:4.8, resenas:3907, precio:238, foto:"h5-piscina",
      badge:"Kids club 4-12 años", gratisHasta:12, patrocinado:true, servicios:["piscina","kidsclub","desayuno","cuna","todoincluido","traslado"],
      descripcion:"Todo incluido con parque acuático propio y seis restaurantes, cuatro de ellos sin reserva previa. Menú infantil disponible todo el día.",
      distancias:{ playa:"En primera línea, acceso directo", centro:"25 min en auto", aeropuerto:"20 min en auto" },
      fotos:["h5-piscina","h5-cuarto","h5-bano","h5-mesa","h5-vista"],
      notas:{ limpieza:4.9, ubicacion:4.7, personal:4.9, precio:4.5 },
      mapa:{ x:58, y:26 } },

    { id:6, nombre:"Arena Blanca Beach Club", destino:"punta-cana", estrellas:4, rating:4.3, resenas:1455, precio:142, foto:"h6-piscina",
      badge:null, gratisHasta:6, servicios:["piscina","kidsclub","todoincluido"],
      descripcion:"Todo incluido más contenido, con piscina central y club infantil por la mañana. No tiene cunas, hay que llevarla o alquilarla aparte.",
      distancias:{ playa:"3 min a pie", centro:"22 min en auto", aeropuerto:"25 min en auto" },
      fotos:["h6-piscina","h6-cuarto","h6-bano","h6-mesa","h6-vista"],
      notas:{ limpieza:4.2, ubicacion:4.6, personal:4.3, precio:4.4 },
      mapa:{ x:34, y:32 } },

    { id:7, nombre:"Sunset Parks Hotel", destino:"orlando", estrellas:4, rating:4.5, resenas:5210, precio:164, foto:"h7-piscina",
      badge:"Traslado a parques", gratisHasta:10, servicios:["piscina","desayuno","cuna","traslado"],
      descripcion:"Pensado para visitar parques: hay traslado gratuito cada 30 minutos desde las 7 h y desayuno servido desde las 6:30.",
      distancias:{ playa:"Sin playa", centro:"14 min en auto a los parques", aeropuerto:"22 min en auto" },
      fotos:["h7-piscina","h7-cuarto","h7-bano","h7-mesa","h7-salon"],
      notas:{ limpieza:4.6, ubicacion:4.7, personal:4.4, precio:4.3 },
      mapa:{ x:62, y:38 } },

    { id:8, nombre:"Orange Grove Suites", destino:"orlando", estrellas:3, rating:4.1, resenas:2098, precio:110, foto:"h8-piscina",
      badge:null, gratisHasta:6, servicios:["piscina","desayuno"],
      descripcion:"Suites con cocina pequeña y lavadora, útil en estancias largas con niños. El traslado a los parques es de pago y hay que reservarlo el día antes.",
      distancias:{ playa:"Sin playa", centro:"20 min en auto a los parques", aeropuerto:"28 min en auto" },
      fotos:["h8-piscina","h8-cuarto","h8-bano","h8-mesa","h8-salon"],
      notas:{ limpieza:4.0, ubicacion:4.2, personal:4.1, precio:4.4 },
      mapa:{ x:30, y:50 } },

    { id:9, nombre:"Casa Amurallada", destino:"cartagena", estrellas:5, rating:4.6, resenas:1330, precio:174, foto:"h9-salon",
      badge:"Cancelación gratis", gratisHasta:8, servicios:["piscina","desayuno","cuna","traslado"],
      descripcion:"Hotel boutique dentro de la ciudad amurallada, con piscina en la azotea. Las calles del casco son empedradas y el coche de bebé sufre.",
      distancias:{ playa:"12 min en auto a Bocagrande", centro:"Dentro del casco histórico", aeropuerto:"15 min en auto" },
      fotos:["h9-salon","h9-cuarto","h9-bano","h9-mesa","h9-vista"],
      notas:{ limpieza:4.8, ubicacion:4.9, personal:4.7, precio:4.1 },
      mapa:{ x:72, y:40 } },

    { id:10, nombre:"Bocagrande Family Inn", destino:"cartagena", estrellas:3, rating:4.0, resenas:688, precio:68, foto:"h10-piscina",
      badge:null, gratisHasta:4, servicios:["piscina","desayuno"],
      descripcion:"Hotel sencillo en Bocagrande, a una cuadra del mar. Habitaciones amplias para el precio, aunque la zona tiene vida nocturna y algo de ruido.",
      distancias:{ playa:"2 min a pie", centro:"10 min en auto al casco", aeropuerto:"12 min en auto" },
      fotos:["h10-piscina","h10-cuarto","h10-bano","h10-mesa","h10-vista"],
      notas:{ limpieza:3.8, ubicacion:4.5, personal:4.0, precio:4.3 },
      mapa:{ x:40, y:26 } },

    { id:11, nombre:"Lodge Nahuel Huapi", destino:"bariloche", estrellas:4, rating:4.5, resenas:1176, precio:128, foto:"h11-vista",
      badge:"Niños hasta 10 gratis", gratisHasta:10, servicios:["piscina","desayuno","cuna","traslado"],
      descripcion:"Lodge de montaña sobre el lago, con piscina climatizada cubierta. En temporada de nieve hay alquiler de equipo infantil en el mismo hotel.",
      distancias:{ playa:"Playa de lago a 4 min a pie", centro:"12 min en auto", aeropuerto:"20 min en auto" },
      fotos:["h11-vista","h11-cuarto","h11-bano","h11-mesa","h11-salon"],
      notas:{ limpieza:4.6, ubicacion:4.8, personal:4.5, precio:4.1 },
      mapa:{ x:44, y:28 } },

    { id:12, nombre:"Refugio del Lago", destino:"bariloche", estrellas:3, rating:4.2, resenas:521, precio:74, foto:"h12-vista",
      badge:null, gratisHasta:6, servicios:["desayuno","cuna"],
      descripcion:"Cabañas de madera a orillas del lago, con cocina equipada. No hay restaurante: hay que bajar al centro o cocinar.",
      distancias:{ playa:"Playa de lago a 1 min a pie", centro:"18 min en auto", aeropuerto:"30 min en auto" },
      fotos:["h12-vista","h12-cuarto","h12-bano","h12-mesa","h12-salon"],
      notas:{ limpieza:4.1, ubicacion:4.7, personal:4.0, precio:4.4 },
      mapa:{ x:26, y:20 } },

    { id:13, nombre:"Vichayito Beach Bungalows", destino:"mancora", estrellas:4, rating:4.6, resenas:934, precio:96, foto:"h13-vista",
      badge:"Cancelación gratis", gratisHasta:8, servicios:["piscina","desayuno","cuna"],
      descripcion:"Bungalós separados frente al mar, con piscina sin bordillo y poca profundidad. La playa no tiene socorrista, conviene saberlo.",
      distancias:{ playa:"En primera línea, acceso directo", centro:"15 min en auto a Máncora", aeropuerto:"1 h 10 min a Talara" },
      fotos:["h13-vista","h13-cuarto","h13-bano","h13-mesa","h13-piscina"],
      notas:{ limpieza:4.7, ubicacion:4.8, personal:4.6, precio:4.4 },
      mapa:{ x:46, y:24 } },

    { id:14, nombre:"Hostal Punta Sal", destino:"mancora", estrellas:3, rating:3.9, resenas:410, precio:46, foto:"h14-vista",
      badge:null, gratisHasta:4, servicios:["piscina","desayuno"],
      descripcion:"La opción más económica de la zona, a pie de carretera. Limpio y correcto, pero sin aislamiento de ruido y con piscina pequeña.",
      distancias:{ playa:"9 min a pie", centro:"25 min en auto a Máncora", aeropuerto:"50 min a Talara" },
      fotos:["h14-vista","h14-cuarto","h14-bano","h14-mesa","h14-piscina"],
      notas:{ limpieza:3.7, ubicacion:4.0, personal:4.0, precio:4.5 },
      mapa:{ x:68, y:44 } },

    { id:15, nombre:"Amazonas Eco Lodge", destino:"iquitos", estrellas:4, rating:4.4, resenas:806, precio:132, foto:"h15-vista",
      badge:"Guía para niños", gratisHasta:6, servicios:["kidsclub","desayuno","todoincluido","traslado"],
      descripcion:"Lodge en la reserva con guía especializado en rutas cortas para niños. Se llega en bote, un trayecto de 45 minutos incluido en el precio.",
      distancias:{ playa:"Playa de río a 5 min a pie", centro:"1 h 15 min en bote a Iquitos", aeropuerto:"1 h 40 min combinando bote y auto" },
      fotos:["h15-vista","h15-cuarto","h15-bano","h15-salon","h15-piscina"],
      notas:{ limpieza:4.3, ubicacion:4.7, personal:4.8, precio:3.9 },
      mapa:{ x:36, y:26 } },

    { id:16, nombre:"Nanay River Inn", destino:"iquitos", estrellas:3, rating:4.0, resenas:352, precio:58, foto:"h16-vista",
      badge:null, gratisHasta:4, servicios:["desayuno","traslado"],
      descripcion:"Hospedaje urbano junto al río Nanay, buena base para excursiones de un día. Tiene mosquiteros en todas las habitaciones.",
      distancias:{ playa:"Playa de río a 10 min en auto", centro:"8 min en auto", aeropuerto:"20 min en auto" },
      fotos:["h16-vista","h16-cuarto","h16-bano","h16-salon","h16-piscina"],
      notas:{ limpieza:3.9, ubicacion:4.2, personal:4.1, precio:4.3 },
      mapa:{ x:66, y:46 } }
  ];

  /* ---------- 3. FOTOGRAFÍA ----------
     Identificadores de Unsplash. Para cambiar una foto basta con
     reemplazar el identificador: el tamaño y el recorte los pide la
     propia URL. Créditos en el pie de cada página. */
  const CDN = "https://images.unsplash.com/";

  const FOTOS_DESTINO = {
    cancun:       "photo-1602088113235-229c19758e9f",
    cusco:        "photo-1526697675318-89790adec369",
    "punta-cana": "photo-1549294413-26f195200c16",
    orlando:      "photo-1617409123168-8fb039dd3b39",
    cartagena:    "photo-1534943441045-1009d7cb0bb9",
    bariloche:    "photo-1598162461164-5cb059c382c6",
    mancora:      "photo-1559619752-c9be3d26d457",
    iquitos:      "photo-1598837218686-a456fdaa5cf3"
  };

  /* Banco de imágenes por tipo de estancia. Cada hotel arma su galería
     combinando una de cada categoría, de modo que las cinco fotos
     cuentan siempre lo mismo: dónde duermes, dónde te bañas, dónde
     comes y qué hay fuera. Son fotos de banco reutilizadas entre
     hoteles: en un producto real cada hotel traería las suyas. */
  /* ---------- GALERÍAS DE LOS HOTELES ----------
     Una fila por foto: [clave, identificador de Unsplash, rótulo].
     Cinco fotos por hotel, ochenta en total, y ningún identificador
     repetido en todo el catálogo: cuando dos hoteles compartían foto,
     la lista de resultados parecía un fallo de carga. La clave lleva
     el hotel y el tipo de estancia para que se lea de un vistazo.

     El rótulo va aquí, pegado a la foto que describe: una galería sin
     rótulos obliga a adivinar qué se está mirando. */
  const FOTOS = [
    ["h1-piscina",  "photo-1699086062891-d489d4509330", "Piscina principal"],
    ["h1-cuarto",   "photo-1776763018972-588e27bf6511", "Suite familiar"],
    ["h1-bano",     "photo-1576698483491-8c43f0862543", "Baño de la suite"],
    ["h1-mesa",     "photo-1722477936580-84aa10762b0b", "Buffet del desayuno"],
    ["h1-vista",    "photo-1721908919546-f752b776f970", "El resort desde el aire"],
    ["h2-piscina",  "photo-1687834618283-1b9e12de54a7", "Piscina y solárium"],
    ["h2-cuarto",   "photo-1631049307264-da0ec9d70304", "Habitación familiar"],
    ["h2-bano",     "photo-1643949700215-e61cdca053f7", "Baño"],
    ["h2-mesa",     "photo-1728051104003-aa16971b44b3", "Desayuno"],
    ["h2-salon",    "photo-1759038085950-1234ca8f5fed", "Recepción"],
    ["h3-salon",    "photo-1637730827702-de34e9ae4ede", "Salón principal"],
    ["h3-cuarto",   "photo-1618773928121-c32242e63f39", "Habitación doble"],
    ["h3-bano",     "photo-1754574741164-a41418029cfb", "Baño"],
    ["h3-mesa",     "photo-1667648236280-ed566d0d4d49", "Comedor"],
    ["h3-vista",    "photo-1587381420270-3e1a5b9e6904", "La casona y el entorno"],
    ["h4-vista",    "photo-1682430547023-afc1092a7b2b", "Vistas a la cordillera"],
    ["h4-cuarto",   "photo-1714175247782-64c19c77c705", "Habitación con vistas"],
    ["h4-bano",     "photo-1737233523182-99e287258d58", "Baño"],
    ["h4-mesa",     "photo-1610474035796-60425768a554", "Desayuno"],
    ["h4-salon",    "photo-1744000311635-0280df5cc00e", "Salón común"],
    ["h5-piscina",  "photo-1623718649591-311775a30c43", "Piscina principal"],
    ["h5-cuarto",   "photo-1744000311897-510b64f9a2e2", "Suite familiar"],
    ["h5-bano",     "photo-1744000311871-b0ca10a69df5", "Baño de la suite"],
    ["h5-mesa",     "photo-1763207291832-819499e261dd", "Buffet del desayuno"],
    ["h5-vista",    "photo-1605538108568-7f0d77a214c1", "Playa del hotel"],
    ["h6-piscina",  "photo-1617859047452-8510bcf207fd", "Piscina junto a la playa"],
    ["h6-cuarto",   "photo-1758448755969-8791367cf5c5", "Habitación doble"],
    ["h6-bano",     "photo-1733426107854-ee00a25d72a7", "Baño con bañera"],
    ["h6-mesa",     "photo-1687877465634-a7599027966c", "Desayuno"],
    ["h6-vista",    "photo-1602002418816-5c0aeef426aa", "Playa del hotel"],
    ["h7-piscina",  "photo-1639111765440-c9bf7b03621e", "Piscina"],
    ["h7-cuarto",   "photo-1667125095636-dce94dcbdd96", "Habitación familiar"],
    ["h7-bano",     "photo-1644421439741-712c7fde7e95", "Baño"],
    ["h7-mesa",     "photo-1603532232030-69a8264a71f4", "Desayuno"],
    ["h7-salon",    "photo-1637730826933-54287f79e1c3", "Recepción"],
    ["h8-piscina",  "photo-1559004298-5da931d4b709", "Piscina cubierta"],
    ["h8-cuarto",   "photo-1765434669956-afcd50058d69", "Suite con cocina"],
    ["h8-bano",     "photo-1691036365036-71da57ac5919", "Baño"],
    ["h8-mesa",     "photo-1630582837298-49d1927726e5", "Desayuno en la habitación"],
    ["h8-salon",    "photo-1613618912478-8e320bec495a", "Zona de comedor"],
    ["h9-salon",    "photo-1671739961758-70194a015aa8", "Patio interior"],
    ["h9-cuarto",   "photo-1612645213559-6af1d4edeaf8", "Habitación colonial"],
    ["h9-bano",     "photo-1507652313519-d4e9174996dd", "Baño con bañera"],
    ["h9-mesa",     "photo-1744000311222-61863adfeb93", "Comedor"],
    ["h9-vista",    "photo-1693585576674-2e1b7166f583", "Balcón a la calle"],
    ["h10-piscina", "photo-1711114378509-acc95d490b25", "Piscina"],
    ["h10-cuarto",  "photo-1568495248636-6432b97bd949", "Habitación familiar"],
    ["h10-bano",    "photo-1650894622076-e09ab837c502", "Baño"],
    ["h10-mesa",    "photo-1596701062351-8c2c14d1fdd0", "Desayuno"],
    ["h10-vista",   "photo-1719266084633-24981ecdc417", "Terraza y vistas"],
    ["h11-vista",   "photo-1562323150-c3f486a6f185", "El lodge y la montaña"],
    ["h11-cuarto",  "photo-1611892440504-42a792e24d32", "Habitación con vistas"],
    ["h11-bano",    "photo-1737233536991-8ee3f92b7781", "Baño"],
    ["h11-mesa",    "photo-1578704311587-4fbd590630d5", "Restaurante"],
    ["h11-salon",   "photo-1699166877362-73cba7e56867", "Salón al anochecer"],
    ["h12-vista",   "photo-1674840509046-1be9dc5fae34", "El lago desde el refugio"],
    ["h12-cuarto",  "photo-1582719478250-c89cae4dc85b", "Habitación con vistas al lago"],
    ["h12-bano",    "photo-1631889993959-41b4e9c6e3c5", "Baño"],
    ["h12-mesa",    "photo-1723317727637-f45f60e27164", "Comedor"],
    ["h12-salon",   "photo-1692153142524-60285a93c249", "Salón común"],
    ["h13-vista",   "photo-1581859814481-bfd944e3122f", "Los bungalós"],
    ["h13-cuarto",  "photo-1788217023349-ad7763845844", "Bungaló doble"],
    ["h13-bano",    "photo-1620626011761-996317b8d101", "Baño"],
    ["h13-mesa",    "photo-1728050829024-8113f4cd85ec", "Desayuno"],
    ["h13-piscina", "photo-1731080647266-85cf1bc27162", "Piscina"],
    ["h14-vista",   "photo-1579264670612-6eb62a173aec", "Vistas al mar"],
    ["h14-cuarto",  "photo-1630660664869-c9d3cc676880", "Habitación doble"],
    ["h14-bano",    "photo-1722923400899-af08ffc715c6", "Baño"],
    ["h14-mesa",    "photo-1540304453527-62f979142a17", "Desayuno"],
    ["h14-piscina", "photo-1598598795006-ea2174659eaa", "Piscina y mar"],
    ["h15-vista",   "photo-1618140052121-39fc6db33972", "El lodge en la selva"],
    ["h15-cuarto",  "photo-1765434670017-c0d28ecde29a", "Habitación del lodge"],
    ["h15-bano",    "photo-1642755622932-d1e0cb783dc5", "Baño con vistas"],
    ["h15-salon",   "photo-1628630468464-4168a51129f1", "Salón abierto"],
    ["h15-piscina", "photo-1706561611610-2ebe309993f2", "Piscina entre la vegetación"],
    ["h16-vista",   "photo-1544646280-e243b3ab7d1e", "La posada junto al río"],
    ["h16-cuarto",  "photo-1576354302919-96748cb8299e", "Habitación doble"],
    ["h16-bano",    "photo-1733425844220-feab971190ff", "Baño"],
    ["h16-salon",   "photo-1660557989725-f511e9fa6267", "Salón común"],
    ["h16-piscina", "photo-1623812058330-ccfa078cffb3", "Piscina"]
  ];

  const BANCO = {};
  const PIES  = {};
  FOTOS.forEach(function (f) { BANCO[f[0]] = f[1]; PIES[f[0]] = f[2]; });

  /* Compatibilidad: algunas vistas piden una sola foto. */
  const FOTOS_HOTEL = BANCO;

  function urlFoto(id, ancho) {
    const real = BANCO[id] || id;
    return CDN + real + "?auto=format&fit=crop&w=" + ancho + "&q=70";
  }
  const pieDeFoto = function (clave) { return PIES[clave] || "Foto del hotel"; };

  /* El alt va vacío a propósito: el nombre y la descripción están en
     texto al lado, así que describir la foto solo repetiría. */
  function imagen(id, sizes, ansioso) {
    if (!id) return "";
    return '<img class="art-photo" alt=""' +
      (ansioso ? '' : ' loading="lazy"') + ' decoding="async"' +
      ' src="' + urlFoto(id, 800) + '"' +
      ' srcset="' + urlFoto(id, 400) + ' 400w, ' + urlFoto(id, 800) + ' 800w, ' + urlFoto(id, 1200) + ' 1200w"' +
      ' sizes="' + sizes + '">';
  }

  /* Si una foto no carga, se retira y queda la ilustración de abajo. */
  function respaldarFotos(contenedor) {
    (contenedor || document).querySelectorAll(".art-photo").forEach(function (img) {
      img.addEventListener("error", function () { img.remove(); }, { once: true });
    });
  }

  /* ---------- 4. ILUSTRACIÓN SVG ----------
     Una gramática para las cinco escenas: mismo cielo en degradado,
     mismo sol en la misma posición, misma línea de horizonte y
     relleno plano. Solo cambia el terreno. */
  const CIELOS = {
    costa:  ["#FFE0AE", "#93D6DE"],
    sierra: ["#FFD6C0", "#B6DDE4"],
    selva:  ["#FFEFBE", "#A2DAC6"],
    ciudad: ["#FFD6C6", "#A5CCE2"],
    lago:   ["#FFE6C6", "#A2D0E4"]
  };
  let uid = 0;

  function escena(tipo) {
    const id = "sky" + (++uid);
    const c = CIELOS[tipo] || CIELOS.costa;
    let terreno = "";

    if (tipo === "costa") {
      terreno =
        '<path d="M0 158h400v58H0z" fill="#1C93A0"/>' +
        '<path d="M0 196h400v64H0z" fill="#EFD9B4"/>' +
        '<g stroke="#8FD8DF" stroke-width="4" fill="none" stroke-linecap="round">' +
          '<path d="M28 176q13-7 26 0t26 0"/><path d="M150 186q13-7 26 0t26 0"/><path d="M286 172q13-7 26 0t26 0"/>' +
        '</g>' +
        '<rect x="62" y="150" width="9" height="82" rx="4.5" fill="#8A5A3B"/>' +
        '<ellipse cx="66" cy="148" rx="30" ry="10" fill="#128A66" transform="rotate(-16 66 148)"/>' +
        '<ellipse cx="66" cy="148" rx="30" ry="10" fill="#0F7A5A" transform="rotate(64 66 148)"/>' +
        '<ellipse cx="66" cy="148" rx="30" ry="10" fill="#16996F" transform="rotate(158 66 148)"/>' +
        '<rect x="336" y="170" width="7" height="62" rx="3.5" fill="#8A5A3B"/>' +
        '<ellipse cx="339" cy="168" rx="24" ry="8" fill="#128A66" transform="rotate(-22 339 168)"/>' +
        '<ellipse cx="339" cy="168" rx="24" ry="8" fill="#0F7A5A" transform="rotate(58 339 168)"/>';
    } else if (tipo === "sierra") {
      terreno =
        '<path d="M-10 196 90 76l100 120z" fill="#3E7F79"/>' +
        '<path d="M140 196 244 58l106 138z" fill="#2B5F5A"/>' +
        '<path d="M300 196 372 106l58 90z" fill="#3E7F79"/>' +
        '<path d="M244 58l30 39-14 5-16-8-15 9-13-6z" fill="#F3F7F5"/>' +
        '<path d="M90 76l21 32-11 3-11-6-11 6-10-5z" fill="#F3F7F5"/>' +
        '<path d="M0 196h400v64H0z" fill="#2F7F5B"/>' +
        '<ellipse cx="120" cy="214" rx="86" ry="26" fill="#3C9068"/>';
    } else if (tipo === "selva") {
      terreno =
        '<path d="M0 182h400v78H0z" fill="#17694F"/>' +
        '<path d="M150 182c24 26 26 52 20 78h64c-8-26-4-52 18-78z" fill="#2E9BC4"/>' +
        '<circle cx="62" cy="168" r="52" fill="#1C7A5A"/>' +
        '<circle cx="128" cy="184" r="40" fill="#22906A"/>' +
        '<circle cx="330" cy="162" r="56" fill="#1C7A5A"/>' +
        '<circle cx="268" cy="188" r="38" fill="#22906A"/>' +
        '<rect x="58" y="196" width="10" height="64" rx="5" fill="#6B4A32"/>' +
        '<rect x="326" y="196" width="10" height="64" rx="5" fill="#6B4A32"/>';
    } else if (tipo === "ciudad") {
      terreno =
        '<rect x="22"  y="120" width="56" height="106" rx="5" fill="#2B5F5A"/>' +
        '<rect x="88"  y="158" width="48" height="68"  rx="5" fill="#3E7F79"/>' +
        '<rect x="146" y="92"  width="62" height="134" rx="5" fill="#25514D"/>' +
        '<rect x="218" y="142" width="52" height="84"  rx="5" fill="#3E7F79"/>' +
        '<rect x="280" y="108" width="58" height="118" rx="5" fill="#2B5F5A"/>' +
        '<rect x="348" y="164" width="44" height="62"  rx="5" fill="#3E7F79"/>' +
        '<g fill="#F5D07F">' +
          '<rect x="34"  y="134" width="10" height="12" rx="2"/><rect x="54" y="134" width="10" height="12" rx="2"/>' +
          '<rect x="34"  y="158" width="10" height="12" rx="2"/><rect x="54" y="158" width="10" height="12" rx="2"/>' +
          '<rect x="158" y="108" width="10" height="12" rx="2"/><rect x="180" y="108" width="10" height="12" rx="2"/>' +
          '<rect x="158" y="132" width="10" height="12" rx="2"/><rect x="180" y="132" width="10" height="12" rx="2"/>' +
          '<rect x="292" y="124" width="10" height="12" rx="2"/><rect x="314" y="124" width="10" height="12" rx="2"/>' +
          '<rect x="292" y="150" width="10" height="12" rx="2"/><rect x="314" y="150" width="10" height="12" rx="2"/>' +
        '</g>' +
        '<path d="M0 226h400v34H0z" fill="#26564F"/>';
    } else { /* lago */
      terreno =
        '<path d="M-10 172 96 70l104 102z" fill="#3E7F79"/>' +
        '<path d="M170 172 268 74l142 98z" fill="#2B5F5A"/>' +
        '<path d="M96 70l24 32-11 4-13-7-12 7-11-4z" fill="#F3F7F5"/>' +
        '<path d="M0 172h400v88H0z" fill="#2E8FC0"/>' +
        '<path d="M-10 172 96 250l104-78z" fill="#3B9BC9" opacity=".55"/>' +
        '<g stroke="#8CD0EA" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8">' +
          '<path d="M40 210q13-6 26 0t26 0"/><path d="M230 226q13-6 26 0t26 0"/><path d="M300 198q13-6 26 0t26 0"/>' +
        '</g>';
    }

    return '<svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[0] + '"/>' +
      '</linearGradient></defs>' +
      '<rect width="400" height="260" fill="url(#' + id + ')"/>' +
      '<circle cx="312" cy="56" r="26" fill="#F5A524"/>' +
      terreno +
    '</svg>';
  }

  function estrellasSVG(n) {
    let out = '<span class="stars" aria-hidden="true">';
    for (let i = 0; i < n; i++) {
      out += '<svg width="13" height="13" viewBox="0 0 13 13" fill="#F5A524"><path d="m6.5 1 1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7L1.2 4.9l3.7-.5z"/></svg>';
    }
    return out + '</span>';
  }

  /* ---------- 5. FORMATO Y BÚSQUEDA ---------- */
  const fmt   = function (n) { return Number(n).toLocaleString("es-PE"); };
  const coma  = function (n) { return n.toFixed(1).replace(".", ","); };
  const destinoPorId = function (id) { return DESTINOS.find(function (d) { return d.id === id; }); };
  const hotelPorId   = function (id) { return HOTELES.find(function (h) { return h.id === Number(id); }); };
  const servicioPorId = function (id) { return SERVICIOS.find(function (s) { return s.id === id; }); };

  function parametro(nombre) {
    return new URLSearchParams(global.location.search).get(nombre);
  }

  function fechaLarga(iso) {
    if (!iso) return "";
    const p = iso.split("-");
    const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    return Number(p[2]) + " " + meses[Number(p[1]) - 1] + " " + p[0];
  }

  function noches(entrada, salida) {
    if (!entrada || !salida) return 1;
    const n = Math.round((new Date(salida) - new Date(entrada)) / 864e5);
    return n > 0 ? n : 1;
  }

  function isoHoy(desplazamiento) {
    return new Date(Date.now() + (desplazamiento || 0) * 864e5).toISOString().slice(0, 10);
  }

  /* ---------- 6. HABITACIONES Y PRECIO ----------
     Tres tipos derivados del precio base del hotel, para no inventar
     tarifas sueltas que luego no cuadren con el listado. */
  function habitaciones(hotel) {
    return [
      { id:"doble",    nombre:"Habitación doble",   capacidad:2, camas:"1 cama matrimonial",             factor:1,    incluye:"Ideal si viajan dos adultos y un bebé en cuna." },
      { id:"familiar", nombre:"Habitación familiar", capacidad:4, camas:"1 matrimonial + 2 individuales", factor:1.35, incluye:"La opción con mejor relación precio por persona para cuatro." },
      { id:"suite",    nombre:"Suite familiar",     capacidad:6, camas:"2 ambientes separados",           factor:1.8,  incluye:"Dos ambientes con puerta: los niños duermen aparte." }
    ].map(function (h) {
      return Object.assign({}, h, { precio: Math.round(hotel.precio * h.factor) });
    });
  }

  /* El corazón del producto: la edad de cada menor decide si paga.
     Hasta `gratisHasta` años el niño no ocupa plaza de pago; por
     encima se cobra una cama supletoria del 28% de la habitación. */
  function calcular(hotel, habitacion, entrada, salida, adultos, edades) {
    const n = noches(entrada, salida);
    const camaExtra = Math.round(habitacion.precio * 0.28);
    const lineas = [];

    lineas.push({
      concepto: habitacion.nombre + " · " + n + (n === 1 ? " noche" : " noches"),
      detalle: "USD " + fmt(habitacion.precio) + " por noche, hasta " + adultos + (adultos === 1 ? " adulto" : " adultos"),
      importe: habitacion.precio * n
    });

    let menoresQuePagan = 0;
    (edades || []).forEach(function (edad) {
      if (edad <= hotel.gratisHasta) {
        lineas.push({
          concepto: "Menor de " + edad + (edad === 1 ? " año" : " años"),
          detalle: "No paga: este hotel no cobra hasta los " + hotel.gratisHasta + " años",
          importe: 0,
          gratis: true
        });
      } else {
        menoresQuePagan++;
        lineas.push({
          concepto: "Menor de " + edad + " años · cama supletoria",
          detalle: "USD " + fmt(camaExtra) + " por noche, por superar los " + hotel.gratisHasta + " años",
          importe: camaExtra * n
        });
      }
    });

    const total = lineas.reduce(function (s, l) { return s + l.importe; }, 0);
    return { noches: n, lineas: lineas, total: total, camaExtra: camaExtra, menoresQuePagan: menoresQuePagan };
  }

  /* ---------- 7. ALMACENAMIENTO ----------
     localStorage puede fallar o venir vacío (ventana privada, datos
     bloqueados, algunos navegadores al abrir con doble clic), así
     que todo va con try/catch y hay un respaldo en memoria para que
     la página siga funcionando dentro de la sesión. */
  const memoria = {};

  function leer(clave, porDefecto) {
    try {
      const v = global.localStorage.getItem(clave);
      if (v !== null) return JSON.parse(v);
    } catch (e) { /* sin almacenamiento disponible */ }
    return (clave in memoria) ? memoria[clave] : porDefecto;
  }

  function escribir(clave, valor) {
    memoria[clave] = valor;
    try { global.localStorage.setItem(clave, JSON.stringify(valor)); }
    catch (e) { /* queda solo en memoria hasta cerrar la pestaña */ }
  }

  const CLAVE_RESERVAS  = "rumbo.reservas";
  const CLAVE_COMPARAR  = "rumbo.comparar";
  const CLAVE_BUSQUEDA  = "rumbo.busqueda";
  const MAX_COMPARAR    = 3;

  const reservas = {
    listar: function () { return leer(CLAVE_RESERVAS, []); },
    crear: function (r) {
      const lista = reservas.listar();
      r.codigo = "RB-" + String(Date.now()).slice(-6);
      r.creada = new Date().toISOString();
      r.estado = "confirmada";
      lista.unshift(r);
      escribir(CLAVE_RESERVAS, lista);
      return r;
    },
    cancelar: function (codigo) {
      const lista = reservas.listar().map(function (r) {
        return r.codigo === codigo ? Object.assign({}, r, { estado: "cancelada" }) : r;
      });
      escribir(CLAVE_RESERVAS, lista);
    },
    borrar: function (codigo) {
      escribir(CLAVE_RESERVAS, reservas.listar().filter(function (r) { return r.codigo !== codigo; }));
    },
    activas: function () {
      return reservas.listar().filter(function (r) { return r.estado === "confirmada"; }).length;
    }
  };

  const comparar = {
    listar: function () { return leer(CLAVE_COMPARAR, []); },
    tiene: function (id) { return comparar.listar().indexOf(Number(id)) !== -1; },
    alternar: function (id) {
      id = Number(id);
      let lista = comparar.listar();
      if (lista.indexOf(id) !== -1) {
        lista = lista.filter(function (x) { return x !== id; });
      } else {
        if (lista.length >= MAX_COMPARAR) return { ok: false, motivo: "lleno" };
        lista.push(id);
      }
      escribir(CLAVE_COMPARAR, lista);
      return { ok: true, lista: lista };
    },
    limpiar: function () { escribir(CLAVE_COMPARAR, []); }
  };

  /* La búsqueda del inicio viaja a la ficha del hotel para que el
     precio que se ve ahí corresponda a las fechas y huéspedes que
     el usuario ya eligió, en vez de volver a empezar de cero. */
  const busqueda = {
    leer: function () {
      return leer(CLAVE_BUSQUEDA, {
        entrada: isoHoy(21), salida: isoHoy(25), adultos: 2, edades: [7]
      });
    },
    guardar: function (b) { escribir(CLAVE_BUSQUEDA, b); }
  };

  /* ---------- 8. RESEÑAS POR CATEGORÍA ----------
     El número general esconde el porqué. Un 4,2 de un hotel impecable
     pero mal ubicado y un 4,2 de un hotel bien puesto pero sucio son
     decisiones distintas para una familia. */
  const CATEGORIAS = [
    { id:"limpieza",  label:"Limpieza" },
    { id:"ubicacion", label:"Ubicación" },
    { id:"personal",  label:"Personal" },
    { id:"precio",    label:"Relación calidad-precio" }
  ];

  /* ---------- 9. DISTRIBUCIÓN DE PRECIOS ----------
     Cuántos hoteles caen en cada tramo. Sirve para que el usuario vea
     dónde está la oferta antes de mover el slider a ciegas. */
  function distribucionPrecio(lista, min, max, tramos) {
    const paso = (max - min) / tramos;
    const cubos = [];
    for (let i = 0; i < tramos; i++) {
      cubos.push({ desde: Math.round(min + i * paso), hasta: Math.round(min + (i + 1) * paso), n: 0 });
    }
    lista.forEach(function (h) {
      let i = Math.floor((h.precio - min) / paso);
      if (i < 0) i = 0;
      if (i >= tramos) i = tramos - 1;
      cubos[i].n++;
    });
    return cubos;
  }

  /* ---------- 10. MAPA ILUSTRADO ----------
     No es un mapa real ni pretende serlo: es un esquema para situar
     los hoteles entre sí y respecto a los tres puntos que importan.
     Misma gramática que las escenas: relleno plano, sin trazos
     sueltos, un solo sistema de color. Lienzo 100 x 64. */
  const LUGARES = {
    costa:  [ { x:50, y:14, label:"Playa",      icono:"agua"  },
              { x:80, y:44, label:"Centro",     icono:"centro"},
              { x:14, y:54, label:"Aeropuerto", icono:"avion" } ],
    ciudad: [ { x:50, y:26, label:"Centro",     icono:"centro"},
              { x:22, y:46, label:"Parques",    icono:"parque"},
              { x:84, y:52, label:"Aeropuerto", icono:"avion" } ],
    sierra: [ { x:46, y:34, label:"Plaza",      icono:"centro"},
              { x:76, y:16, label:"Mirador",    icono:"parque"},
              { x:16, y:52, label:"Aeropuerto", icono:"avion" } ],
    lago:   [ { x:30, y:16, label:"Lago",       icono:"agua"  },
              { x:72, y:42, label:"Centro",     icono:"centro"},
              { x:88, y:56, label:"Aeropuerto", icono:"avion" } ],
    selva:  [ { x:52, y:24, label:"Río",        icono:"agua"  },
              { x:78, y:48, label:"Pueblo",     icono:"centro"},
              { x:18, y:46, label:"Puerto",     icono:"parque"} ]
  };

  /* Coordenada de un hotel. Los hoteles son ficticios: esto no apunta
     a ningún establecimiento real, solo los reparte alrededor del
     centro de su ciudad. Se deriva de `mapa` (x de 0 a 100, y de 0 a
     64), la misma posición relativa que usa el plano esquemático, así
     que ambos mapas los colocan igual. Es fijo, no aleatorio: un
     hotel no puede cambiar de sitio al recargar la página. */
  const RADIO_LAT = 0.035, RADIO_LNG = 0.05;

  function coordenadas(hotel) {
    const d = destinoPorId(hotel.destino);
    if (!d || !d.centro) return null;
    return {
      lat: d.centro.lat - ((hotel.mapa.y - 32) / 32) * RADIO_LAT,
      lng: d.centro.lng + ((hotel.mapa.x - 50) / 50) * RADIO_LNG
    };
  }

  function mapaBase(tipo) {
    const tierra = '<rect width="100" height="64" fill="#EFEAE0"/>';
    const via = 'stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round"';
    const senda = 'stroke="#FFFFFF" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".85"';

    if (tipo === "costa") {
      return tierra +
        '<path d="M0 0h100v18c-18 4-34 1-52 4S14 27 0 24z" fill="#9AD2DE"/>' +
        '<path d="M0 24c14 3 30 0 48 -2s34 0 52 -4v5c-18 4-34 1-52 4S14 29 0 27z" fill="#F0DFBB"/>' +
        '<ellipse cx="78" cy="46" rx="17" ry="11" fill="#CFE3CB"/>' +
        '<path d="M6 56 C 30 50, 52 46, 96 40" ' + via + '/>' +
        '<path d="M50 27 V 56" ' + senda + '/><path d="M80 34 V 56" ' + senda + '/>';
    }
    if (tipo === "ciudad") {
      return tierra +
        '<rect x="14" y="38" width="20" height="16" rx="3" fill="#CFE3CB"/>' +
        '<path d="M0 34 C 26 30, 40 40, 100 32" fill="none" stroke="#9AD2DE" stroke-width="5"/>' +
        '<path d="M0 20 H100 M0 46 H100 M22 4 V60 M50 4 V60 M76 4 V60" ' + via + '/>' +
        '<rect x="44" y="14" width="12" height="9" rx="2" fill="#D8D2C4"/>' +
        '<rect x="60" y="48" width="14" height="8" rx="2" fill="#D8D2C4"/>';
    }
    if (tipo === "sierra") {
      return tierra +
        '<ellipse cx="60" cy="22" rx="34" ry="19" fill="#DCD6C6"/>' +
        '<ellipse cx="60" cy="22" rx="24" ry="13" fill="#CBC3AF"/>' +
        '<ellipse cx="60" cy="22" rx="13" ry="7" fill="#B9AF97"/>' +
        '<ellipse cx="24" cy="50" rx="16" ry="9" fill="#CFE3CB"/>' +
        '<path d="M8 58 C 34 54, 40 38, 62 34 S 90 30, 98 20" ' + via + '/>' +
        '<path d="M46 34 L 30 50" ' + senda + '/>';
    }
    if (tipo === "lago") {
      return tierra +
        '<path d="M2 4 C 26 0, 48 6, 52 18 S 34 34, 16 30 S -4 14, 2 4z" fill="#9AD2DE"/>' +
        '<ellipse cx="74" cy="20" rx="20" ry="11" fill="#CFE3CB"/>' +
        '<path d="M4 44 C 28 40, 48 34, 96 30" ' + via + '/>' +
        '<path d="M30 30 V 44 M62 32 V 52" ' + senda + '/>' +
        '<rect x="66" y="46" width="16" height="9" rx="2" fill="#D8D2C4"/>';
    }
    /* selva */
    return '<rect width="100" height="64" fill="#D9E6CE"/>' +
      '<path d="M0 18 C 24 26, 30 40, 56 44 S 84 52, 100 58" fill="none" stroke="#7FC3D6" stroke-width="7" stroke-linecap="round"/>' +
      '<circle cx="18" cy="42" r="11" fill="#BBD6AD"/><circle cx="34" cy="52" r="8" fill="#BBD6AD"/>' +
      '<circle cx="76" cy="20" r="13" fill="#BBD6AD"/><circle cx="60" cy="14" r="8" fill="#BBD6AD"/>' +
      '<path d="M14 54 C 36 46, 56 30, 92 24" ' + senda + '/>' +
      '<rect x="72" y="44" width="14" height="8" rx="2" fill="#D8D2C4"/>';
  }

  /* Los iconos de referencia se dibujan en HTML, no dentro del SVG:
     un <text> en un viewBox de 100 unidades escala con el mapa y
     acaba enorme en escritorio e ilegible en móvil. En HTML el
     tamaño es el mismo en cualquier ancho. */
  function iconoLugar(tipo) {
    if (tipo === "agua")
      return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
        '<path d="M2 8.5q2.5-3 5 0t5 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M2 4.5q2.5-3 5 0t5 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".55"/></svg>';
    if (tipo === "avion")
      return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
        '<path d="M7 1.2 8 5.6l4.4 1.6-4.4.6-.6 4-.7-1.4-.7 1.4-.6-4-4.4-.6L5.4 5.6z" fill="currentColor"/></svg>';
    if (tipo === "parque")
      return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
        '<circle cx="7" cy="5.6" r="3.6" fill="currentColor"/><rect x="6.3" y="8.6" width="1.4" height="3.6" rx=".6" fill="currentColor" opacity=".6"/></svg>';
    return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
      '<path d="M2.5 12V5.5L7 2.5l4.5 3V12z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }

  /* ---------- Cabecera compartida ---------- */
  function pintarContadorReservas() {
    /* Se lee de RUMBO.reservas, no de la constante local: auth.js la
       sustituye por la versión ligada a la cuenta. */
    const n = global.RUMBO.reservas.activas();
    document.querySelectorAll("[data-contador-reservas]").forEach(function (el) {
      el.textContent = n > 0 ? String(n) : "";
      el.hidden = n === 0;
    });
  }

  global.RUMBO = {
    DESTINOS: DESTINOS, SERVICIOS: SERVICIOS, HOTELES: HOTELES, MAX_COMPARAR: MAX_COMPARAR,
    FOTOS_DESTINO: FOTOS_DESTINO, FOTOS_HOTEL: FOTOS_HOTEL,
    urlFoto: urlFoto, imagen: imagen, respaldarFotos: respaldarFotos,
    escena: escena, estrellasSVG: estrellasSVG,
    fmt: fmt, coma: coma, fechaLarga: fechaLarga, noches: noches, isoHoy: isoHoy,
    destinoPorId: destinoPorId, hotelPorId: hotelPorId, servicioPorId: servicioPorId,
    ENTORNOS: ENTORNOS, entornoDe: entornoDe,
    parametro: parametro, habitaciones: habitaciones, calcular: calcular,
    BANCO: BANCO, pieDeFoto: pieDeFoto,
    CATEGORIAS: CATEGORIAS, distribucionPrecio: distribucionPrecio,
    LUGARES: LUGARES, mapaBase: mapaBase, iconoLugar: iconoLugar, coordenadas: coordenadas,
    reservas: reservas, comparar: comparar, busqueda: busqueda,
    pintarContadorReservas: pintarContadorReservas
  };
})(window);
