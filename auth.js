/* ============================================================
   RUMBO — cuentas y reservas en la nube (Supabase)
   Se carga después de datos.js y antes del script de cada página.

   Piezas:
     1. Configuración y cliente
     2. Estado de sesión (una sola cola, sin cargas duplicadas)
     3. Reservas ligadas a la cuenta (sustituyen a RUMBO.reservas)
     3b. Favoritos ligados a la cuenta
     4. Mensajes de error en español
     5. Cabecera y aviso flotante
     6. Ventana de entrar / crear cuenta
     7. Arranque

   Si la librería de Supabase no carga (sin internet, bloqueada),
   nada se rompe: la página sigue funcionando y al intentar entrar
   se explica qué pasa.

   La clave "publishable" es pública por diseño: va en el navegador.
   Lo que protege los datos son las políticas RLS de la base
   (supabase-migracion.sql), no esconder esta clave.
   ============================================================ */
(function (global) {
  "use strict";

  const R = global.RUMBO;
  const doc = global.document;

  /* ---------- 1. CONFIGURACIÓN Y CLIENTE ---------- */
  const SUPABASE_URL = "https://uetxhwkdkxqpxvbwpaze.supabase.co";
  const SUPABASE_KEY = "sb_publishable_LDfch0xf7HN1hIPwyMQeVg_og7PCvGh";

  /* La URL de confirmación debe leerse antes de crear el cliente:
     al arrancar, supabase-js procesa el #hash del enlace del correo
     y lo borra de la barra de direcciones. */
  const hashInicial = new URLSearchParams(global.location.hash.replace(/^#/, ""));

  const cliente = (global.supabase && global.supabase.createClient)
    ? global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

  /* Las reservas guardadas en el navegador antes de existir las
     cuentas. Se conserva ese objeto solo para poder migrarlas. */
  const locales = R.reservas;

  /* ---------- 2. ESTADO DE SESIÓN ---------- */
  let usuario = null;          /* { id, email, nombre } o null */
  let cache = [];              /* reservas de la cuenta, ya en formato de la app */
  let favs = [];               /* ids de hotel guardados como favoritos */
  let errorCarga = null;
  const escuchas = [];
  let cola = Promise.resolve();

  let resolverListo;
  const listo = new Promise(function (ok) { resolverListo = ok; });

  function deUsuario(u) {
    const meta = u.user_metadata || {};
    return {
      id: u.id,
      email: u.email || "",
      nombre: (meta.nombre || "").trim() || (u.email || "").split("@")[0]
    };
  }

  /* Todas las altas y bajas de sesión pasan por esta cola. Así, cuando
     el evento de supabase-js y el formulario avisan del mismo inicio de
     sesión, la segunda llamada ve que ya está aplicado y no hace nada. */
  function sincronizar(sesion) {
    cola = cola.then(function () {
      const id = sesion && sesion.user ? sesion.user.id : null;
      if (id === (usuario ? usuario.id : null)) return null;

      usuario = id ? deUsuario(sesion.user) : null;
      cache = [];
      favs = [];
      errorCarga = null;

      /* Las dos cargas van juntas: si los favoritos fallan, las reservas
         se muestran igual, y al revés. */
      const carga = usuario
        ? Promise.all([
            cargarReservas().catch(function (e) { errorCarga = e; }),
            cargarFavoritos().catch(function () { favs = []; })
          ])
        : Promise.resolve();
      return carga.then(avisar);
    }).catch(function (e) { global.console.error("Rumbo: error al sincronizar la sesión", e); });
    return cola;
  }

  function avisarFav() {
    pintarCorazones();
    escuchasFav.slice().forEach(function (f) { f(favs.slice()); });
  }

  function avisar() {
    pintarCabecera();
    avisarFav();
    R.pintarContadorReservas();
    escuchas.slice().forEach(function (f) { f(usuario); });
  }

  /* ---------- 3. RESERVAS LIGADAS A LA CUENTA ---------- */
  function deFila(f) {
    return {
      codigo: f.codigo, hotelId: f.hotel_id, habitacion: f.habitacion,
      entrada: f.entrada, salida: f.salida, noches: f.noches,
      adultos: f.adultos, edades: f.edades || [],
      total: Number(f.total), estado: f.estado, creada: f.creada
    };
  }

  function aFila(r) {
    return {
      hotel_id: r.hotelId, habitacion: r.habitacion,
      entrada: r.entrada, salida: r.salida, noches: r.noches,
      adultos: r.adultos, edades: r.edades, total: r.total
    };
  }

  function fallar(error) {
    const e = new Error(traducir(error));
    e.original = error;
    throw e;
  }

  function cargarReservas() {
    return cliente.from("reservas").select("*").order("creada", { ascending: false })
      .then(function (res) {
        if (res.error) return fallar(res.error);
        cache = res.data.map(deFila);
      });
  }

  function exigirSesion() {
    if (!cliente || !usuario) throw new Error("Entra en tu cuenta para continuar.");
  }

  const reservas = {
    listar: function () { return cache.slice(); },
    activas: function () {
      return cache.filter(function (r) { return r.estado === "confirmada"; }).length;
    },
    errorDeCarga: function () { return errorCarga; },
    recargar: function () {
      exigirSesion();
      errorCarga = null;
      return cargarReservas().then(avisar, function (e) { errorCarga = e; avisar(); });
    },

    crear: function (r) {
      return Promise.resolve().then(function () {
        exigirSesion();
        return cliente.from("reservas").insert(aFila(r)).select().single();
      }).then(function (res) {
        if (res.error) return fallar(res.error);
        const nueva = deFila(res.data);
        cache.unshift(nueva);
        return nueva;
      });
    },

    cancelar: function (codigo) {
      return Promise.resolve().then(function () {
        exigirSesion();
        return cliente.from("reservas").update({ estado: "cancelada" })
          .eq("codigo", codigo).select();
      }).then(function (res) {
        if (res.error) return fallar(res.error);
        if (!res.data.length) throw new Error("No se encontró esa reserva en tu cuenta.");
        cache = cache.map(function (r) {
          return r.codigo === codigo ? Object.assign({}, r, { estado: "cancelada" }) : r;
        });
      });
    },

    borrar: function (codigo) {
      return Promise.resolve().then(function () {
        exigirSesion();
        return cliente.from("reservas").delete()
          .eq("codigo", codigo).eq("estado", "cancelada").select();
      }).then(function (res) {
        if (res.error) return fallar(res.error);
        if (!res.data.length) throw new Error("Solo se pueden quitar reservas canceladas.");
        cache = cache.filter(function (r) { return r.codigo !== codigo; });
      });
    },

    /* Reservas que el usuario hizo antes de tener cuenta. */
    locales: function () { return locales.listar(); },
    migrarLocales: function () {
      return Promise.resolve().then(function () {
        exigirSesion();
        const pendientes = locales.listar();
        if (!pendientes.length) return 0;
        const filas = pendientes.map(function (r) {
          return Object.assign(aFila(r), { codigo: r.codigo, estado: r.estado, creada: r.creada });
        });
        return cliente.from("reservas").insert(filas).select().then(function (res) {
          if (res.error) return fallar(res.error);
          /* Solo se borran del navegador cuando la nube ya las tiene. */
          pendientes.forEach(function (r) { locales.borrar(r.codigo); });
          cache = res.data.map(deFila).concat(cache).sort(function (a, b) {
            return a.creada < b.creada ? 1 : -1;
          });
          avisar();
          return res.data.length;
        });
      });
    }
  };

  R.reservas = reservas;

  /* ---------- 3b. FAVORITOS ----------
     La tabla tiene clave primaria (usuario_id, hotel_id), así que
     guardar dos veces el mismo hotel no crea una fila repetida: el
     cliente no necesita comprobarlo antes de insertar. */
  function cargarFavoritos() {
    return cliente.from("favoritos").select("hotel_id").order("creado_en", { ascending: false })
      .then(function (res) {
        if (res.error) return fallar(res.error);
        favs = res.data.map(function (f) { return f.hotel_id; });
      });
  }

  const escuchasFav = [];

  const favoritos = {
    listar: function () { return favs.slice(); },
    /* Las vistas que pintan una lista de favoritos (no solo el corazón)
       se enteran por aquí, en vez de adivinar con un temporizador. */
    alCambiar: function (f) { escuchasFav.push(f); },
    tiene: function (id) { return favs.indexOf(Number(id)) !== -1; },
    cuantos: function () { return favs.length; },

    alternar: function (id) {
      id = Number(id);
      return Promise.resolve().then(function () {
        exigirSesion();
        return favoritos.tiene(id)
          ? cliente.from("favoritos").delete().eq("hotel_id", id).select()
          : cliente.from("favoritos").insert({ hotel_id: id }).select();
      }).then(function (res) {
        if (res.error) return fallar(res.error);
        const i = favs.indexOf(id);
        if (i === -1) favs.unshift(id); else favs.splice(i, 1);
        avisarFav();
        return favoritos.tiene(id);
      });
    },

    /* El corazón es el mismo en la parrilla y en la ficha: si el
       marcado viviera en dos sitios, se desincronizaría al primer
       cambio. `texto` lo convierte en un botón con etiqueta visible. */
    boton: function (id, texto) {
      const on = favoritos.tiene(id);
      return '<button class="fav' + (texto ? " fav-txt" : "") + '" type="button" data-fav="' + id + '"' +
        ' aria-pressed="' + on + '" title="' + (on ? "Quitar de favoritos" : "Guardar en favoritos") + '">' +
        '<svg width="20" height="20" viewBox="0 0 22 22" aria-hidden="true">' +
          '<path d="M11 19.3S2.8 14.4 2.8 8.6A4.6 4.6 0 0 1 11 6a4.6 4.6 0 0 1 8.2 2.6c0 5.8-8.2 10.7-8.2 10.7z"' +
            ' fill="' + (on ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
        '</svg>' +
        '<span' + (texto ? "" : ' class="sr"') + '>' + (on ? "Guardado" : "Guardar") + '</span>' +
      '</button>';
    }
  };

  R.favoritos = favoritos;

  /* Repinta todos los corazones de la página tras un cambio de sesión
     o de estado, sin que cada vista tenga que enterarse. */
  function pintarCorazones() {
    doc.querySelectorAll("[data-fav]").forEach(function (b) {
      const on = favoritos.tiene(b.dataset.fav);
      const texto = b.classList.contains("fav-txt");
      b.setAttribute("aria-pressed", String(on));
      b.title = on ? "Quitar de favoritos" : "Guardar en favoritos";
      const path = b.querySelector("path");
      if (path) path.setAttribute("fill", on ? "currentColor" : "none");
      const et = b.querySelector("span");
      if (et) et.textContent = on ? "Guardado" : "Guardar";
      if (!texto && et) et.className = "sr";
    });
  }

  /* ---------- 4. MENSAJES DE ERROR EN ESPAÑOL ---------- */
  function traducir(e) {
    const msg = String((e && e.message) || "");
    const code = (e && (e.code || e.error_code)) || "";

    if (/failed to fetch|networkerror|load failed/i.test(msg) || (e && e.name === "AuthRetryableFetchError"))
      return "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.";
    if (code === "invalid_credentials" || /invalid login credentials/i.test(msg))
      return "El correo o la contraseña no son correctos.";
    if (code === "email_not_confirmed" || /email not confirmed/i.test(msg))
      return "Aún no has confirmado tu correo. Abre el enlace que te enviamos y vuelve a entrar.";
    if (code === "user_already_exists" || /already registered/i.test(msg))
      return "Ya existe una cuenta con ese correo. Prueba a entrar.";
    if (code === "weak_password")
      return "La contraseña es demasiado débil. Usa al menos 8 caracteres, mejor con letras y números.";
    if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || (e && e.status === 429))
      return "Se han hecho demasiados intentos o se enviaron demasiados correos. Espera unos minutos.";
    if (code === "email_address_invalid" || code === "validation_failed")
      return "Ese correo no es válido.";
    if (code === "signup_disabled")
      return "El registro de cuentas nuevas está desactivado.";
    if (code === "PGRST205" || /schema cache/i.test(msg))
      return "La base de datos todavía no tiene las tablas de Rumbo. Hay que ejecutar supabase-migracion.sql en el proyecto de Supabase.";
    if (code === "42501" || /row-level security/i.test(msg))
      return "No tienes permiso para hacer esto con esa reserva.";
    if (code === "23505")
      return "Esa reserva ya existe en tu cuenta.";
    if (code === "PGRST301" || /jwt/i.test(msg))
      return "Tu sesión caducó. Vuelve a entrar.";
    return msg || "No se pudo completar la operación. Inténtalo de nuevo.";
  }

  /* ---------- 5. CABECERA Y AVISO FLOTANTE ---------- */
  function el(tag, clase, texto) {
    const n = doc.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }

  /* El nombre lo escribe el usuario: siempre textContent, nunca innerHTML. */
  function pintarCabecera() {
    doc.querySelectorAll(".head-in").forEach(function (barra) {
      let caja = barra.querySelector(".head-auth");
      if (!caja) { caja = el("div", "head-auth"); barra.appendChild(caja); }
      caja.textContent = "";

      if (usuario) {
        const hola = el("span", "head-user", "Hola, ");
        hola.appendChild(el("b", null, usuario.nombre));
        hola.title = usuario.email;
        const salir = el("button", "head-cta", "Salir");
        salir.type = "button";
        salir.setAttribute("data-auth-salir", "");
        caja.appendChild(hola);
        caja.appendChild(salir);
      } else {
        const entrar = el("button", "head-cta", "Entrar");
        entrar.type = "button";
        entrar.setAttribute("data-auth-abrir", "entrar");
        caja.appendChild(entrar);
      }
    });
  }

  let temporizadorAviso = null;
  function aviso(texto, tipo) {
    let n = doc.getElementById("auth-aviso");
    if (!n) {
      n = el("div", "auth-aviso");
      n.id = "auth-aviso";
      n.setAttribute("role", "status");
      doc.body.appendChild(n);
    }
    n.textContent = texto;
    n.className = "auth-aviso visible" + (tipo === "error" ? " es-error" : "");
    global.clearTimeout(temporizadorAviso);
    temporizadorAviso = global.setTimeout(function () { n.className = "auth-aviso"; }, 6000);
  }

  /* ---------- 6. VENTANA DE ENTRAR / CREAR CUENTA ---------- */
  let dialogo = null, modo = "entrar", pendiente = null, ocupado = false;

  function crearDialogo() {
    dialogo = doc.createElement("dialog");
    dialogo.className = "auth";
    dialogo.setAttribute("aria-labelledby", "auth-titulo");
    dialogo.innerHTML =
      '<div class="auth-caja">' +
        '<button class="auth-x" type="button" data-auth-cerrar aria-label="Cerrar">' +
          '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
            '<path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '</button>' +

        '<form id="auth-form">' +
          '<p class="eyebrow" id="auth-motivo" hidden></p>' +
          '<h2 id="auth-titulo"></h2>' +
          '<div class="auth-tabs" role="tablist" aria-label="Acceso">' +
            '<button type="button" role="tab" data-modo="entrar">Entrar</button>' +
            '<button type="button" role="tab" data-modo="crear">Crear cuenta</button>' +
          '</div>' +

          '<div class="auth-campo" id="auth-c-nombre">' +
            '<label for="auth-nombre">Nombre</label>' +
            '<input id="auth-nombre" name="nombre" type="text" autocomplete="name" maxlength="60">' +
          '</div>' +
          '<div class="auth-campo">' +
            '<label for="auth-email">Correo</label>' +
            '<input id="auth-email" name="email" type="email" autocomplete="email" required>' +
          '</div>' +
          '<div class="auth-campo">' +
            '<label for="auth-pass">Contraseña</label>' +
            '<input id="auth-pass" name="pass" type="password" minlength="8" required>' +
            '<span class="auth-ayuda" id="auth-ayuda-pass" hidden>Mínimo 8 caracteres.</span>' +
          '</div>' +

          '<p class="r-aviso" id="auth-msg" role="alert" hidden></p>' +
          '<button class="btn-confirm" type="submit" id="auth-enviar"></button>' +
          '<p class="r-legal">Proyecto de práctica: no uses una contraseña que ya uses en otro sitio.</p>' +
        '</form>' +

        '<div id="auth-revisa" hidden>' +
          '<div class="ok-ico" aria-hidden="true">' +
            '<svg width="30" height="30" viewBox="0 0 30 30" fill="none">' +
              '<rect x="4" y="7" width="22" height="16" rx="3" stroke="currentColor" stroke-width="2"/>' +
              '<path d="m5 9 10 8 10-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>' +
          '</div>' +
          '<h2>Revisa tu correo</h2>' +
          '<p class="auth-texto">Te enviamos un enlace de confirmación a <b id="auth-revisa-email"></b>. ' +
            'Ábrelo en este mismo navegador para terminar de crear tu cuenta.</p>' +
          '<p class="auth-texto auth-suave">Si no llega en unos minutos, mira en spam.</p>' +
          '<button class="btn-ghost ancho" type="button" data-modo="entrar" id="auth-volver">Ya lo confirmé: entrar</button>' +
        '</div>' +
      '</div>';
    doc.body.appendChild(dialogo);

    dialogo.addEventListener("click", function (e) {
      if (e.target === dialogo) cerrar();                       /* clic en el fondo */
      if (e.target.closest("[data-auth-cerrar]")) cerrar();
      const m = e.target.closest("[data-modo]");
      if (m) cambiarModo(m.dataset.modo);
    });
    dialogo.addEventListener("close", function () { pendiente = null; });
    dialogo.querySelector("#auth-form").addEventListener("submit", enviar);
  }

  function $d(s) { return dialogo.querySelector(s); }

  function mensaje(texto, tipo) {
    const n = $d("#auth-msg");
    n.hidden = !texto;
    n.textContent = texto || "";
    n.className = "r-aviso" + (tipo ? " " + tipo : "");
  }

  function cambiarModo(nuevo) {
    modo = nuevo;
    const crear = modo === "crear";
    $d("#auth-form").hidden = false;
    $d("#auth-revisa").hidden = true;
    $d("#auth-titulo").textContent = crear ? "Crea tu cuenta" : "Entra en tu cuenta";
    $d("#auth-enviar").textContent = crear ? "Crear cuenta" : "Entrar";
    $d("#auth-c-nombre").hidden = !crear;
    $d("#auth-nombre").required = crear;
    $d("#auth-ayuda-pass").hidden = !crear;
    $d("#auth-pass").autocomplete = crear ? "new-password" : "current-password";
    dialogo.querySelectorAll(".auth-tabs [data-modo]").forEach(function (b) {
      b.setAttribute("aria-selected", String(b.dataset.modo === modo));
    });
    mensaje("");
  }

  function abrir(opciones) {
    opciones = opciones || {};
    if (!dialogo) crearDialogo();
    pendiente = opciones.alEntrar || null;
    cambiarModo(opciones.modo === "crear" ? "crear" : "entrar");

    const motivo = $d("#auth-motivo");
    motivo.hidden = !opciones.motivo;
    motivo.textContent = opciones.motivo || "";

    if (!cliente) mensaje("No se pudo cargar el servicio de cuentas. Comprueba tu conexión y recarga la página.", "error");
    if (!dialogo.open) dialogo.showModal();
    /* Al abrir, el foco va al primer campo: el nombre si se crea cuenta. */
    $d(modo === "crear" ? "#auth-nombre" : "#auth-email").focus();
  }

  function cerrar() {
    if (dialogo && dialogo.open) dialogo.close();
  }

  /* Enlace de confirmación del correo: siempre a index.html del mismo
     sitio. Esa URL tiene que estar en Authentication → URL Configuration
     → Redirect URLs, o Supabase usará la "Site URL" por defecto. */
  function urlDeRetorno() {
    if (global.location.protocol === "file:") return undefined;
    return new URL("index.html", global.location.href).href;
  }

  function enviar(e) {
    e.preventDefault();
    if (ocupado) return;
    if (!cliente) { mensaje("No se pudo cargar el servicio de cuentas. Recarga la página.", "error"); return; }

    const email = $d("#auth-email").value.trim();
    const pass = $d("#auth-pass").value;
    const nombre = $d("#auth-nombre").value.trim();

    ocupado = true;
    const boton = $d("#auth-enviar");
    boton.disabled = true;
    mensaje("");

    const peticion = modo === "crear"
      ? cliente.auth.signUp({
          email: email, password: pass,
          options: { data: { nombre: nombre }, emailRedirectTo: urlDeRetorno() }
        })
      : cliente.auth.signInWithPassword({ email: email, password: pass });

    peticion.then(function (res) {
      if (res.error) throw res.error;
      const u = res.data.user;

      /* Con la confirmación por correo activada, registrar un correo que
         ya existe no da error: devuelve un usuario sin identidades. */
      if (modo === "crear" && u && u.identities && u.identities.length === 0) {
        const dup = new Error("Ya existe una cuenta con ese correo.");
        dup.code = "user_already_exists";
        throw dup;
      }

      if (res.data.session) {
        return sincronizar(res.data.session).then(function () {
          const seguir = pendiente;
          pendiente = null;
          cerrar();
          aviso("Hola, " + usuario.nombre + ". Sesión iniciada.");
          if (seguir) seguir();
        });
      }

      /* Cuenta creada pero sin sesión: falta confirmar el correo. */
      $d("#auth-form").hidden = true;
      $d("#auth-revisa").hidden = false;
      $d("#auth-revisa-email").textContent = email;
    }).catch(function (err) {
      mensaje(traducir(err), "error");
    }).then(function () {
      ocupado = false;
      boton.disabled = false;
    });
  }

  function salir() {
    if (!cliente) return;
    cliente.auth.signOut().catch(function () { /* la sesión local se limpia igual */ })
      .then(function () { return sincronizar(null); })
      .then(function () { aviso("Sesión cerrada."); });
  }

  doc.addEventListener("click", function (e) {
    const a = e.target.closest("[data-auth-abrir]");
    if (a) { abrir({ modo: a.dataset.authAbrir }); return; }
    if (e.target.closest("[data-auth-salir]")) { salir(); return; }

    /* Corazón: sin sesión abre el acceso y, al entrar, guarda el hotel
       que el usuario quería. Igual que «Confirmar reserva». */
    const f = e.target.closest("[data-fav]");
    if (!f) return;
    const id = Number(f.dataset.fav);
    if (!usuario) {
      abrir({
        modo: "entrar",
        motivo: "Guarda tus hoteles",
        alEntrar: function () { if (!favoritos.tiene(id)) favoritos.alternar(id).catch(function (err) { aviso(err.message, "error"); }); }
      });
      return;
    }
    f.disabled = true;
    favoritos.alternar(id).then(function (on) {
      aviso(on ? "Hotel guardado en favoritos." : "Hotel quitado de favoritos.");
    }, function (err) {
      aviso(err.message, "error");
    }).then(function () { f.disabled = false; });
  });

  /* ---------- 7. ARRANQUE ---------- */
  R.auth = {
    listo: listo,
    disponible: function () { return !!cliente; },
    usuario: function () { return usuario; },
    pintarCorazones: pintarCorazones,
    abrir: abrir,
    salir: salir,
    alCambiar: function (f) { escuchas.push(f); }
  };

  pintarCabecera();

  if (!cliente) {
    resolverListo();
  } else {
    cliente.auth.onAuthStateChange(function (evento, sesion) {
      if (evento !== "SIGNED_IN" && evento !== "SIGNED_OUT") return;
      /* No se llama a supabase desde dentro de este callback: se difiere
         para no bloquear la librería. */
      global.setTimeout(function () { sincronizar(sesion); }, 0);
    });

    cliente.auth.getSession()
      .then(function (res) { return sincronizar(res.data && res.data.session); })
      .catch(function () { /* sin sesión: se queda como visitante */ })
      .then(function () {
        resolverListo();

        if (hashInicial.get("error_description")) {
          aviso("El enlace del correo no es válido o ya caducó. Crea la cuenta de nuevo o entra.", "error");
        } else if (usuario && hashInicial.get("type") === "signup") {
          aviso("Correo confirmado. Ya has iniciado sesión.");
        }
      });
  }
})(window);
