/* ============================================================
   RUMBO — comparador lado a lado
   Lee los ids de la URL (comparar.html?ids=1,5,9) y, si no vienen,
   de lo que el usuario marcó en los resultados. Depende de datos.js.

   La idea de fondo: una tabla comparativa solo sirve si marca las
   diferencias. Por eso las filas que tienen un ganador claro lo
   resaltan, y los servicios se muestran completos para que se vea
   lo que falta, no solo lo que hay.
   ============================================================ */
(function () {
  "use strict";

  const R = window.RUMBO;
  const $ = function (s) { return document.querySelector(s); };

  R.pintarContadorReservas();

  /* ---------- Resolver qué hoteles comparar ---------- */
  const desdeUrl = (R.parametro("ids") || "")
    .split(",")
    .map(function (x) { return Number(x.trim()); })
    .filter(function (x) { return x; });

  const ids = (desdeUrl.length ? desdeUrl : R.comparar.listar()).slice(0, R.MAX_COMPARAR);
  const hoteles = ids.map(R.hotelPorId).filter(Boolean);

  if (hoteles.length < 2) {
    $("#cmp-vacio").hidden = false;
    $("#cmp-lead").textContent = "Marca la casilla «Comparar» en dos o tres hoteles del listado y vuelve aquí.";
    return;
  }

  $("#cmp-wrap").hidden = false;
  $("#cmp-pie").hidden = false;

  const b = R.busqueda.leer();
  const noches = R.noches(b.entrada, b.salida);

  /* Total por la estancia con los huéspedes que el usuario ya eligió,
     usando la habitación familiar como base común de comparación. */
  function totalEstancia(h) {
    const hab = R.habitaciones(h)[1];
    return R.calcular(h, hab, b.entrada, b.salida, b.adultos, b.edades).total;
  }

  const totales = hoteles.map(totalEstancia);
  const minTotal = Math.min.apply(null, totales);
  const maxRating = Math.max.apply(null, hoteles.map(function (h) { return h.rating; }));
  const maxGratis = Math.max.apply(null, hoteles.map(function (h) { return h.gratisHasta; }));

  /* ---------- Cabecera ---------- */
  $("#cmp-head").innerHTML =
    '<tr><th scope="row" class="cmp-esq">Hotel</th>' +
    hoteles.map(function (h) {
      const d = R.destinoPorId(h.destino);
      return '<th scope="col">' +
        '<div class="cmp-media art">' + R.escena(d.tipo) +
          R.imagen(R.FOTOS_HOTEL[h.foto], "(max-width:760px) 60vw, 260px", true) + '</div>' +
        '<a class="cmp-nombre" href="hotel.html?id=' + h.id + '">' + h.nombre + '</a>' +
        '<span class="cmp-dest">' + d.nombre + ', ' + d.pais + '</span>' +
      '</th>';
    }).join("") + '</tr>';

  /* ---------- Filas ---------- */
  function fila(titulo, celdas, nota) {
    return '<tr><th scope="row">' + titulo +
      (nota ? '<span class="cmp-nota">' + nota + '</span>' : '') +
      '</th>' + celdas.join("") + '</tr>';
  }

  function celda(contenido, gana) {
    return '<td' + (gana ? ' class="gana"' : '') + '>' + contenido +
      (gana ? '<span class="cmp-tag">Mejor</span>' : '') + '</td>';
  }

  const filas = [];

  filas.push(fila("Precio por noche",
    hoteles.map(function (h) {
      return celda('<b class="cmp-precio num">USD ' + R.fmt(h.precio) + '</b>', false);
    }),
    "Habitación doble, impuestos incluidos"));

  filas.push(fila("Total de la estancia",
    hoteles.map(function (h, i) {
      return celda('<b class="cmp-precio num">USD ' + R.fmt(totales[i]) + '</b>' +
        '<span class="cmp-sub num">' + noches + (noches === 1 ? " noche" : " noches") + ' · ' +
        b.adultos + (b.adultos === 1 ? " adulto" : " adultos") +
        (b.edades.length ? " y " + b.edades.length + (b.edades.length === 1 ? " niño" : " niños") : "") +
        '</span>', totales[i] === minTotal);
    }),
    "Habitación familiar con tus fechas y huéspedes"));

  filas.push(fila("Niños gratis hasta",
    hoteles.map(function (h) {
      return celda('<b class="cmp-edad num">' + h.gratisHasta + ' años</b>', h.gratisHasta === maxGratis);
    }),
    "Edad incluida; a partir de ahí se cobra cama supletoria"));

  filas.push(fila("Categoría",
    hoteles.map(function (h) {
      return celda(R.estrellasSVG(h.estrellas) + '<span class="sr">' + h.estrellas + ' estrellas</span>', false);
    })));

  filas.push(fila("Valoración",
    hoteles.map(function (h) {
      return celda('<b class="chip-rating num">' + R.coma(h.rating) + '</b>' +
        '<span class="cmp-sub num">' + R.fmt(h.resenas) + ' reseñas</span>', h.rating === maxRating);
    }),
    "El volumen importa: un 4,8 con 300 reseñas no es un 4,8 con 3.900"));

  /* Servicios: una fila por servicio, para que el hueco se vea. */
  R.SERVICIOS.forEach(function (s) {
    filas.push(fila(s.label,
      hoteles.map(function (h) {
        const tiene = h.servicios.indexOf(s.id) !== -1;
        return celda(tiene
          ? '<span class="si-ico" aria-hidden="true">✓</span><span class="sr">Sí</span>'
          : '<span class="no-ico" aria-hidden="true">—</span><span class="sr">No</span>', false);
      })));
  });

  filas.push(fila("Playa",   hoteles.map(function (h) { return celda(h.distancias.playa, false); })));
  filas.push(fila("Centro",  hoteles.map(function (h) { return celda(h.distancias.centro, false); })));

  filas.push(fila("",
    hoteles.map(function (h) {
      return celda('<a class="btn-brand" href="hotel.html?id=' + h.id + '">Ver disponibilidad</a>', false);
    })));

  $("#cmp-body").innerHTML = filas.join("");
  R.respaldarFotos(document);

  $("#cmp-limpiar").addEventListener("click", function () {
    R.comparar.limpiar();
    window.location.href = "index.html#resultados";
  });
})();
