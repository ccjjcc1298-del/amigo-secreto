// ============================================================
//  Amigo Secreto - Lógica del Frontend (SPA)
// ============================================================

const app = document.getElementById("app");
let timerInterval = null;

// --- Router ---
function getRoute() {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith("/sala/")) {
    return { page: "sala", code: hash.slice(6) };
  }
  return { page: "home" };
}

function navigate(path) {
  window.location.hash = path;
}

window.addEventListener("hashchange", render);

// --- API helpers ---
async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error inesperado");
  return data;
}

// --- Utils ---
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatTimeRemaining(closesAt) {
  const now = new Date();
  const close = new Date(closesAt);
  const diff = close - now;
  if (diff <= 0) return { expired: true, text: "00:00:00" };

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return {
    expired: false,
    text: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
  };
}

function startTimer(closesAt, elementId) {
  if (timerInterval) clearInterval(timerInterval);
  const update = () => {
    const el = document.getElementById(elementId);
    if (!el) return;
    const { expired, text } = formatTimeRemaining(closesAt);
    el.textContent = text;
    if (expired) {
      clearInterval(timerInterval);
      timerInterval = null;
      render();
    }
  };
  update();
  timerInterval = setInterval(update, 1000);
}

// --- Pages ---

function renderHome() {
  app.innerHTML = `
    <header class="app-header">
      <h1>Amigo Secreto World Gen 🎁</h1>
      <span class="subtitle">World Gen Edition</span>
      <p style="margin-top:10px">Crea una sala, compártela con tus amigos y descubre quién te toca.</p>
    </header>
    <div class="card">
      <h2>Crear nueva sala</h2>
      <p style="color:var(--text-muted);margin-bottom:20px;font-size:0.95rem">
        Al crear la sala, tendrás 24 horas para que todos se inscriban.
        Después del cierre, se realiza el sorteo automáticamente.
      </p>
      <button class="btn btn-primary" id="btn-create">✨ Crear nueva sala</button>
    </div>
  `;
  document.getElementById("btn-create").addEventListener("click", async () => {
    const btn = document.getElementById("btn-create");
    btn.disabled = true;
    btn.textContent = "Creando...";
    try {
      const room = await api("/rooms", { method: "POST" });
      renderSalaCreated(room);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Crear nueva sala";
      alert(err.message);
    }
  });
}

function renderSalaCreated(room) {
  const roomUrl = `${window.location.origin}/#/sala/${room.room_code}`;
  app.innerHTML = `
    <header class="app-header">
      <h1>Amigo Secreto World Gen 🎁</h1>
    </header>
    <div class="card">
      <h2 style="text-align:center">¡Tu sala ha sido creada! 🎉</h2>
      <div class="room-code-display">
        <div class="label">Código de la sala</div>
        <div class="code">${escapeHtml(room.room_code)}</div>
      </div>
      <p style="text-align:center;margin:16px 0;color:var(--text-muted);font-size:0.95rem">
        Comparte este enlace con tus amigos:
      </p>
      <div class="link-box">
        <code>${escapeHtml(roomUrl)}</code>
      </div>
      <button class="btn btn-outline" id="btn-copy" style="margin-bottom:12px">COPIAR ENLACE</button>
      <a class="btn btn-whatsapp" id="btn-whatsapp" style="margin-bottom:12px"
         href="https://wa.me/?text=${encodeURIComponent(
           "🎁 Te invito a participar en Amigo Secreto World Gen.\n\nEntra aquí para registrarte:\n" + roomUrl + "\n\n⏰ Tienes 24 horas para inscribirte."
         )}" target="_blank" rel="noopener">
        📱 Compartir por WhatsApp
      </a>
      <div class="timer" id="timer-box">
        <div class="label">Tiempo restante para inscribirse</div>
        <div class="time" id="timer">--:--:--</div>
      </div>
      <button class="btn btn-secondary" id="btn-enter">Entrar a la sala</button>
    </div>
  `;
  startTimer(room.closes_at, "timer");
  document.getElementById("btn-copy").addEventListener("click", () => {
    navigator.clipboard.writeText(roomUrl).then(() => {
      const btn = document.getElementById("btn-copy");
      btn.textContent = "¡Copiado! ✓";
      setTimeout(() => (btn.textContent = "COPIAR ENLACE"), 2000);
    });
  });
  document.getElementById("btn-enter").addEventListener("click", () => {
    render();
  });
}

