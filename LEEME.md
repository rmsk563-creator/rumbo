# Rumbo — cómo abrir el proyecto

Buscador de hoteles para viajar en familia. HTML, CSS y JavaScript puros: no hay que instalar nada y no hay build.

Tres librerías entran por CDN, sin npm y sin build: **Supabase** (cuentas, reservas y favoritos), **Leaflet** (el mapa de resultados) y las tipografías de Google. Si alguna no carga, la página sigue funcionando: las tres tienen respaldo.

## Abrirlo en Visual Studio Code

1. Descomprime `rumbo.zip` en la carpeta que quieras.
2. En VS Code: **Archivo → Abrir carpeta…** y elige la carpeta `rumbo`. Abrir la carpeta, no un archivo suelto, es lo que hace que las páginas encuentren el CSS y el JS.
3. Doble clic en `index.html` desde tu explorador de archivos para verlo en el navegador.

Para que se recargue solo al guardar, instala la extensión **Live Server** (de Ritwick Dey), clic derecho en `index.html` y *Open with Live Server*. Recomendado: con doble clic algunos navegadores restringen el guardado de reservas.

## Las cuatro páginas

`index.html` — buscador, destinos y resultados con filtros. Desde aquí se marcan hoteles para comparar y se entra a cada ficha.

`hotel.html` — ficha del hotel y reserva. Recibe el hotel por la URL: `hotel.html?id=5`. Si el id no existe, muestra un error con salida en lugar de quedarse en blanco.

`comparar.html` — comparación lado a lado de dos o tres hoteles. Recibe los ids por la URL: `comparar.html?ids=1,5,9`, así que el enlace se puede compartir.

`reservas.html` — las reservas confirmadas, guardadas en el navegador.

## Los archivos de código

`styles.css` — todos los estilos de las cuatro páginas, en quince bloques comentados. Los tokens de color, tipografía, espaciado y radios están al principio, en `:root`, definidos dos veces: tema claro y tema oscuro.

`datos.js` — el módulo compartido. Destinos, hoteles, fotos, el sistema de ilustración SVG, el cálculo de precios y el guardado en el navegador. Lo cargan las cuatro páginas y expone todo en `window.RUMBO`.

`inicio.js`, `hotel.js`, `comparar.js`, `reservas.js` — la lógica propia de cada página.

`auth.js` — cuentas, sesión, reservas en la nube y favoritos. Se carga después de `datos.js` y antes del script de cada página.

`supabase-migracion.sql` — el esquema de la base: las tablas `perfiles`, `reservas` y `favoritos`, con Row Level Security. Se puede ejecutar más de una vez sin romper nada.

No se usan módulos ES a propósito: con `import` el navegador bloquea los archivos abiertos con doble clic por política de origen, y el proyecto dejaría de funcionar sin servidor.

## Las cuatro piezas que vale la pena mirar en el código

**Galería** (`hotel.js`, función `pintarGaleria`). Cinco fotos por hotel con miniaturas, pie de foto y visor ampliado con flechas y Escape. La miniatura activa se marca con `aria-selected`, no solo con el borde. Cada foto lleva su rótulo: una galería sin rótulos obliga a adivinar qué se está mirando.

**Reseñas por categoría** (`pintarNotas` en `hotel.js`, datos en `notas` dentro de `datos.js`). El número general dice cuánto gusta; el desglose dice por qué. Cada barra lleva su cifra al lado, porque una barra sin número no se puede comparar entre hoteles.

**Distribución de precios** (`pintarHisto` en `inicio.js`, `distribucionPrecio` en `datos.js`). Las barras sobre el slider muestran cuántos hoteles hay en cada tramo. Se calculan sobre los hoteles que ya pasan el resto de filtros, no sobre el catálogo entero, así que responden al contexto. Los tramos por encima del tope se apagan en vez de desaparecer, para que se vea cuánta oferta se está dejando fuera.

**Mapa de resultados** (`pintarMapa` en `inicio.js`). Leaflet con teselas de OpenStreetMap. Las ciudades llevan coordenadas reales en el campo `centro` de cada destino; los hoteles son inventados y se reparten alrededor del centro de su ciudad con `coordenadas` de `datos.js`. El marcador lleva el precio, que es el dato por el que se compara de un vistazo. El mapa respeta los filtros activos: los marcadores salen de la misma lista que la vista de lista.

