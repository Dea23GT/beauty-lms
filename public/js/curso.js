// Parámetros de URL
const urlParams = new URLSearchParams(window.location.search);
const cursoId = urlParams.get('id');

// Estado Local
let player = null;
let lecciones = [];
let leccionActual = null;
let cursoActual = null; // Guardar detalles del curso
let user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
let youtubeApiReady = false;
let trackingInterval = null;

// Elementos DOM
const navActions = document.getElementById('nav-actions');
const cursoTituloSidebar = document.getElementById('curso-titulo-sidebar');
const leccionesListContainer = document.getElementById('lecciones-list-container');
const playerSection = document.getElementById('player-section');
const noAccessBanner = document.getElementById('no-access-banner');
const bannerMessage = document.getElementById('banner-message');
const btnBuyCourse = document.getElementById('btn-buy-course');
const statusAlert = document.getElementById('status-alert');
const leccionTituloMain = document.getElementById('leccion-titulo-main');
const cursoDescripcionMain = document.getElementById('curso-descripcion-main');
const bannerCourseTitle = document.getElementById('banner-course-title');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnText = document.getElementById('btn-text');
const playIcon = document.getElementById('play-icon');
const videoTimeStatus = document.getElementById('video-time-status');

// Selectores para Notas
const notesInput = document.getElementById('personal-notes-input');
const notesStatus = document.getElementById('notes-saved-status');
const btnClearNotes = document.getElementById('btn-clear-notes');

// 1. Renderizar Navbar
function renderNavbar() {
  let actionsHtml = `
    <button class="nav-icon-btn" id="btn-toggle-search" aria-label="Buscar" title="Buscar Cursos"><i class="bi bi-search"></i></button>
    <button class="nav-icon-btn" id="btn-open-profile" aria-label="Perfil" title="Mi Cuenta"><i class="bi bi-person-fill"></i></button>
  `;

  if (user) {
    if (user.rol === 'admin') {
      actionsHtml += `
        <a href="admin.html" class="btn-outline" style="font-size: 0.85rem; padding: 0.4rem 0.8rem; margin-left: 0.5rem;"><i class="bi bi-shield-lock"></i> Panel Admin</a>
      `;
    }
  } else {
    actionsHtml += `
      <a href="login.html" class="btn-primary" style="font-size: 0.85rem; padding: 0.4rem 0.8rem; margin-left: 0.5rem;">Ingresar</a>
    `;
  }

  navActions.innerHTML = actionsHtml;
}

let leccionesCompletadas = [];

async function loadProgreso() {
  if (!user) return;
  try {
    const response = await fetch(`/api/progreso/cursos/${cursoId}`);
    if (response.ok) {
      const data = await response.json();
      leccionesCompletadas = data.leccionesCompletadas || [];
      document.getElementById('progreso-box').style.display = 'block';
    }
  } catch (error) {
    console.error('Error al cargar progreso:', error);
  }
}

function updateProgressBar() {
  if (!user || lecciones.length === 0) {
    document.getElementById('progreso-box').style.display = 'none';
    return;
  }
  const totalLecciones = lecciones.length;
  const completadas = lecciones.filter(l => leccionesCompletadas.includes(l.id)).length;
  const porcentaje = totalLecciones > 0 ? Math.round((completadas / totalLecciones) * 100) : 0;
  
  document.getElementById('progreso-porcentaje').textContent = `${porcentaje}%`;
  document.getElementById('progreso-fill').style.width = `${porcentaje}%`;
  document.getElementById('progreso-box').style.display = 'block';
}

