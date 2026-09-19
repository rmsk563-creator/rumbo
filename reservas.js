/* ============================================================
   RUMBO — Mis reservas y hoteles guardados
   Lee las reservas y los favoritos de la cuenta (Supabase).
   Depende de datos.js y auth.js.

   Decisión de interacción: cancelar no usa el diálogo del navegador.
   La confirmación ocurre dentro de la propia tarjeta, en dos pasos,
   porque un confirm() bloquea la página, no se puede diseñar y en
   móvil aparece descolgado del elemento que lo disparó.
   ============================================================ */
(function () {
  "use strict";

  const R = window.RUMBO;
  const $ = function (s) { return document.querySelector(s); };

  /* Los mensajes de error vienen del servidor: se escapan antes de ir a innerHTML. */
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  let filtro = "todas";
  let confirmando = null;   /* código de la reserva que pide confirmación */
  let listoParaPintar = false;
  let migrando = false;
  let fallo = "";           /* último error de una acción, se muestra en pantalla */

  R.pintarContadorReservas();

  function visibles() {
    const todas = R.reservas.listar();
    return filtro === "todas" ? todas : todas.filter(function (r) { return r.estado === filtro; });
  }

  function pintarLead() {
    if (!listoParaPintar) {
      $("#res-tabs").hidden = true;
      $("#res-lead").textContent = "Cargando tus reservas…";
      return;
    }
    if (!R.auth.usuario()) {
      $("#res-tabs").hidden = true;
      $("#res-lead").textContent = "Entra en tu cuenta para ver y gestionar tus reservas.";
      return;
    }
    const todas = R.reservas.listar();
    const activas = todas.filter(function (r) { return r.estado === "confirmada"; }).length;
    $("#res-tabs").hidden = todas.length === 0;

    if (!todas.length) {
      $("#res-lead").textContent = "Aquí aparecerán tus reservas cuando confirmes alguna.";
    } else if (activas === 0) {
      $("#res-lead").textContent = "No tienes reservas activas. Las canceladas se quedan en el historial.";
    } else {
      $("#res-lead").textContent = activas === 1
        ? "Tienes 1 reserva confirmada. Puedes cancelarla sin costo hasta 48 horas antes de la entrada."
        : "Tienes " + activas + " reservas confirmadas. Puedes cancelarlas sin costo hasta 48 horas antes de la entrada.";
    }
  }

  function tarjeta(r) {
    const h = R.hotelPorId(r.hotelId);
    const d = h ? R.destinoPorId(h.destino) : null;
    const cancelada = r.estado === "cancelada";
    const pidiendo = confirmando === r.codigo;

    const huespedes = r.adultos + (r.adultos === 1 ? " adulto" : " adultos") +
      (r.edades.length ? " y " + r.edades.length + (r.edades.length === 1 ? " niño" : " niños") : "");

    const edades = r.edades.length
      ? '<p class="res-edades">Edades: ' + r.edades.map(function (e) {
          return e === 0 ? "menos de 1" : e + (e === 1 ? " año" : " años");
        }).join(", ") + '</p>'
      : "";

    return '<article class="res-card' + (cancelada ? " res-cancelada" : "") + '">' +
      '<div class="res-art art">' +
        (d ? R.escena(d.tipo) : "") +
        (h ? R.imagen(R.FOTOS_HOTEL[h.foto], "(max-width:760px) 92vw, 200px") : "") +
      '</div>' +

      '<div class="res-cuerpo">' +
        '<div class="res-top">' +
          '<span class="res-estado ' + (cancelada ? "es-cancel" : "es-ok") + '">' +
            (cancelada ? "Cancelada" : "Confirmada") + '</span>' +
          '<span class="res-codigo num">' + r.codigo + '</span>' +
        '</div>' +
        '<h2>' + (h ? '<a href="hotel.html?id=' + h.id + '">' + h.nombre + '</a>' : "Hotel no disponible") + '</h2>' +
        '<p class="res-dest">' + (d ? d.nombre + ", " + d.pais : "") + '</p>' +
        '<dl class="res-datos">' +
          '<div><dt>Fechas</dt><dd>' + R.fechaLarga(r.entrada) + " → " + R.fechaLarga(r.salida) +
            ' <span class="num">· ' + r.noches + (r.noches === 1 ? " noche" : " noches") + '</span></dd></div>' +
          '<div><dt>Habitación</dt><dd>' + r.habitacion + '</dd></div>' +
          '<div><dt>Huéspedes</dt><dd>' + huespedes + '</dd></div>' +
        '</dl>' +
        edades +
      '</div>' +

      '<div class="res-lado">' +
        '<span class="price-from">Total</span>' +
        '<span class="price num">USD ' + R.fmt(r.total) + '</span>' +
        '<span class="price-unit">impuestos incluidos</span>' +
        (cancelada
          ? '<button class="btn-ghost" type="button" data-borrar="' + r.codigo + '">Quitar del historial</button>'
          : pidiendo
            ? '<div class="res-confirm">' +
                '<p>¿Cancelar esta reserva?</p>' +
                '<div class="res-confirm-btns">' +
                  '<button class="btn-peligro" type="button" data-si="' + r.codigo + '">Sí, cancelar</button>' +
                  '<button class="btn-ghost" type="button" data-no="1">No</button>' +
                '</div>' +
              '</div>'
            : '<button class="btn-ghost" type="button" data-cancelar="' + r.codigo + '">Cancelar reserva</button>') +
      '</div>' +
    '</article>';
  }

  /* Reservas hechas antes de existir las cuentas: viven en este navegador
     y se pueden pasar a la cuenta con un clic. */
  function avisos() {
    let html = "";
    const locales = R.reservas.locales().length;

    if (fallo) html += '<p class="r-aviso error" role="alert">' + esc(fallo) + '</p>';

    const cargaFallida = R.reservas.errorDeCarga();
    if (cargaFallida) {
      html += '<p class="r-aviso error" role="alert">No se pudieron cargar tus reservas: ' +
        esc(cargaFallida.message) + ' <button class="btn-ghost" type="button" data-recargar>Reintentar</button></p>';
    }

    if (locales) {
      html += '<div class="res-migrar">' +
        '<p><b>Tienes ' + locales + (locales === 1 ? ' reserva guardada' : ' reservas guardadas') +
        ' solo en este navegador.</b> Pásalas a tu cuenta para verlas desde cualquier dispositivo.</p>' +
        '<button class="btn-brand" type="button" data-migrar' + (migrando ? ' disabled' : '') + '>' +
          (migrando ? 'Pasando…' : 'Pasar a mi cuenta') + '</button>' +
      '</div>';
    }
    return html;
  }

  function pintarVisitante(cont) {
    const locales = R.reservas.locales().length;
    cont.innerHTML =
      '<div class="empty">' +
        '<h3>Tus reservas viven en tu cuenta</h3>' +
        '<p>Entra o crea una cuenta gratis para reservar y ver tus reservas desde cualquier dispositivo.</p>' +
        (locales
          ? '<p style="margin-top:8px">Tienes ' + locales + (locales === 1 ? ' reserva guardada' : ' reservas guardadas') +
            ' en este navegador: al entrar podrás pasarlas a tu cuenta.</p>'
          : '') +
        '<p style="margin-top:16px"><button class="btn-brand" type="button" data-auth-abrir="entrar">Entrar</button> ' +
        '<button class="btn-ghost" type="button" data-auth-abrir="crear">Crear cuenta</button></p>' +
      '</div>';
  }

  /* ---------- Hoteles guardados ---------- */
  function pintarFavoritos() {
    const seccion = $("#seccion-favoritos");
    if (!listoParaPintar || !R.auth.usuario()) { seccion.hidden = true; return; }

    const ids = R.favoritos.listar();
    seccion.hidden = false;
    const cont = $("#fav-lista");

    if (!ids.length) {
      cont.innerHTML =
        '<div class="empty">' +
          '<h3>Todavía no has guardado ningún hotel</h3>' +
          '<p>Pulsa el corazón de cualquier hotel para tenerlo a mano aquí, sin reservar todavía.</p>' +
          '<p style="margin-top:16px"><a class="btn-brand" href="index.html#resultados">Buscar hoteles</a></p>' +
        '</div>';
      return;
    }

    cont.innerHTML = '<div class="fav-grid">' + ids.map(function (id) {
      const h = R.hotelPorId(id);
      if (!h) return "";
      const d = R.destinoPorId(h.destino);
      return '<article class="fav-card">' +
        '<a class="fav-art art" href="hotel.html?id=' + h.id + '" aria-label="' + h.nombre + '">' +
          R.escena(d.tipo) + R.imagen(h.fotos[0], "(max-width:760px) 92vw, 260px") +
          '<span class="entorno">' + R.entornoDe(d.tipo) + '</span>' +
        '</a>' +
        R.favoritos.boton(h.id) +
        '<div class="fav-cuerpo">' +
          '<h3><a href="hotel.html?id=' + h.id + '">' + h.nombre + '</a></h3>' +
          '<p class="fav-loc">' + d.nombre + ', ' + d.pais + '</p>' +
          '<p class="fav-precio"><b class="num">USD ' + h.precio + '</b> ' +
            '<span>por noche · niños gratis hasta los ' + h.gratisHasta + '</span></p>' +
          '<a class="btn-ghost" href="hotel.html?id=' + h.id + '">Ver disponibilidad</a>' +
        '</div>' +
      '</article>';
    }).join("") + '</div>';

    R.respaldarFotos(cont);
  }

  function pintar() {
    pintarLead();
    pintarFavoritos();
    const cont = $("#res-lista");

    if (!listoParaPintar) { cont.innerHTML = ""; return; }
    if (!R.auth.usuario()) { pintarVisitante(cont); return; }

    const lista = visibles();
    const previo = avisos();

    if (!R.reservas.listar().length) {
      cont.innerHTML = previo +
        '<div class="empty">' +
          '<h3>Todavía no tienes reservas</h3>' +
          '<p>Busca un hotel, entra en su ficha y pulsa «Confirmar reserva». Aparecerá aquí, en tu cuenta.</p>' +
          '<p style="margin-top:16px"><a class="btn-brand" href="index.html#resultados">Buscar hoteles</a></p>' +
        '</div>';
      return;
    }

    if (!lista.length) {
      cont.innerHTML = previo +
        '<div class="empty">' +
          '<h3>Nada en este filtro</h3>' +
          '<p>No hay reservas ' + (filtro === "confirmada" ? "confirmadas" : "canceladas") + ' ahora mismo.</p>' +
        '</div>';
      return;
    }

    cont.innerHTML = previo + '<div class="res-grid">' + lista.map(tarjeta).join("") + '</div>';
    R.respaldarFotos(cont);
  }

  /* ---------- Eventos ---------- */
  $("#res-tabs").addEventListener("click", function (e) {
    const b = e.target.closest("[data-estado]");
    if (!b) return;
    filtro = b.dataset.estado;
    confirmando = null;
    this.querySelectorAll("[data-estado]").forEach(function (x) {
      x.setAttribute("aria-selected", String(x === b));
      x.setAttribute("aria-pressed", String(x === b));
    });
    pintar();
  });

  $("#res-lista").addEventListener("click", function (e) {
    const pedir = e.target.closest("[data-cancelar]");
    const si    = e.target.closest("[data-si]");
    const no    = e.target.closest("[data-no]");
    const quitar = e.target.closest("[data-borrar]");
    const migrar = e.target.closest("[data-migrar]");
    const reintentar = e.target.closest("[data-recargar]");

    /* Las acciones hablan con la nube: se pinta al terminar, y si fallan
       se dice por qué en vez de dejar la pantalla como si nada. */
    function hecho() { fallo = ""; confirmando = null; R.pintarContadorReservas(); pintar(); }
    function fallado(err) { fallo = err.message; confirmando = null; pintar(); }

    if (pedir)  { confirmando = pedir.dataset.cancelar; fallo = ""; pintar(); return; }
    if (no)     { confirmando = null; pintar(); return; }
    if (si)     { R.reservas.cancelar(si.dataset.si).then(hecho, fallado); return; }
    if (quitar) { R.reservas.borrar(quitar.dataset.borrar).then(hecho, fallado); return; }
    if (reintentar) { R.reservas.recargar(); return; }
    if (migrar) {
      migrando = true; fallo = ""; pintar();
      R.reservas.migrarLocales().then(function () { migrando = false; hecho(); },
                                      function (err) { migrando = false; fallado(err); });
    }
  });

  /* ---------- Arranque ---------- */
  pintar();                                   /* "Cargando…" mientras se lee la sesión */
  R.auth.alCambiar(function () { confirmando = null; fallo = ""; pintar(); });

  /* auth.js guarda o quita el favorito y avisa cuando la lista cambia:
     aquí solo hay que rehacer la rejilla. */
  R.favoritos.alCambiar(pintarFavoritos);
  R.auth.listo.then(function () { listoParaPintar = true; pintar(); });
})();