function renderRegistrationOpen(room) {
  const roomUrl = `${window.location.origin}/#/sala/${room.room_code}`;
  app.innerHTML = `
    <header class="app-header">
      <h1>🎁 Amigo Secreto World Gen</h1>
      <p>Sala: <strong>${escapeHtml(room.room_code)}</strong></p>
      <span class="status-badge status-open">Inscripciones abiertas</span>
    </header>
    <div class="timer" id="timer-box">
      <div class="label">Tiempo restante</div>
      <div class="time" id="timer">--:--:--</div>
    </div>
    <div class="card">
      <h2>Inscríbete 📝</h2>
      <div id="form-alert"></div>
      <form id="register-form">
        <div class="form-group">
          <label for="name">Nombre</label>
          <input type="text" id="name" placeholder="Tu nombre" maxlength="100" required>
        </div>
        <div class="form-group">
          <label for="secret_code">Código secreto</label>
          <input type="password" id="secret_code" placeholder="Mínimo 4 caracteres" minlength="4" required>
        </div>
        <div class="form-group">
          <label for="confirm_code">Confirmar código secreto</label>
          <input type="password" id="confirm_code" placeholder="Repite tu código" required>
        </div>
        <button type="submit" class="btn btn-primary" id="btn-register">INSCRIBIRME</button>
      </form>
    </div>
    <div class="card">
      <div class="participants-info">
        <div class="count">${room.participant_count}</div>
        <div class="label">Participantes inscritos</div>
      </div>
      ${
        room.participant_names && room.participant_names.length > 0
          ? `<ul class="participant-list">${room.participant_names
              .map((n) => `<li>🎁 ${escapeHtml(n)}</li>`)
              .join("")}</ul>`
          : ""
      }
    </div>
    <div class="card">
      <h2>Compartir sala 📱</h2>
      <div class="link-box"><code>${escapeHtml(roomUrl)}</code></div>
      <button class="btn btn-outline" id="btn-copy" style="margin-bottom:12px">COPIAR ENLACE</button>
      <a class="btn btn-whatsapp" id="btn-whatsapp"
         href="https://wa.me/?text=${encodeURIComponent(
           "🎁 Te invito a participar en Amigo Secreto World Gen.\n\nEntra aquí para registrarte:\n" + roomUrl + "\n\n⏰ Tienes 24 horas para inscribirte."
         )}" target="_blank" rel="noopener">
        📱 Compartir por WhatsApp
      </a>
    </div>
  `;
  startTimer(room.closes_at, "timer");

  document.getElementById("btn-copy").addEventListener("click", () => {
    navigator.clipboard.writeText(roomUrl).then(() => {
      const btn = document.getElementById("btn-copy");
      btn.textContent = "¡Copiado! ✓";
      setTimeout(() => (btn.textContent = "COPIAR ENLACE"), 2000);
    });
  });

  document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("form-alert");
    const btn = document.getElementById("btn-register");
    const name = document.getElementById("name").value.trim();
    const secretCode = document.getElementById("secret_code").value;
    const confirmCode = document.getElementById("confirm_code").value;

    alertEl.innerHTML = "";

    if (!name || !secretCode || !confirmCode) {
      alertEl.innerHTML = `<div class="alert alert-error">Debes completar todos los campos.</div>`;
      return;
    }
    if (secretCode.length < 4) {
      alertEl.innerHTML = `<div class="alert alert-error">El código debe tener al menos 4 caracteres.</div>`;
      return;
    }
    if (secretCode !== confirmCode) {
      alertEl.innerHTML = `<div class="alert alert-error">Los códigos no coinciden.</div>`;
      return;
    }

    btn.disabled = true;
    btn.textContent = "Inscribiendo...";
    try {
      await api(`/rooms/${room.room_code}/participants`, {
        method: "POST",
        body: JSON.stringify({ name, secret_code: secretCode, confirm_code: confirmCode }),
      });
      alertEl.innerHTML = `<div class="alert alert-success">¡Inscripción exitosa! Guarda bien tu código secreto.</div>`;
      document.getElementById("register-form").reset();
      setTimeout(() => render(), 1500);
    } catch (err) {
      alertEl.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
      btn.disabled = false;
      btn.textContent = "INSCRIBIRME";
    }
  });
}

function renderClosed(room) {
  app.innerHTML = `
    <header class="app-header">
      <h1>🎁 Amigo Secreto World Gen</h1>
      <p>Sala: <strong>${escapeHtml(room.room_code)}</strong></p>
      <span class="status-badge status-closed">Inscripciones cerradas</span>
    </header>
    <div class="card">
      <div style="text-align:center;padding:24px">
        <div style="font-size:3rem;margin-bottom:12px">🔒</div>
        <h2>Las inscripciones están cerradas</h2>
        <p style="color:var(--text-muted);margin-top:8px">El sorteo está siendo preparado...</p>
      </div>
    </div>
  `;
  setTimeout(() => render(), 3000);
}