// eslint-disable-next-line no-unused-vars
async function toggleLeccionProgreso(event, leccionId) {
  event.stopPropagation(); // Evitar navegación
  if (!user) return;
  
  const checkWrapper = event.currentTarget;

  try {
    const response = await fetch(`/api/progreso/lecciones/${leccionId}`, {
      method: 'POST'
    });

    if (response.ok) {
      const data = await response.json();
      if (data.completado) {
        if (!leccionesCompletadas.includes(leccionId)) {
          leccionesCompletadas.push(leccionId);
        }
      } else {
        leccionesCompletadas = leccionesCompletadas.filter(id => id !== leccionId);
      }

      if (data.completado) {
        checkWrapper.classList.add('completed');
      } else {
        checkWrapper.classList.remove('completed');
      }

      updateProgressBar();
    }
  } catch (error) {
    console.error('Error al actualizar progreso:', error);
  }
}

// 2. Cargar detalles del curso y su lista de lecciones (Público)
async function loadCursoDetalles() {
  if (!cursoId) {
    window.location.href = 'index.html';
    return;
  }

  try {
    if (user) {
      await loadProgreso();
    }

    const response = await fetch(`/api/cursos/${cursoId}`);
    if (!response.ok) {
      throw new Error('Curso no encontrado');
    }

    const curso = await response.json();
    cursoActual = curso; // Guardar globalmente
    
    // Asignar textos
    cursoTituloSidebar.textContent = curso.titulo;
    bannerCourseTitle.textContent = `Inscríbete a: ${curso.titulo}`;
    cursoDescripcionMain.textContent = curso.descripcion;
    btnBuyCourse.textContent = `Inscribirse por Q${parseFloat(curso.precio).toFixed(2)}`;
    
    // Guardar lecciones aplanadas
    const pasos = curso.pasos || [];
    lecciones = [];
    pasos.forEach(p => {
      if (p.lecciones) {
        lecciones.push(...p.lecciones);
      }
    });

    // Renderizar lista en menú lateral
    if (lecciones.length === 0) {
      leccionesListContainer.innerHTML = '<div class="leccion-item" style="padding: 1.5rem;"><span class="leccion-titulo">Sin lecciones aún</span></div>';
      leccionTituloMain.textContent = 'Este curso aún no tiene lecciones subidas';
      return;
    }

    let html = '';
    let lessonGlobalIndex = 1;

    pasos.forEach(paso => {
      if (paso.lecciones && paso.lecciones.length > 0) {
        html += `
          <div class="paso-section">
            <div class="paso-header">
              <i class="bi bi-journal-bookmark-fill"></i>
              <span>${escapeHtml(paso.titulo)}</span>
            </div>
            <ul class="lecciones-list" style="list-style: none;">
        `;
        
        paso.lecciones.forEach(leccion => {
          const isCompleted = leccionesCompletadas.includes(leccion.id);
          const activeClass = leccionActual && leccionActual.id === leccion.id ? 'active' : '';
          
          html += `
            <li class="leccion-item ${activeClass}" id="leccion-btn-${leccion.id}" onclick="selectLeccion(${leccion.id})">
              ${user ? `
              <div class="leccion-checkbox-wrapper ${isCompleted ? 'completed' : ''}" onclick="toggleLeccionProgreso(event, ${leccion.id})">
                <div class="leccion-checkbox-circle">
                  <i class="bi bi-check-lg"></i>
                </div>
              </div>
              ` : ''}
              <span class="leccion-num">${lessonGlobalIndex++}</span>
              <span class="leccion-titulo" title="${escapeHtml(leccion.titulo)}">${escapeHtml(leccion.titulo)}</span>
            </li>
          `;
        });
        
        html += `
            </ul>
          </div>
        `;
      }
    });

    leccionesListContainer.innerHTML = html;
    updateProgressBar();

    // Cargar por defecto la primera lección
    if (!leccionActual && lecciones.length > 0) {
      selectLeccion(lecciones[0].id);
    } else if (leccionActual) {
      const activeBtn = document.getElementById(`leccion-btn-${leccionActual.id}`);
      if (activeBtn) activeBtn.classList.add('active');
    }

  } catch (error) {
    console.error('Error al cargar detalles:', error);
    cursoTituloSidebar.textContent = 'Error';
    leccionTituloMain.textContent = 'Error al cargar';
    cursoDescripcionMain.textContent = 'El curso no pudo cargarse.';
  }
}

