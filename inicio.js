/* ============================================================
   RUMBO — lógica de la página de inicio
   Depende de datos.js (window.RUMBO), que se carga antes.

   Índice:
     1. Estado
     2. Render de destinos
     3. Filtrado y render de hoteles
     4. Huéspedes
     5. Barra de comparación
     6. Eventos
     7. Arranque
   ============================================================ */
(function () {
  "use strict";

  const R = window.RUMBO;
  const $ = function (s) { return document.querySelector(s); };

  /* ---------- 1. ESTADO ---------- */
  const guardada = R.busqueda.leer();
  const estado = {
    destino: "", precioMax: 400, estrellas: [], servicios: [], orden: "recomendado",
    vista: "lista", pinSel: null,
    entrada: guardada.entrada, salida: guardada.salida,
    adultos: guardada.adultos, edades: guardada.edades.slice()
  };

  function persistirBusqueda() {
    R.busqueda.guardar({
      entrada: estado.entrada, salida: estado.salida,
      adultos: estado.adultos, edades: estado.edades
    });
  }

  /* ---------- 2. DESTINOS ---------- */
  function pintarDestinos() {
    const cont = $("#dest-grid");
    cont.innerHTML = R.DESTINOS.map(function (d) {
      return '<button class="dest" type="button" data-destino="' + d.id + '" aria-pressed="false">' +
        '<span class="art">' + R.escena(d.tipo) + R.imagen(R.FOTOS_DESTINO[d.id], "(max-width:620px) 92vw, 300px") + '</span>' +
        '<span class="dest-body">' +
          '<h3>' + d.nombre + '</h3>' +
          '<span class="dest-pais">' + d.pais + '</span>' +
          '<span class="dest-tag">' + d.tag + '</span>' +
          '<span class="dest-price"><b class="num">USD ' + d.desde + '</b><span>por noche</span></span>' +
        '</span>' +
      '</button>';
    }).join("");
    R.respaldarFotos(cont);
  }

  /* ---------- 3. HOTELES ---------- */
  function filtrar(ignorarPrecio) {
    const lista = R.HOTELES.filter(function (h) {
      if (estado.destino && h.destino !== estado.destino) return false;
      if (!ignorarPrecio && h.precio > estado.precioMax) return false;
      if (estado.estrellas.length && estado.estrellas.indexOf(h.estrellas) === -1) return false;
      if (estado.servicios.length && !estado.servicios.every(function (s) { return h.servicios.indexOf(s) !== -1; })) return false;
      return true;
    });

    const orden = estado.orden;
    lista.sort(function (a, b) {
      if (orden === "precio-asc")  return a.precio - b.precio;
      if (orden === "precio-desc") return b.precio - a.precio;
      if (orden === "rating")      return b.rating - a.rating;
      /* Recomendado: la valoración pesa más que el precio, sin ignorarlo. */
      return (b.rating * 20 - b.precio / 12) - (a.rating * 20 - a.precio / 12);
    });
    return lista;
  }

  /* ---------- Hotel patrocinado ----------
     Ocupa siempre la tercera posición, sea cual sea el orden elegido.
     Dos reglas que lo mantienen honesto:

       · Se mueve, no se añade. Sigue contando una sola vez en «16
         hoteles disponibles» y no desplaza a nadie fuera de la lista.
       · Respeta los filtros. Si no pasa el precio, la categoría o los
         servicios que el usuario puso, no aparece. Pagar coloca más
         arriba; no salta un filtro que el usuario eligió.

     La etiqueta lo dice en la propia tarjeta, no en una nota al pie:
     si hay que buscar el aviso, el aviso no está hecho para leerse. */
  const POS_PATROCINADO = 2;

  function conPatrocinado(lista) {
    const i = lista.findIndex(function (h) { return h.patrocinado; });
    if (i === -1 || i === POS_PATROCINADO || lista.length <= POS_PATROCINADO) return lista;
    const copia = lista.slice();
    copia.splice(POS_PATROCINADO, 0, copia.splice(i, 1)[0]);
    return copia;
  }

  function pintarHoteles() {
    const lista = conPatrocinado(filtrar());
    const cont = $("#hotels");
    const n = R.noches(estado.entrada, estado.salida);

    $("#conteo").innerHTML = "<b>" + lista.length + "</b> " +
      (lista.length === 1 ? "hotel disponible" : "hoteles disponibles") +
      (estado.destino ? " en " + R.destinoPorId(estado.destino).nombre : "");

    $("#titulo-resultados").textContent = estado.destino
      ? "Hoteles en " + R.destinoPorId(estado.destino).nombre
      : "Hoteles para toda la familia";

    if (!lista.length) {
      cont.innerHTML =
        '<div class="empty">' +
          '<h3>Ningún hotel cumple todos los filtros</h3>' +
          '<p>Prueba subir el precio máximo o quitar uno de los servicios. La combinación de kids club y todo incluido es la que más resultados descarta.</p>' +
        '</div>';
      return;
    }

    cont.innerHTML = lista.map(function (h) {
      const d = R.destinoPorId(h.destino);
      const marcado = R.comparar.tiene(h.id);
      const servicios = h.servicios.map(function (s) {
        const meta = R.servicioPorId(s);
        return '<span class="amenity">' + (meta ? meta.label : s) + '</span>';
      }).join("");

      return '<article class="hotel' + (h.patrocinado ? " hotel-patro" : "") + '">' +
        '<div class="art">' +
          /* La foto lleva a la ficha, igual que el nombre. Va fuera del
             orden de tabulación y oculta a los lectores de pantalla: es
             el mismo destino que el enlace del título, y anunciarlo dos
             veces solo alarga el recorrido sin aportar nada.
             El corazón y la casilla de comparar quedan fuera de este
             enlace, así que siguen funcionando por su cuenta. */
          '<a class="art-link" href="hotel.html?id=' + h.id + '" tabindex="-1" aria-hidden="true">' +
            R.escena(d.tipo) +
            R.imagen(h.fotos[0], "(max-width:620px) 92vw, 232px") +
          '</a>' +
          (h.badge ? '<span class="hotel-badge">' + h.badge + '</span>' : '') +
          '<span class="entorno">' + R.entornoDe(d.tipo) + '</span>' +
          R.favoritos.boton(h.id) +
        '</div>' +
        '<div class="hotel-main">' +
          (h.patrocinado
            ? '<p class="patro">' +
                '<span class="patro-chip">Patrocinado</span>' +
                '<span class="patro-txt">Este hotel paga por aparecer en esta posición. ' +
                  'No cambia según el orden que elijas.</span>' +
              '</p>'
            : '') +
          '<h3><a class="hotel-link" href="hotel.html?id=' + h.id + '">' + h.nombre + '</a></h3>' +
          '<p class="hotel-loc">' + d.nombre + ', ' + d.pais + ' ' + R.estrellasSVG(h.estrellas) +
            '<span class="sr">' + h.estrellas + ' estrellas</span></p>' +
          '<p class="rating"><b class="num">' + R.coma(h.rating) + '</b> ' +
            '<span class="num">' + R.fmt(h.resenas) + ' reseñas verificadas</span></p>' +
          '<p class="menores">Niños gratis hasta los ' + h.gratisHasta + ' años</p>' +
          '<div class="amenities">' + servicios + '</div>' +
        '</div>' +
        '<div class="hotel-side">' +
          '<span class="price-from">Desde</span>' +
          '<span class="price num">USD ' + h.precio + '</span>' +
          '<span class="price-unit">por noche, impuestos incluidos</span>' +
          '<a class="btn-book" href="hotel.html?id=' + h.id + '">Ver disponibilidad</a>' +
          '<span class="price-total num">USD ' + R.fmt(h.precio * n) + ' por ' + n + (n === 1 ? " noche" : " noches") + '</span>' +
          '<label class="cmp" for="cmp-' + h.id + '">' +
            '<input type="checkbox" id="cmp-' + h.id + '" data-comparar="' + h.id + '"' + (marcado ? " checked" : "") + '>' +
            'Comparar' +
          '</label>' +
        '</div>' +
      '</article>';
    }).join("");

    R.respaldarFotos(cont);

    /* Un solo punto de refresco: si la vista activa es el mapa, sus
       marcadores siguen el mismo filtro que acaba de cambiar la lista.
       Así los filtros no tienen que acordarse del mapa uno por uno. */
    if (estado.vista === "mapa") pintarMapa();
  }

  /* ---------- 3b. DISTRIBUCIÓN DE PRECIOS ----------
     El slider a secas obliga a mover a ciegas. Con la distribución
     delante se ve dónde está la oferta: cuántos hoteles hay en cada
     tramo y cuáles quedan fuera del tope elegido. Se calcula sobre
     los hoteles que ya pasan el resto de filtros, no sobre el
     catálogo entero, para que responda al contexto. */
  const TRAMOS = 8, P_MIN = 30, P_MAX = 400;

  function pintarHisto() {
    const base = filtrar(true);
    const cubos = R.distribucionPrecio(base, P_MIN, P_MAX, TRAMOS);
    const tope = Math.max(1, Math.max.apply(null, cubos.map(function (c) { return c.n; })));

    $("#histo").innerHTML = cubos.map(function (c) {
      const dentro = c.desde <= estado.precioMax;
      const vacio = c.n === 0;
      const alto = vacio ? 4 : Math.max(12, Math.round((c.n / tope) * 100));
      return '<span class="histo-barra' + (dentro ? "" : " fuera") + (vacio ? " vacio" : "") + '"' +
        ' style="height:' + alto + '%"' +
        ' title="' + c.n + (c.n === 1 ? " hotel" : " hoteles") +
          ' entre USD ' + c.desde + ' y USD ' + c.hasta + '"></span>';
    }).join("");

    const dentro = base.filter(function (h) { return h.precio <= estado.precioMax; }).length;
    const fuera = base.length - dentro;
    $("#histo-resumen").textContent = fuera === 0
      ? "Todos los hoteles entran en este tope."
      : fuera + (fuera === 1 ? " hotel queda" : " hoteles quedan") + " fuera del tope.";
  }

  /* ---------- 3c. VISTA DE MAPA ----------
     Mapa ilustrado, no cartografía real: sitúa los hoteles entre sí y
     respecto a los tres puntos que importan con niños. Sin librerías
     ni peticiones externas. El mapa necesita un destino: mezclar
     hoteles de ocho países en un mismo plano no querría decir nada. */
  function pintarMapaEsquematico() {
    const cont = $("#mapa-vista");

    if (!estado.destino) {
      cont.innerHTML =
        '<div class="empty">' +
          '<h3>Elige un destino para ver el mapa</h3>' +
          '<p>El mapa sitúa los hoteles de una misma ciudad. Con ocho destinos a la vez no habría nada que situar.</p>' +
          '<div class="mapa-picks">' +
            R.DESTINOS.map(function (d) {
              return '<button class="chip" type="button" data-pick="' + d.id + '">' + d.nombre + '</button>';
            }).join("") +
          '</div>' +
        '</div>';
      return;
    }

    const d = R.destinoPorId(estado.destino);
    const lista = filtrar();
    const lugares = R.LUGARES[d.tipo] || R.LUGARES.costa;

    const marcas = lugares.map(function (l) {
      return '<span class="hito" style="left:' + l.x + '%;top:' + ((l.y / 64) * 100) + '%">' +
        '<span class="hito-ico">' + R.iconoLugar(l.icono) + '</span>' +
        '<span class="hito-txt">' + l.label + '</span></span>';
    }).join("");

    const pines = lista.map(function (h) {
      const sel = estado.pinSel === h.id;
      return '<button class="pin' + (sel ? " pin-sel" : "") + '" type="button" data-pin="' + h.id + '"' +
        ' style="left:' + h.mapa.x + '%;top:' + ((h.mapa.y / 64) * 100) + '%"' +
        ' aria-pressed="' + sel + '">' +
        '<span class="num">USD ' + h.precio + '</span></button>';
    }).join("");

    const elegido = estado.pinSel ? R.hotelPorId(estado.pinSel) : null;
    let tarjeta = "";
    if (elegido && lista.indexOf(elegido) !== -1) {
      /* La ficha se ancla al lado contrario del pin para no taparlo. */
      const derecha = elegido.mapa.x > 55;
      tarjeta =
        '<div class="pin-card' + (derecha ? " pin-card-izq" : "") + '"' +
          ' style="left:' + elegido.mapa.x + '%;top:' + ((elegido.mapa.y / 64) * 100) + '%">' +
          '<button class="pin-card-x" type="button" data-cerrar-pin aria-label="Cerrar">×</button>' +
          '<div class="pin-card-art art">' + R.escena(d.tipo) +
            R.imagen(elegido.fotos[0], "200px") + '</div>' +
          '<div class="pin-card-txt">' +
            '<b>' + elegido.nombre + '</b>' +
            '<span class="pin-card-meta"><span class="chip-rating num">' + R.coma(elegido.rating) + '</span>' +
              elegido.estrellas + '★ · niños gratis hasta ' + elegido.gratisHasta + '</span>' +
            '<span class="pin-card-precio num">USD ' + elegido.precio + ' <small>por noche</small></span>' +
            '<a class="btn-brand" href="hotel.html?id=' + elegido.id + '">Ver disponibilidad</a>' +
          '</div>' +
        '</div>';
    }

    cont.innerHTML =
      '<div class="mapa-caja">' +
        '<svg class="mapa-svg" viewBox="0 0 100 64" preserveAspectRatio="none"' +
          ' role="img" aria-label="Mapa esquemático de ' + d.nombre + ' con ' + lista.length + ' hoteles">' +
          R.mapaBase(d.tipo) +
        '</svg>' +
        marcas + pines + tarjeta +
      '</div>' +
      '<p class="mapa-nota">Mapa esquemático: las posiciones son relativas, no coordenadas reales. ' +
        lista.length + (lista.length === 1 ? " hotel" : " hoteles") + ' en ' + d.nombre + '.</p>';

    R.respaldarFotos(cont);
  }

  /* ---------- 4b. MAPA REAL (Leaflet + OpenStreetMap) ----------
     Un solo mapa para toda la vida de la página: crearlo y destruirlo
     en cada repintado perdería el encuadre que el usuario acaba de
     ajustar, y Leaflet deja escuchas sueltas si se recrea a menudo.
     Solo se reemplazan los marcadores.

     Los hoteles son inventados: la coordenada los reparte alrededor
     del centro real de su ciudad, no señala ningún edificio. */
  let mapa = null, capaPines = null;

  function hayLeaflet() { return typeof window.L !== "undefined"; }

  function crearMapa() {
    const caja = $("#mapa-lienzo");
    mapa = window.L.map(caja, { scrollWheelZoom: false });
    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapa);
    capaPines = window.L.layerGroup().addTo(mapa);

    /* El zoom con rueda se activa al hacer clic: si no, al bajar por
       la página el cursor cae sobre el mapa y se lleva el scroll. */
    mapa.on("focus click", function () { mapa.scrollWheelZoom.enable(); });
    mapa.on("blur", function () { mapa.scrollWheelZoom.disable(); });
  }

  function pinDe(h) {
    /* El precio va en el propio marcador: es el dato por el que se
       compara de un vistazo, y obliga a abrir menos globos. */
    return window.L.divIcon({
      className: "",
      html: '<span class="lpin' + (estado.pinSel === h.id ? " lpin-sel" : "") +
            '"><span class="num">USD ' + h.precio + '</span></span>',
      iconSize: null,
      iconAnchor: [0, 0]
    });
  }

  function globoDe(h, d) {
    return '<div class="lpop">' +
      '<b class="lpop-nom">' + h.nombre + '</b>' +
      '<span class="lpop-loc">' + d.nombre + ', ' + d.pais + '</span>' +
      '<span class="lpop-meta"><b class="chip-rating num">' + R.coma(h.rating) + '</b> ' +
        h.estrellas + '★ · niños gratis hasta los ' + h.gratisHasta + '</span>' +
      '<span class="lpop-precio">Desde <b class="num">USD ' + h.precio + '</b> por noche</span>' +
      '<a class="btn-brand" href="hotel.html?id=' + h.id + '">Ver disponibilidad</a>' +
    '</div>';
  }

  function pintarMapa() {
    /* Sin Leaflet (sin conexión, CDN bloqueado) queda el plano
       esquemático, que no necesita red. */
    if (!hayLeaflet()) { pintarMapaEsquematico(); return; }

    const cont = $("#mapa-vista");
    const lista = filtrar();

    if (!cont.querySelector("#mapa-lienzo")) {
      cont.innerHTML =
        '<div class="mapa-lienzo" id="mapa-lienzo" role="application" aria-label="Mapa de los hoteles"></div>' +
        '<p class="mapa-nota" id="mapa-nota"></p>';
    }
    if (!mapa) crearMapa();

    capaPines.clearLayers();
    const puntos = [];

    lista.forEach(function (h) {
      const c = R.coordenadas(h);
      if (!c) return;
      const d = R.destinoPorId(h.destino);
      puntos.push([c.lat, c.lng]);
      window.L.marker([c.lat, c.lng], { icon: pinDe(h), title: h.nombre, alt: h.nombre })
        .bindPopup(globoDe(h, d), { minWidth: 210 })
        .on("popupopen", function () { estado.pinSel = h.id; })
        .on("popupclose", function () { estado.pinSel = null; })
        .addTo(capaPines);
    });

    /* El contenedor estaba oculto mientras se veía la lista, así que
       Leaflet midió cero: sin esto el mapa sale en blanco. */
    mapa.invalidateSize();

    if (puntos.length > 1) {
      mapa.fitBounds(puntos, { padding: [40, 40], maxZoom: 14 });
    } else if (puntos.length === 1) {
      mapa.setView(puntos[0], 13);
    } else {
      mapa.setView([-8, -75], 3);   /* sin resultados: vista continental */
    }

    const d = estado.destino ? R.destinoPorId(estado.destino) : null;
    $("#mapa-nota").textContent = !lista.length
      ? "Ningún hotel pasa los filtros actuales, así que el mapa está vacío."
      : lista.length + (lista.length === 1 ? " hotel" : " hoteles") +
        (d ? " en " + d.nombre : " en los ocho destinos") +
        ". Las ciudades son reales; los hoteles son inventados y su posición es aproximada.";
  }

  function pintarVista() {
    const esMapa = estado.vista === "mapa";
    $("#hotels").hidden = esMapa;
    $("#mapa-vista").hidden = !esMapa;
    document.querySelectorAll("[data-vista]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.vista === estado.vista));
    });
    if (esMapa) pintarMapa();
  }

  /* ---------- 4. HUÉSPEDES ---------- */
  function pintarEdades() {
    const grid = $("#ages-grid");
    $("#ages-block").hidden = estado.edades.length === 0;
    grid.innerHTML = estado.edades.map(function (edad, i) {
      let opts = "";
      for (let a = 0; a <= 17; a++) {
        opts += '<option value="' + a + '"' + (a === edad ? " selected" : "") + '>' +
          (a === 0 ? "menos de 1" : a + (a === 1 ? " año" : " años")) + '</option>';
      }
      return '<select id="edad-' + i + '" data-edad="' + i + '" aria-label="Edad del niño ' + (i + 1) + '">' + opts + '</select>';
    }).join("");
  }

  function pintarHuespedes() {
    const a = estado.adultos, n = estado.edades.length;
    $("#out-adultos").textContent = a;
    $("#out-ninos").textContent = n;
    $("#guest-label").textContent =
      a + (a === 1 ? " adulto" : " adultos") +
      (n > 0 ? " · " + n + (n === 1 ? " niño" : " niños") : "");
    /* El stepper se deshabilita en el límite en vez de aceptar el
       clic y no hacer nada: el control dice lo que puede hacer. */
    document.querySelectorAll("[data-step]").forEach(function (b) {
      const k = b.dataset.step, dir = +b.dataset.dir;
      const v = k === "adultos" ? estado.adultos : estado.edades.length;
      b.disabled = dir < 0 ? (k === "adultos" ? v <= 1 : v <= 0) : v >= (k === "adultos" ? 8 : 6);
    });
    pintarEdades();
    persistirBusqueda();
  }

  /* ---------- 5. BARRA DE COMPARACIÓN ---------- */
  function pintarBarraComparar() {
    const lista = R.comparar.listar();
    const barra = $("#compare-bar");
    barra.hidden = lista.length === 0;
    document.body.classList.toggle("con-barra", lista.length > 0);
    $("#compare-n").textContent = lista.length;
    $("#compare-lbl").textContent = lista.length === 1 ? "hotel seleccionado" : "hoteles seleccionados";
    /* Con un solo hotel no hay nada que comparar: el enlace se apaga
       en vez de llevar a una página que no dice nada. */
    const ir = $("#compare-go");
    if (lista.length < 2) {
      ir.setAttribute("aria-disabled", "true");
      ir.removeAttribute("href");
      ir.textContent = "Elige uno más";
    } else {
      ir.removeAttribute("aria-disabled");
      ir.href = "comparar.html?ids=" + lista.join(",");
      ir.textContent = "Comparar " + lista.length;
    }
    document.querySelectorAll("[data-comparar]").forEach(function (cb) {
      const marcado = lista.indexOf(Number(cb.dataset.comparar)) !== -1;
      cb.checked = marcado;
      cb.disabled = !marcado && lista.length >= R.MAX_COMPARAR;
    });
  }

  function marcarDestinos() {
    document.querySelectorAll(".dest").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.destino === estado.destino));
    });
  }

  function pintarServicios() {
    $("#f-servicios").innerHTML = R.SERVICIOS.map(function (s) {
      return '<label class="check" for="sv-' + s.id + '">' +
        '<input type="checkbox" id="sv-' + s.id + '" value="' + s.id + '">' + s.label +
      '</label>';
    }).join("");
  }

  function sincronizarSelect() {
    $("#f-destino").innerHTML = '<option value="">Todos los destinos</option>' +
      R.DESTINOS.map(function (d) {
        return '<option value="' + d.id + '">' + d.nombre + ", " + d.pais + '</option>';
      }).join("");
  }

  /* ---------- 6. EVENTOS ---------- */
  function conectar() {
    $("#dest-grid").addEventListener("click", function (e) {
      const b = e.target.closest(".dest");
      if (!b) return;
      estado.destino = (estado.destino === b.dataset.destino) ? "" : b.dataset.destino;
      $("#f-destino").value = estado.destino;
      marcarDestinos();
      pintarHoteles();
      pintarBarraComparar();
      pintarHisto();
      pintarVista();
      document.getElementById("resultados").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("#f-destino").addEventListener("change", function (e) {
      estado.destino = e.target.value;
      marcarDestinos();
      pintarHoteles();
      pintarBarraComparar();
      pintarHisto();
      pintarVista();
    });

    $("#form-busqueda").addEventListener("submit", function (e) {
      e.preventDefault();
      $("#guest-pop").hidden = true;
      $("#f-huespedes").setAttribute("aria-expanded", "false");
      persistirBusqueda();
      pintarHoteles();
      pintarBarraComparar();
      pintarHisto();
      pintarVista();
      document.getElementById("resultados").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const btnG = $("#f-huespedes"), pop = $("#guest-pop");
    btnG.addEventListener("click", function () {
      const abierto = !pop.hidden;
      pop.hidden = abierto;
      btnG.setAttribute("aria-expanded", String(!abierto));
    });
    document.addEventListener("click", function (e) {
      if (!pop.hidden && !pop.contains(e.target) && !btnG.contains(e.target)) {
        pop.hidden = true;
        btnG.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !pop.hidden) {
        pop.hidden = true;
        btnG.setAttribute("aria-expanded", "false");
        btnG.focus();
      }
    });
    pop.addEventListener("click", function (e) {
      const b = e.target.closest("[data-step]");
      if (!b) return;
      const k = b.dataset.step, dir = +b.dataset.dir;
      if (k === "adultos") {
        estado.adultos = Math.min(8, Math.max(1, estado.adultos + dir));
      } else if (dir > 0) {
        if (estado.edades.length < 6) estado.edades.push(7);
      } else {
        estado.edades.pop();
      }
      pintarHuespedes();
      pintarHoteles();
    });
    pop.addEventListener("change", function (e) {
      const s = e.target.closest("[data-edad]");
      if (!s) return;
      estado.edades[+s.dataset.edad] = +s.value;
      persistirBusqueda();
    });

    $("#f-precio").addEventListener("input", function (e) {
      estado.precioMax = +e.target.value;
      $("#precio-val").textContent = "USD " + estado.precioMax;
      pintarHoteles();
      pintarBarraComparar();
      pintarHisto();
      pintarVista();
    });

    $("#f-estrellas").addEventListener("click", function (e) {
      const c = e.target.closest(".chip");
      if (!c) return;
      const v = +c.dataset.estrellas;
      const on = c.getAttribute("aria-pressed") === "true";
      c.setAttribute("aria-pressed", String(!on));
      estado.estrellas = on
        ? estado.estrellas.filter(function (x) { return x !== v; })
        : estado.estrellas.concat(v);
      pintarHoteles();
      pintarBarraComparar();
      pintarHisto();
      pintarVista();
    });

    $("#f-servicios").addEventListener("change", function (e) {
      const cb = e.target;
      if (cb.type !== "checkbox") return;
      estado.servicios = cb.checked
        ? estado.servicios.concat(cb.value)
        : estado.servicios.filter(function (x) { return x !== cb.value; });
      pintarHoteles();
      pintarBarraComparar();
      pintarHisto();
      pintarVista();
    });

    $("#f-orden").addEventListener("change", function (e) {
      estado.orden = e.target.value;
      pintarHoteles();
      pintarBarraComparar();
      pintarHisto();
      pintarVista();
    });

    $("#btn-reset").addEventListener("click", function () {
      estado.destino = ""; estado.precioMax = 400;
      estado.estrellas = []; estado.servicios = []; estado.orden = "recomendado";
      $("#f-destino").value = "";
      $("#f-precio").value = 400;
      $("#precio-val").textContent = "USD 400";
      $("#f-orden").value = "recomendado";
      document.querySelectorAll("#f-estrellas .chip").forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
      document.querySelectorAll('#f-servicios input[type="checkbox"]').forEach(function (c) { c.checked = false; });
      marcarDestinos();
      pintarHoteles();
      pintarBarraComparar();
      pintarHisto();
      pintarVista();
    });

    /* Comparación: la casilla vive en la tarjeta, el resumen en la barra. */
    $("#hotels").addEventListener("change", function (e) {
      const cb = e.target.closest("[data-comparar]");
      if (!cb) return;
      const r = R.comparar.alternar(cb.dataset.comparar);
      if (!r.ok) { cb.checked = false; }
      pintarBarraComparar();
    });

    /* Alternador Lista / Mapa */
    document.querySelector(".vista-toggle").addEventListener("click", function (e) {
      const b = e.target.closest("[data-vista]");
      if (!b) return;
      estado.vista = b.dataset.vista;
      estado.pinSel = null;
      pintarVista();
    });

    /* Mapa: los marcadores de Leaflet se gestionan solos; esto solo
       atiende al plano de respaldo y a los atajos de destino. */
    $("#mapa-vista").addEventListener("click", function (e) {
      const pin = e.target.closest("[data-pin]");
      if (pin) {
        const id = Number(pin.dataset.pin);
        estado.pinSel = (estado.pinSel === id) ? null : id;
        pintarMapa();
        return;
      }
      if (e.target.closest("[data-cerrar-pin]")) {
        estado.pinSel = null;
        pintarMapa();
        return;
      }
      const pick = e.target.closest("[data-pick]");
      if (pick) {
        estado.destino = pick.dataset.pick;
        $("#f-destino").value = estado.destino;
        marcarDestinos();
        pintarHoteles();
        pintarBarraComparar();
        pintarHisto();
        pintarVista();
      }
    });

    $("#compare-clear").addEventListener("click", function () {
      R.comparar.limpiar();
      pintarBarraComparar();
    });

    $("#compare-go").addEventListener("click", function (e) {
      if (this.getAttribute("aria-disabled") === "true") e.preventDefault();
    });

    /* Fechas */
    const eIn = $("#f-entrada"), eOut = $("#f-salida");
    eIn.addEventListener("change", function () {
      eOut.min = eIn.value;
      if (eOut.value <= eIn.value) {
        eOut.value = R.isoHoy(0);
        eOut.value = new Date(new Date(eIn.value).getTime() + 864e5).toISOString().slice(0, 10);
      }
      estado.entrada = eIn.value; estado.salida = eOut.value;
      persistirBusqueda();
      pintarHoteles();
    });
    eOut.addEventListener("change", function () {
      estado.salida = eOut.value;
      persistirBusqueda();
      pintarHoteles();
    });
  }

  function fechasIniciales() {
    const eIn = $("#f-entrada"), eOut = $("#f-salida");
    eIn.value = estado.entrada; eIn.min = R.isoHoy(0);
    eOut.value = estado.salida; eOut.min = estado.entrada;
  }

  /* ---------- 7. ARRANQUE ---------- */
  sincronizarSelect();
  pintarServicios();
  pintarDestinos();
  pintarHuespedes();
  pintarHoteles();
  pintarBarraComparar();
  pintarHisto();
  pintarVista();
  fechasIniciales();
  conectar();
  R.pintarContadorReservas();
  /* Cubre la foto del hero, que está en el HTML y no la pinta el script. */
  R.respaldarFotos(document);
})();
