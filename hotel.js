/* ============================================================
   RUMBO — ficha del hotel y reserva
   Lee el id del hotel de la URL (hotel.html?id=5). Depende de
   datos.js.

   Índice:
     1. Resolver el hotel
     2. Pintar la ficha
     3. Caja de reserva
     4. Desglose de precio
     5. Confirmación
     6. Eventos
   ============================================================ */
(function () {
  "use strict";

  const R = window.RUMBO;
  const $ = function (s) { return document.querySelector(s); };

  /* ---------- 1. RESOLVER EL HOTEL ---------- */
  const hotel = R.hotelPorId(R.parametro("id"));

  R.pintarContadorReservas();

  if (!hotel) {
    /* Un id inválido no debe dejar la página en blanco: se explica
       qué pasó y se ofrece la salida. */
    $("#no-encontrado").hidden = false;
    document.title = "Hotel no encontrado — Rumbo";
    return;
  }

  const destino = R.destinoPorId(hotel.destino);
  const habs = R.habitaciones(hotel);
  $("#ficha").hidden = false;
  document.title = hotel.nombre + " — Rumbo";

  /* ---------- 2. PINTAR LA FICHA ---------- */
  function pintarFicha() {
    $("#crumb-destino").textContent = destino.nombre;
    $("#crumb-hotel").textContent = hotel.nombre;

    pintarGaleria();

    $("#hh-destino").textContent = destino.nombre + ", " + destino.pais;
    $("#hh-nombre").textContent = hotel.nombre;
    $("#hh-meta").innerHTML =
      R.estrellasSVG(hotel.estrellas) +
      '<span class="sr">' + hotel.estrellas + ' estrellas</span>' +
      '<span class="hh-sep">·</span><b class="chip-rating num">' + R.coma(hotel.rating) + '</b>' +
      '<span class="num">' + R.fmt(hotel.resenas) + ' reseñas verificadas</span>';
    $("#hh-desc").textContent = hotel.descripcion;

    /* Política de menores */
    const camaExtra = Math.round(habs[1].precio * 0.28);
    $("#menores-lead").textContent =
      "En este hotel los niños no pagan hasta los " + hotel.gratisHasta +
      " años, incluidos. A partir de esa edad se cobra una cama supletoria.";
    $("#menores-lista").innerHTML = [
      "De 0 a " + hotel.gratisHasta + " años: sin costo, comparten habitación con los adultos",
      "De " + (hotel.gratisHasta + 1) + " a 17 años: cama supletoria desde USD " + R.fmt(camaExtra) + " por noche",
      hotel.servicios.indexOf("cuna") !== -1
        ? "Cuna sin costo, sujeta a disponibilidad al reservar"
        : "Este hotel no ofrece cuna: hay que llevarla o alquilarla aparte",
      "La edad se cuenta a la fecha de entrada, no a la de reserva"
    ].map(function (t) { return "<li>" + t + "</li>"; }).join("");

    /* Distancias */
    $("#distancias").innerHTML = [
      ["Playa", hotel.distancias.playa],
      ["Centro", hotel.distancias.centro],
      ["Aeropuerto", hotel.distancias.aeropuerto]
    ].map(function (d) {
      return "<div class='dist-row'><dt>" + d[0] + "</dt><dd>" + d[1] + "</dd></div>";
    }).join("");

    /* Servicios: se listan todos y se marca cuáles tiene, porque una
       lista solo con lo que hay esconde lo que falta. */
    $("#servicios-lista").innerHTML = R.SERVICIOS.map(function (s) {
      const tiene = hotel.servicios.indexOf(s.id) !== -1;
      return '<li class="' + (tiene ? "si" : "no") + '">' + s.label +
        (tiene ? "" : ' <span class="no-txt">no disponible</span>') + '</li>';
    }).join("");

    $("#hh-acciones").innerHTML = R.favoritos.boton(hotel.id, true);

    $("#val-num").textContent = R.coma(hotel.rating);
    $("#val-txt").textContent =
      R.fmt(hotel.resenas) + " reseñas verificadas de familias que ya se alojaron aquí.";
    pintarNotas();

    R.respaldarFotos(document);
  }

  /* ---------- Galería ----------
     Una foto grande y una tira de miniaturas. La miniatura activa se
     marca con aria-selected, no solo con el borde, y cada foto lleva
     su pie: una galería sin rótulos obliga a adivinar qué se mira. */
  let iFoto = 0;

  function pintarGaleria() {
    const principal = $("#gal-principal");
    const clave = hotel.fotos[iFoto];

    principal.innerHTML =
      R.escena(destino.tipo) +
      R.imagen(clave, "(max-width:900px) 100vw, 760px", true) +
      (hotel.badge ? '<span class="hotel-badge">' + hotel.badge + '</span>' : "") +
      '<span class="entorno">' + R.entornoDe(destino.tipo) + '</span>' +
      '<span class="gal-pie">' + R.pieDeFoto(clave) +
        '<span class="gal-cuenta num">' + (iFoto + 1) + ' / ' + hotel.fotos.length + '</span></span>';

    $("#gal-tiras").innerHTML = hotel.fotos.map(function (c, i) {
      return '<button class="gal-mini art" type="button" role="tab" data-foto="' + i + '"' +
        ' aria-selected="' + (i === iFoto) + '" aria-label="' + R.pieDeFoto(c) + '">' +
        R.escena(destino.tipo) + R.imagen(c, "120px") + '</button>';
    }).join("");

    R.respaldarFotos(document);
  }

  function irAFoto(i) {
    const n = hotel.fotos.length;
    iFoto = (i + n) % n;
    pintarGaleria();
    if (!$("#visor").hidden) pintarVisor();
  }

  /* ---------- Visor ---------- */
  let focoPrevio = null;

  function pintarVisor() {
    const clave = hotel.fotos[iFoto];
    $("#visor-media").innerHTML = R.escena(destino.tipo) + R.imagen(clave, "90vw", true);
    $("#visor-pie").innerHTML = R.pieDeFoto(clave) +
      ' <span class="num">· ' + (iFoto + 1) + ' de ' + hotel.fotos.length + '</span>';
    R.respaldarFotos($("#visor"));
  }

  function abrirVisor() {
    focoPrevio = document.activeElement;
    $("#visor").hidden = false;
    document.body.classList.add("sin-scroll");
    pintarVisor();
    $("#visor-cerrar").focus();
  }

  function cerrarVisor() {
    $("#visor").hidden = true;
    document.body.classList.remove("sin-scroll");
    if (focoPrevio) focoPrevio.focus();
  }

  /* ---------- Reseñas por categoría ----------
     El número general dice cuánto gusta; el desglose dice por qué.
     Las barras se miden sobre 5 y llevan el valor en texto al lado,
     porque una barra sin cifra no se puede comparar entre hoteles. */
  function pintarNotas() {
    $("#notas").innerHTML = R.CATEGORIAS.map(function (c) {
      const v = hotel.notas[c.id];
      const pct = Math.round((v / 5) * 100);
      return '<div class="nota-fila">' +
        '<dt>' + c.label + '</dt>' +
        '<dd>' +
          '<span class="nota-barra"><span class="nota-relleno" style="width:' + pct + '%"></span></span>' +
          '<b class="num">' + R.coma(v) + '</b>' +
        '</dd>' +
      '</div>';
    }).join("");
  }

  /* ---------- 3. CAJA DE RESERVA ---------- */
  const b = R.busqueda.leer();

  /* La habitación por defecto no es siempre la familiar: es la más
     pequeña donde cabe el grupo que trae el usuario. Llegar a una
     ficha y encontrarse el botón bloqueado es una mala bienvenida. */
  function masPequenaQueCabe(ocupantes) {
    const cabe = habs.find(function (h) { return h.capacidad >= ocupantes; });
    return (cabe || habs[habs.length - 1]).id;
  }

  const estado = {
    entrada: b.entrada, salida: b.salida,
    adultos: b.adultos, edades: b.edades.slice(),
    habitacion: masPequenaQueCabe(b.adultos + b.edades.length),
    reajustada: false
  };

  function persistir() {
    R.busqueda.guardar({
      entrada: estado.entrada, salida: estado.salida,
      adultos: estado.adultos, edades: estado.edades
    });
  }

  function habitacionActual() {
    return habs.find(function (h) { return h.id === estado.habitacion; });
  }

  function pintarEdades() {
    $("#r-ages-block").hidden = estado.edades.length === 0;
    $("#r-ages-grid").innerHTML = estado.edades.map(function (edad, i) {
      let opts = "";
      for (let a = 0; a <= 17; a++) {
        opts += '<option value="' + a + '"' + (a === edad ? " selected" : "") + '>' +
          (a === 0 ? "menos de 1" : a + (a === 1 ? " año" : " años")) + '</option>';
      }
      return '<select id="r-edad-' + i + '" data-edad="' + i + '" aria-label="Edad del niño ' + (i + 1) + '">' + opts + '</select>';
    }).join("");
  }

  function pintarHuespedes() {
    $("#r-out-adultos").textContent = estado.adultos;
    $("#r-out-ninos").textContent = estado.edades.length;
    document.querySelectorAll("[data-step]").forEach(function (btn) {
      const k = btn.dataset.step, dir = +btn.dataset.dir;
      const v = k === "adultos" ? estado.adultos : estado.edades.length;
      btn.disabled = dir < 0 ? (k === "adultos" ? v <= 1 : v <= 0) : v >= (k === "adultos" ? 8 : 6);
    });
    pintarEdades();
  }

  function pintarHabitaciones() {
    const ocupantes = estado.adultos + estado.edades.length;
    $("#r-habs").innerHTML = habs.map(function (h) {
      /* Una habitación que no da para el grupo se deshabilita en vez
         de dejar reservar algo que no cabe. */
      const cabe = h.capacidad >= ocupantes;
      const sel = h.id === estado.habitacion;
      return '<label class="hab' + (cabe ? "" : " hab-no") + '" for="hab-' + h.id + '">' +
        '<input type="radio" name="habitacion" id="hab-' + h.id + '" value="' + h.id + '"' +
          (sel ? " checked" : "") + (cabe ? "" : " disabled") + '>' +
        '<span class="hab-cuerpo">' +
          '<span class="hab-nombre">' + h.nombre + '</span>' +
          '<span class="hab-camas">' + h.camas + ' · hasta ' + h.capacidad + ' personas</span>' +
          '<span class="hab-nota">' + (cabe ? h.incluye : "No alcanza para " + ocupantes + " personas") + '</span>' +
        '</span>' +
        '<span class="hab-precio num">USD ' + R.fmt(h.precio) + '<small>por noche</small></span>' +
      '</label>';
    }).join("");
  }

  /* ---------- 4. DESGLOSE ---------- */
  function pintarDesglose() {
    const hab = habitacionActual();
    const c = R.calcular(hotel, hab, estado.entrada, estado.salida, estado.adultos, estado.edades);

    $("#desglose").innerHTML = c.lineas.map(function (l) {
      return '<li class="' + (l.gratis ? "gratis" : "") + '">' +
        '<div><span class="dg-con">' + l.concepto + '</span>' +
        '<span class="dg-det">' + l.detalle + '</span></div>' +
        '<b class="num">' + (l.importe === 0 ? "Gratis" : "USD " + R.fmt(l.importe)) + '</b>' +
      '</li>';
    }).join("");

    $("#r-total").textContent = "USD " + R.fmt(c.total);

    /* Aviso que explica la consecuencia de la edad, que es el dato
       que casi ningún buscador enseña antes del pago. */
    const aviso = $("#r-aviso");
    const ocupantes = estado.adultos + estado.edades.length;
    if (ocupantes > hab.capacidad) {
      aviso.hidden = false;
      aviso.className = "r-aviso error";
      aviso.textContent = "Sois " + ocupantes + " personas y la habitación más grande de este hotel admite " +
        hab.capacidad + ". Habría que reservar dos habitaciones.";
    } else if (estado.reajustada) {
      aviso.hidden = false;
      aviso.className = "r-aviso bien";
      aviso.textContent = "Cambiamos a " + hab.nombre.toLowerCase() + " porque sois " + ocupantes +
        " y la anterior no alcanzaba. Puedes elegir otra si prefieres.";
    } else if (c.menoresQuePagan > 0) {
      aviso.hidden = false;
      aviso.className = "r-aviso";
      aviso.textContent = c.menoresQuePagan === 1
        ? "Un menor supera los " + hotel.gratisHasta + " años y por eso paga cama supletoria."
        : c.menoresQuePagan + " menores superan los " + hotel.gratisHasta + " años y por eso pagan cama supletoria.";
    } else if (estado.edades.length > 0) {
      aviso.hidden = false;
      aviso.className = "r-aviso bien";
      aviso.textContent = estado.edades.length === 1
        ? "El menor no paga: está dentro de la edad gratuita de este hotel."
        : "Ningún menor paga: todos están dentro de la edad gratuita de este hotel.";
    } else {
      aviso.hidden = true;
    }

    $("#btn-confirmar").disabled = ocupantes > hab.capacidad;
    return c;
  }

  function repintar() {
    /* Si al cambiar los huéspedes la habitación elegida se queda
       corta, se sube sola a la más pequeña que sí alcance y se avisa.
       Mejor eso que dejar al usuario frente a un botón muerto. */
    const ocupantes = estado.adultos + estado.edades.length;
    const actual = habitacionActual();
    estado.reajustada = false;
    if (actual && actual.capacidad < ocupantes) {
      const sugerida = masPequenaQueCabe(ocupantes);
      if (sugerida !== estado.habitacion) {
        estado.habitacion = sugerida;
        estado.reajustada = true;
      }
    }
    pintarHuespedes();
    pintarHabitaciones();
    pintarDesglose();
    persistir();
  }

  /* ---------- 5. CONFIRMACIÓN ---------- */
  function confirmar() {
    /* Las reservas pertenecen a una cuenta. Sin sesión se abre la ventana
       de acceso y, al entrar, la reserva sigue donde se quedó. */
    if (!R.auth.usuario()) {
      R.auth.abrir({ modo: "crear", motivo: "Un paso antes de reservar", alEntrar: confirmar });
      return;
    }

    const hab = habitacionActual();
    const c = R.calcular(hotel, hab, estado.entrada, estado.salida, estado.adultos, estado.edades);
    const error = $("#r-error");
    error.hidden = true;
    $("#btn-confirmar").disabled = true;

    R.reservas.crear({
      hotelId: hotel.id,
      habitacion: hab.nombre,
      entrada: estado.entrada,
      salida: estado.salida,
      noches: c.noches,
      adultos: estado.adultos,
      edades: estado.edades.slice(),
      total: c.total
    }).then(function (reserva) {
      mostrarConfirmacion(reserva, hab, c);
    }, function (e) {
      error.textContent = "No se pudo guardar la reserva: " + e.message;
      error.hidden = false;
      pintarDesglose();   /* devuelve el botón a su estado según la capacidad */
    });
  }

  function mostrarConfirmacion(reserva, hab, c) {
    $("#ok-codigo").textContent = reserva.codigo;
    $("#ok-resumen").innerHTML = [
      ["Hotel", hotel.nombre],
      ["Habitación", hab.nombre],
      ["Fechas", R.fechaLarga(estado.entrada) + " → " + R.fechaLarga(estado.salida) + " · " + c.noches + (c.noches === 1 ? " noche" : " noches")],
      ["Huéspedes", estado.adultos + (estado.adultos === 1 ? " adulto" : " adultos") +
        (estado.edades.length ? " y " + estado.edades.length + (estado.edades.length === 1 ? " niño" : " niños") : "")],
      ["Total", "USD " + R.fmt(c.total)]
    ].map(function (r) {
      return "<li><span>" + r[0] + "</span><b>" + r[1] + "</b></li>";
    }).join("");

    $("#reserva-form").hidden = true;
    $("#reserva-ok").hidden = false;
    R.pintarContadorReservas();
    $("#reserva-ok").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ---------- 5b. TAMBIÉN TE PUEDE INTERESAR ----------
     Mismo destino primero, porque quien mira Cusco no salta a Cancún.
     Si el destino no da para tres, se completa con precio parecido
     (±30%): es el otro eje por el que se compara de verdad. No hay
     urgencia inventada ni «quedan pocas habitaciones». */
  const SIMILARES = 3;

  function similares() {
    const otros = R.HOTELES.filter(function (h) { return h.id !== hotel.id; });

    const mismoDestino = otros
      .filter(function (h) { return h.destino === hotel.destino; })
      .sort(function (a, b) { return b.rating - a.rating; });

    const margen = hotel.precio * 0.3;
    const precioParecido = otros
      .filter(function (h) {
        return h.destino !== hotel.destino && Math.abs(h.precio - hotel.precio) <= margen;
      })
      .sort(function (a, b) {
        return Math.abs(a.precio - hotel.precio) - Math.abs(b.precio - hotel.precio);
      });

    return mismoDestino.concat(precioParecido).slice(0, SIMILARES);
  }

  function pintarSimilares() {
    const lista = similares();
    if (!lista.length) return;

    $("#sim-grid").innerHTML = lista.map(function (h) {
      const d = R.destinoPorId(h.destino);
      const mismo = h.destino === hotel.destino;
      return '<article class="sim">' +
        '<a class="sim-art art" href="hotel.html?id=' + h.id + '" aria-label="' + h.nombre + '">' +
          R.escena(d.tipo) + R.imagen(h.fotos[0], "(max-width:760px) 92vw, 300px") +
          '<span class="entorno">' + R.entornoDe(d.tipo) + '</span>' +
        '</a>' +
        R.favoritos.boton(h.id) +
        '<div class="sim-cuerpo">' +
          '<h3><a href="hotel.html?id=' + h.id + '">' + h.nombre + '</a></h3>' +
          '<p class="sim-loc">' + d.nombre + ', ' + d.pais + '</p>' +
          '<p class="sim-por">' + (mismo ? "En el mismo destino" : "Precio parecido") + '</p>' +
          '<p class="sim-precio"><b class="num">USD ' + h.precio + '</b> ' +
            '<span>por noche · niños gratis hasta los ' + h.gratisHasta + '</span></p>' +
        '</div>' +
      '</article>';
    }).join("");

    $("#similares").hidden = false;
    R.respaldarFotos($("#similares"));
  }

  /* ---------- 6. EVENTOS ---------- */
  function conectar() {
    const eIn = $("#r-entrada"), eOut = $("#r-salida");
    eIn.value = estado.entrada; eIn.min = R.isoHoy(0);
    eOut.value = estado.salida; eOut.min = estado.entrada;

    eIn.addEventListener("change", function () {
      estado.entrada = eIn.value;
      eOut.min = eIn.value;
      if (eOut.value <= eIn.value) {
        eOut.value = new Date(new Date(eIn.value).getTime() + 864e5).toISOString().slice(0, 10);
        estado.salida = eOut.value;
      }
      repintar();
    });
    eOut.addEventListener("change", function () {
      estado.salida = eOut.value;
      repintar();
    });

    $("#r-huespedes").addEventListener("click", function (e) {
      const btn = e.target.closest("[data-step]");
      if (!btn) return;
      const k = btn.dataset.step, dir = +btn.dataset.dir;
      if (k === "adultos") {
        estado.adultos = Math.min(8, Math.max(1, estado.adultos + dir));
      } else if (dir > 0) {
        if (estado.edades.length < 6) estado.edades.push(7);
      } else {
        estado.edades.pop();
      }
      repintar();
    });

    $("#r-huespedes").addEventListener("change", function (e) {
      const s = e.target.closest("[data-edad]");
      if (!s) return;
      estado.edades[+s.dataset.edad] = +s.value;
      repintar();
    });

    $("#r-habs").addEventListener("change", function (e) {
      if (e.target.name !== "habitacion") return;
      estado.habitacion = e.target.value;
      pintarDesglose();
    });

    /* Galería */
    $("#gal-principal").addEventListener("click", abrirVisor);
    $("#gal-tiras").addEventListener("click", function (e) {
      const b = e.target.closest("[data-foto]");
      if (b) irAFoto(+b.dataset.foto);
    });
    $("#visor-cerrar").addEventListener("click", cerrarVisor);
    $("#visor-prev").addEventListener("click", function () { irAFoto(iFoto - 1); });
    $("#visor-next").addEventListener("click", function () { irAFoto(iFoto + 1); });
    $("#visor").addEventListener("click", function (e) {
      if (e.target === this) cerrarVisor();   /* clic en el fondo */
    });
    document.addEventListener("keydown", function (e) {
      if ($("#visor").hidden) return;
      if (e.key === "Escape")     cerrarVisor();
      if (e.key === "ArrowLeft")  irAFoto(iFoto - 1);
      if (e.key === "ArrowRight") irAFoto(iFoto + 1);
    });

    $("#btn-confirmar").addEventListener("click", confirmar);

    $("#btn-otra").addEventListener("click", function () {
      $("#reserva-ok").hidden = true;
      $("#reserva-form").hidden = false;
      repintar();
      $("#reserva-form").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /* ---------- ARRANQUE ---------- */
  pintarFicha();
  pintarSimilares();
  repintar();
  conectar();
})();