// 3. Seleccionar Lección (Lógica Frontend)
async function selectLeccion(id) {
  // Remover clase activo de botones anteriores
  document.querySelectorAll('.leccion-item').forEach(item => item.classList.remove('active'));
  
  const activeBtn = document.getElementById(`leccion-btn-${id}`);
  if (activeBtn) activeBtn.classList.add('active');

  const leccionObj = lecciones.find(l => l.id === id);
  if (!leccionObj) return;

  leccionActual = leccionObj;
  leccionTituloMain.textContent = leccionObj.titulo;

  // Ocultar alerta de estado al cambiar de lección
  statusAlert.style.display = 'none';

  // --- RENDERIZAR INFORMACIÓN DEL MÓDULO ACTUAL ---
  const currentPaso = cursoActual && cursoActual.pasos 
    ? cursoActual.pasos.find(p => p.lecciones && p.lecciones.some(l => l.id === id))
    : null;
    
  const moduloCard = document.getElementById('modulo-info-card');
  if (moduloCard) {
    if (currentPaso && currentPaso.id !== null) {
      document.getElementById('modulo-info-titulo').textContent = currentPaso.titulo;
      document.getElementById('modulo-info-descripcion').textContent = currentPaso.descripcion || 'En este módulo aprenderás las bases y técnicas esenciales de este tema.';
      
      const moduloImg = document.getElementById('modulo-info-image');
      if (moduloImg) {
        moduloImg.src = currentPaso.miniatura_url || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'140\' height=\'90\'><rect width=\'100%\' height=\'100%\' fill=\'%231a1a1a\'/><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23d6af37\' font-family=\'sans-serif\' font-size=\'12\' font-weight=\'bold\'>BLUSH PRO</text></svg>';
      }
      moduloCard.style.display = 'flex';
    } else {
      moduloCard.style.display = 'none';
    }
  }

  // Verificar si la usuaria está autenticada
  if (!user) {
    showNoAccessBanner('Inicia sesión para poder acceder a las clases de este curso.', true);
    return;
  }

  // Consultar endpoint seguro
  await fetchLeccionSegura(id);
}

// 4. Fetch al Endpoint Seguro (Valida inscripción en backend)
async function fetchLeccionSegura(id) {
  try {
    const response = await fetch(`/api/lecciones/${id}`);

    const data = await response.json();

    if (response.status === 401) {
      // Token inválido/expirado
      localStorage.removeItem('user');
      showNoAccessBanner('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', true);
      return;
    }

    if (response.status === 403) {
      // No inscrito
      showNoAccessBanner('No tienes una inscripción activa para este curso. Adquiérelo para desbloquear el contenido.');
      return;
    }

    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener la lección');
    }

    // Si responde OK, tiene el youtube_id
    showPlayer(data.youtube_id, false);
    
    // Cargar y mostrar notas de la lección
    document.getElementById('notes-container').style.display = 'block';
    loadNotesForCurrentLeccion();

  } catch (error) {
    console.error('Error en fetch seguro:', error);
    showNoAccessBanner('Ocurrió un error al verificar tu acceso.');
  }
}

// Mostrar el Reproductor y Ocultar el Banner
function showPlayer(youtubeId, isTrailer = false) {
  playerSection.style.display = 'block';
  if (isTrailer) {
    noAccessBanner.style.display = 'flex';
  } else {
    noAccessBanner.style.display = 'none';
  }

  if (youtubeApiReady) {
    cargarVideoEnReproductor(youtubeId);
  } else {
    // Guardamos el ID para cargarlo en cuanto la API esté lista
    window.pendingYoutubeId = youtubeId;
  }
}