function renderDrawCompleted(room) {
  app.innerHTML = `
    <header class="app-header">
      <h1>🎁 Amigo Secreto World Gen</h1>
      <p>Sala: <strong>${escapeHtml(room.room_code)}</strong></p>
      <span class="status-badge status-completed">Sorteo listo</span>
    </header>
    <div class="card">
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:2.5rem">🎉</div>
        <h2>El sorteo está listo</h2>
      </div>
      <h2 style="margin-top:16px">🔒 Consulta tu amigo secreto</h2>
      <div id="result-alert"></div>
      <form id="result-form">
        <div class="form-group">
          <label for="r-name">Nombre</label>
          <input type="text" id="r-name" placeholder="Tu nombre" required>
        </div>
        <div class="form-group">
          <label for="r-code">Código secreto</label>
          <input type="password" id="r-code" placeholder="Tu código secreto" required>
        </div>
        <button type="submit" class="btn btn-primary" id="btn-result">VER MI AMIGO SECRETO</button>
      </form>
      <div id="result-display"></div>
    </div>
  `;

  document.getElementById("result-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("result-alert");
    const displayEl = document.getElementById("result-display");
    const btn = document.getElementById("btn-result");
    const name = document.getElementById("r-name").value.trim();
    const code = document.getElementById("r-code").value;

    alertEl.innerHTML = "";
    displayEl.innerHTML = "";

    if (!name || !code) {
      alertEl.innerHTML = `<div class="alert alert-error">Debes completar todos los campos.</div>`;
      return;
    }

    btn.disabled = true;
    btn.textContent = "Consultando...";
    try {
      const data = await api(`/rooms/${room.room_code}/result`, {
        method: "POST",
        body: JSON.stringify({ name, secret_code: code }),
      });
      displayEl.innerHTML = `
        <div class="result-reveal">
          <div class="icon">🎉</div>
          <h2>¡Tu amigo secreto es!</h2>
          <div class="name">${escapeHtml(data.receiver_name)}</div>
          <div class="hint">🤫 Recuerda mantenerlo en secreto.</div>
        </div>
      `;
      btn.disabled = false;
      btn.textContent = "VER MI AMIGO SECRETO";
      document.getElementById("result-form").reset();
    } catch (err) {
      alertEl.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
      btn.disabled = false;
      btn.textContent = "VER MI AMIGO SECRETO";
    }
  });
}

function renderNotFound() {
  app.innerHTML = `
    <header class="app-header">
      <h1>Amigo Secreto World Gen 🎁</h1>
    </header>
    <div class="card">
      <div style="text-align:center;padding:24px">
        <div style="font-size:3rem;margin-bottom:12px">😕</div>
        <h2>Esta sala no existe</h2>
        <p style="color:var(--text-muted);margin-top:8px">El enlace no es válido o la sala ya no está disponible.</p>
      </div>
      <button class="btn btn-primary" id="btn-home">Volver al inicio</button>
    </div>
  `;
  document.getElementById("btn-home").addEventListener("click", () => navigate(""));
}

function renderError(message) {
  app.innerHTML = `
    <header class="app-header">
      <h1>Amigo Secreto World Gen 🎁</h1>
    </header>
    <div class="card">
      <div class="alert alert-error">${escapeHtml(message)}</div>
      <button class="btn btn-primary" id="btn-home">Volver al inicio</button>
    </div>
  `;
  document.getElementById("btn-home").addEventListener("click", () => navigate(""));
}

// --- Main render ---
async function render() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  const route = getRoute();

  if (route.page === "home") {
    renderHome();
    return;
  }

  // Sala page
  app.innerHTML = `<div class="loader"><div class="spinner"></div><p>Cargando sala...</p></div>`;

  try {
    const room = await api(`/rooms/${route.code}`);
    if (room.status === "registration_open") {
      renderRegistrationOpen(room);
    } else if (room.status === "closed") {
      renderClosed(room);
    } else if (room.status === "draw_completed") {
      renderDrawCompleted(room);
    } else {
      renderError("Estado de sala no reconocido.");
    }
  } catch (err) {
    if (err.message.includes("no existe") || err.message.includes("no es válido")) {
      renderNotFound();
    } else {
      renderError(err.message);
    }
  }
}

render();