**Plano esquemático de respaldo** (`pintarMapaEsquematico` en `inicio.js`, `mapaBase` y `LUGARES` en `datos.js`). SVG puro, sin peticiones externas. Se usa solo si Leaflet no carga. Los hitos y los pines van en HTML sobre el SVG, no dentro de él: un `<text>` en un viewBox de 100 unidades escala con el mapa y acaba enorme en escritorio e ilegible en móvil.

## Cómo funciona el precio por edades

Es la parte que da sentido al producto. Cada hotel tiene un campo `gratisHasta`: la edad, incluida, hasta la que un niño no paga. Por encima se cobra una cama supletoria del 28% del precio de la habitación.

Pruébalo: entra en un hotel con `gratisHasta` 12, cambia la edad de un niño de 7 a 14 y mira cómo cambia el total y el desglose. Toda esa lógica está en la función `calcular` de `datos.js`.

## Cosas que quizá quieras cambiar

**Hoteles y destinos**: los arreglos `DESTINOS` y `HOTELES` al inicio de `datos.js`. Cada hotel lleva su descripción, su política de menores y sus distancias reales.

**Los tipos de habitación**: la función `habitaciones` de `datos.js`. Se derivan del precio base del hotel con un factor, para que no haya tarifas sueltas que luego no cuadren con el listado.

**Las fotos**: la tabla `FOTOS` de `datos.js`, con una fila por foto: `[clave, identificador de Unsplash, rótulo]`. Son ochenta, cinco por hotel, y ningún identificador se repite en todo el catálogo. `BANCO` y `PIES` se derivan de esa tabla, así que la foto y su rótulo no se pueden desparejar. La foto del hero es la única escrita directamente en `index.html`, porque no la pinta el script.

**Las notas por categoría**: el objeto `notas` de cada hotel en `datos.js`, del 1 al 5.

**La posición en el mapa**: el objeto `mapa` de cada hotel (`x` de 0 a 100, `y` de 0 a 64). Es una posición relativa: de ahí salen tanto los pines del plano esquemático como las coordenadas reales del mapa de Leaflet, así que los dos colocan los hoteles igual. Las coordenadas de las ciudades están en `centro`, dentro de `DESTINOS`.

**Las etiquetas de entorno** de las tarjetas (Playa, Ciudad, Montaña, Lago, Selva): el objeto `ENTORNOS` de `datos.js`. Se derivan del campo `tipo` del destino, así que la etiqueta y la ilustración nunca se desincronizan.

**Los colores y tamaños**: `:root`, al principio de `styles.css`.

## Tres detalles a tener en cuenta

Debajo de cada fotografía hay una ilustración SVG dibujada siempre. Si una foto no carga, el script la retira y queda la ilustración, así que nunca verás el icono de imagen rota. No es un error: es el respaldo funcionando.

Las fotos vienen del CDN de Unsplash, así que la página necesita internet para mostrarlas. Sin conexión se ven las ilustraciones. Para que funcione offline, descarga las imágenes a una carpeta `img/`, cambia la constante `CDN` de `datos.js` por `"img/"` y pon ahí los nombres de tus archivos.

Las reservas y los favoritos viven en la cuenta, en Supabase, y se ven desde cualquier dispositivo. Row Level Security se encarga de que cada usuario solo vea lo suyo: no es el JavaScript de la página el que decide quién ve qué, sino la base de datos.

Las reservas que se hicieran antes de existir las cuentas siguen en `localStorage`, y «Mis reservas» ofrece pasarlas a la cuenta. Solo se borran del navegador cuando la nube ya las tiene.

Los hoteles y las ciudades: las ciudades son reales y sus coordenadas salen del geocodificador de OpenStreetMap. Los hoteles son inventados, y su posición en el mapa es aproximada y no corresponde a ningún edificio.

---

Proyecto de práctica. No es un servicio real, los hoteles son inventados y en ningún momento se piden datos de pago.