// Mostrar el Banner de Compra y Ocultar el Reproductor
function showNoAccessBanner(message, isLoginRequired = false) {
  // Ocultar sección de notas
  document.getElementById('notes-container').style.display = 'none';
  
  noAccessBanner.style.display = 'flex';
  bannerMessage.textContent = message;

  if (isLoginRequired) {
    btnBuyCourse.style.display = 'inline-block';
    btnBuyCourse.textContent = 'Iniciar Sesión';
    btnBuyCourse.href = 'login.html';
    btnBuyCourse.onclick = null;
  } else {
    btnBuyCourse.style.display = 'inline-block';
    btnBuyCourse.textContent = `Inscribirse al Curso por Q${parseFloat(cursoActual ? cursoActual.precio : 0).toFixed(2)}`;
    btnBuyCourse.href = '#';
    btnBuyCourse.onclick = async (e) => {
      e.preventDefault();

      // VALIDACIÓN DE VERIFICACIÓN DE CUENTA
      if (user && !user.verificado) {
        bannerMessage.innerHTML = `
          <div style="color: var(--color-danger); font-weight: 600; margin-bottom: 15px;">
            <i class="bi bi-exclamation-triangle-fill"></i> Debes verificar tu cuenta para continuar con la compra.
          </div>
          <p style="margin-bottom: 15px;">Ingresa el código de 6 dígitos que te enviamos por correo:</p>
          <div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px; max-width: 320px; margin-left: auto; margin-right: auto;">
            <input type="text" id="verif-code-input" class="form-control" placeholder="123456" maxlength="6" style="text-align: center; border-radius: var(--border-radius); padding: 8px; border: 1px solid var(--color-gray-light); background: var(--color-white); color: var(--color-dark);">
            <button id="btn-verif-submit" class="btn-primary" style="padding: 8px 16px; border-radius: var(--border-radius); white-space: nowrap;">Verificar</button>
          </div>
          <div id="verif-status-msg" style="margin-top: 10px; font-size: 0.9rem;"></div>
        `;
        btnBuyCourse.style.display = 'none';

        document.getElementById('btn-verif-submit').addEventListener('click', async (e) => {
          const btnVerif = e.currentTarget;
          const codeInput = document.getElementById('verif-code-input').value.trim();
          const statusMsg = document.getElementById('verif-status-msg');
          if (!codeInput) {
            statusMsg.innerHTML = '<span style="color: var(--color-danger);">Ingresa el código</span>';
            return;
          }
          try {
            btnVerif.disabled = true;
            btnVerif.innerHTML = '<i class="bi bi-arrow-repeat bi-spin"></i>';
            statusMsg.textContent = 'Verificando...';
            const resp = await fetch('/api/auth/verificar-manual', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ correo: user.correo, token: codeInput })
            });
            const resData = await resp.json();
            if (resp.ok) {
              statusMsg.innerHTML = '<span style="color: var(--color-primary); font-weight:600;">¡Cuenta verificada con éxito!</span>';
              user.verificado = true;
              localStorage.setItem('user', JSON.stringify(user));
              setTimeout(() => {
                // Recargar y continuar
                window.location.reload();
              }, 1500);
            } else {
              statusMsg.innerHTML = `<span style="color: var(--color-danger);">${escapeHtml(resData.error || 'Código incorrecto')}</span>`;
              btnVerif.disabled = false;
              btnVerif.textContent = 'Verificar';
            }
          } catch (err) {
            statusMsg.innerHTML = '<span style="color: var(--color-danger);">Error de conexión</span>';
            btnVerif.disabled = false;
            btnVerif.textContent = 'Verificar';
          }
        });
        return;
      }

      try {
        btnBuyCourse.innerHTML = '<i class="bi bi-arrow-repeat bi-spin" style="margin-right: 6px;"></i> Procesando...';
        btnBuyCourse.style.pointerEvents = 'none';

        const response = await fetch('/api/pagos/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ cursoId: parseInt(cursoId, 10) })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'No se pudo generar el checkout');
        }

        window.location.href = data.checkoutUrl;

      } catch (error) {
        console.error('Error al iniciar compra:', error);
        alert('Error: ' + error.message);
        btnBuyCourse.textContent = `Inscribirse al Curso por Q${parseFloat(cursoActual ? cursoActual.precio : 0).toFixed(2)}`;
        btnBuyCourse.style.pointerEvents = 'auto';
      }
    };
  }

  // Detener trackers
  if (trackingInterval) {
    clearInterval(trackingInterval);
  }

  // CARGAR TRAILER DE VIDEO DE YOUTUBE
  const trailerId = cursoActual ? cursoActual.trailer_youtube_id : 'dQw4w9WgXcQ';
  showPlayer(trailerId, true);

  // Mostrar cabecera de trailer
  if (!isLoginRequired) {
    bannerMessage.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 10px; color: var(--color-primary);">
        <i class="bi bi-play-btn-fill"></i> Estás viendo el tráiler del curso
      </div>
      ${message}
    `;
  }
}

// --- CONTROLES DE NOTAS PERSONALES ---
function getNotesKey() {
  if (!user || !cursoId || !leccionActual) return null;
  return `notes_${user.id}_${cursoId}_${leccionActual.id}`;
}

function loadNotesForCurrentLeccion() {
  const key = getNotesKey();
  if (!key) return;
  const savedNotes = localStorage.getItem(key) || '';
  notesInput.value = savedNotes;
  notesStatus.innerHTML = savedNotes ? '<i class="bi bi-check-all"></i> Apuntes guardados' : 'Sin apuntes para esta clase';
}

let autosaveTimeout = null;
notesInput.addEventListener('input', () => {
  const key = getNotesKey();
  if (!key) return;
  
  notesStatus.innerHTML = '<i class="bi bi-hourglass-split"></i> Guardando...';
  
  if (autosaveTimeout) clearTimeout(autosaveTimeout);
  autosaveTimeout = setTimeout(() => {
    const val = notesInput.value;
    if (val.trim()) {
      localStorage.setItem(key, val);
      notesStatus.innerHTML = '<i class="bi bi-check-all"></i> Guardado automáticamente';
    } else {
      localStorage.removeItem(key);
      notesStatus.innerHTML = 'Sin apuntes para esta clase';
    }
  }, 1000);
});

btnClearNotes.addEventListener('click', () => {
  if (confirm('¿Estás segura de que deseas borrar tus notas de esta clase?')) {
    const key = getNotesKey();
    if (key) {
      localStorage.removeItem(key);
      notesInput.value = '';
      notesStatus.textContent = 'Apuntes eliminados';
    }
  }
});

// --- INTEGRACIÓN YOUTUBE IFRAME API ---

// La API de YouTube llama a esta función automáticamente cuando se carga
window.onYouTubeIframeAPIReady = function() {
  youtubeApiReady = true;
  console.log('✅ YouTube IFrame API lista.');

  // Crear el reproductor en el div#yt-player
  player = new YT.Player('yt-player', {
    height: '100%',
    width: '100%',
    videoId: window.pendingYoutubeId || 'dQw4w9WgXcQ', // default video si no hay pendiente
    playerVars: {
      controls: 0,          // DESHABILITAR CONTROLES NATIVOS OBLIGATORIAMENTE
      disablekb: 1,         // Deshabilitar teclado
      rel: 0,               // No mostrar videos relacionados
      modestbranding: 1,    // Ocultar marca de YouTube en lo posible
      fs: 0,                // Deshabilitar pantalla completa nativa
      iv_load_policy: 3,    // Ocultar anotaciones
      autohide: 1
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
};

function onPlayerReady(event) {
  console.log('✅ Reproductor de YouTube inicializado.');
  
  // Si había un video pendiente por cargar al iniciar
  if (window.pendingYoutubeId) {
    cargarVideoEnReproductor(window.pendingYoutubeId);
    window.pendingYoutubeId = null;
  }

  // Iniciar el actualizador de tiempo de reproducción
  startTrackingTime();
}

function onPlayerStateChange(event) {
  // Estado de reproducción: 1 = Reproduciendo, 2 = Pausado
  if (event.data === YT.PlayerState.PLAYING) {
    playIcon.className = 'bi bi-pause-fill';
    btnText.textContent = 'Pausar';
  } else {
    playIcon.className = 'bi bi-play-fill';
    btnText.textContent = 'Reproducir';
  }
}

function cargarVideoEnReproductor(youtubeId) {
  if (player && player.cueVideoById) {
    player.cueVideoById({
      videoId: youtubeId,
      startSeconds: 0
    });
    
    // Reset de controles
    playIcon.className = 'bi bi-play-fill';
    btnText.textContent = 'Reproducir';
    videoTimeStatus.textContent = 'Tiempo: 0:00 / 0:00';
    progressBar.value = 0;
    progressBar.max = 100;
  }
}

// --- CONTROLES PERSONALIZADOS JS ---

btnPlayPause.addEventListener('click', () => {
  if (!player) return;

  const state = player.getPlayerState();
  
  if (state === YT.PlayerState.PLAYING) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
});

// Rastreador del tiempo de reproducción
const progressBar = document.getElementById('video-progress-bar');

function startTrackingTime() {
  if (trackingInterval) clearInterval(trackingInterval);

  trackingInterval = setInterval(() => {
    if (player && typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
      const current = player.getCurrentTime();
      const duration = player.getDuration();
      
      if (duration > 0) {
        videoTimeStatus.textContent = `Tiempo: ${formatTime(current)} / ${formatTime(duration)}`;
        progressBar.max = duration;
        if (!progressBar.dataset.dragging) {
          progressBar.value = current;
        }
      }
    }
  }, 250);
}

// Actualizar tiempo en el slider mientras se arrastra
progressBar.addEventListener('input', () => {
  if (player && typeof player.getDuration === 'function') {
    const duration = player.getDuration();
    const current = parseFloat(progressBar.value);
    videoTimeStatus.textContent = `Tiempo: ${formatTime(current)} / ${formatTime(duration)}`;
  }
});

// Control de Adelantar/Retroceder en barra de progreso al soltar/cambiar
progressBar.addEventListener('mousedown', () => {
  progressBar.dataset.dragging = 'true';
});

progressBar.addEventListener('mouseup', () => {
  progressBar.dataset.dragging = '';
  if (player && typeof player.seekTo === 'function') {
    player.seekTo(parseFloat(progressBar.value), true);
  }
});

progressBar.addEventListener('change', () => {
  if (player && typeof player.seekTo === 'function') {
    player.seekTo(parseFloat(progressBar.value), true);
  }
});

// Soporte para dispositivos móviles
progressBar.addEventListener('touchstart', () => {
  progressBar.dataset.dragging = 'true';
});

progressBar.addEventListener('touchend', () => {
  progressBar.dataset.dragging = '';
  if (player && typeof player.seekTo === 'function') {
    player.seekTo(parseFloat(progressBar.value), true);
  }
});

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

async function loadBanner() {
  try {
    const response = await fetch('/api/cursos/config/banner');
    if (response.ok) {
      const data = await response.json();
      const bannerEl = document.getElementById('promo-banner');
      if (data && data.valor && data.valor.trim() !== '') {
        bannerEl.innerHTML = `<div class="promo-banner-content"><i class="bi bi-megaphone-fill"></i> ${escapeHtml(data.valor)}</div>`;
        bannerEl.style.display = 'block';
      } else {
        bannerEl.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error al cargar banner:', error);
  }
}

// Inicialización al cargar la página
renderNavbar();
loadCursoDetalles();
loadBanner();

// Alerta interactiva para la opción Tienda en la barra
document.addEventListener('DOMContentLoaded', () => {
  const navShop = document.getElementById('nav-shop');
  if (navShop) {
    navShop.addEventListener('click', function(e) {
      e.preventDefault();
      alert('🛍️ Redirección externa:\n\nPróximamente serás redirigida a la Tienda de Cosméticos Oficial de Blush Pro Academy para adquirir tus herramientas y productos sugeridos.');
    });
  }
});
