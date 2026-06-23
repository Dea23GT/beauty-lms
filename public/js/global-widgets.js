/**
 * global-widgets.js
 * Inyecta dinámicamente y maneja la interactividad del Menú de Hamburguesa
 * y el Widget Flotante de WhatsApp para soporte técnico y consultas.
 * [Test Deploy: 2026-06-23]
 */

window.escapeHtml = function(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};


document.addEventListener('DOMContentLoaded', () => {
  // Iniciar inyección de componentes
  initNavbarHamburger();
  initWhatsAppWidget();
  initSearchWidget();
  initProfileModal();

  // Guard de contraseña temporal obligatorio
  const userJson = localStorage.getItem('user');
  if (userJson) {
    const user = JSON.parse(userJson);
    if (user.requiresPasswordChange) {
      setTimeout(() => {
        if (typeof window.openProfileModal === 'function') {
          window.openProfileModal();
        }
      }, 300);
    }
  }
});

/**
 * Configura el botón y el cajón (drawer) del menú de hamburguesa
 */
function initNavbarHamburger() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  // 1. Crear e inyectar el botón de la hamburguesa en la barra de navegación
  // Para evitar duplicaciones, revisamos si ya existe
  if (document.getElementById('hamburger-toggle')) return;

  const hamburgerToggle = document.createElement('button');
  hamburgerToggle.id = 'hamburger-toggle';
  hamburgerToggle.className = 'hamburger-toggle';
  hamburgerToggle.setAttribute('aria-label', 'Abrir menú');
  hamburgerToggle.innerHTML = '<i class="bi bi-list"></i>';
  
  // Lo insertamos al final del navbar
  navbar.appendChild(hamburgerToggle);

  // 2. Crear e inyectar el Drawer (cajón lateral) y el Overlay de fondo en el body
  if (!document.getElementById('hamburger-drawer')) {
    const drawerHtml = `
      <div class="hamburger-drawer-overlay" id="hamburger-drawer-overlay"></div>
      <div class="hamburger-drawer" id="hamburger-drawer">
        <div class="drawer-header">
          <h2 class="drawer-logo"><img src="logo.svg" alt="Blush Pro Academy" style="height: 52px; width: auto; object-fit: contain;"></h2>
          <button class="drawer-close" id="drawer-close" aria-label="Cerrar menú">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="drawer-body">
          <ul class="drawer-menu">
            <li>
              <a href="index.html" class="drawer-link" id="link-inicio">
                <span><i class="bi bi-house-door-fill"></i> Inicio</span>
              </a>
            </li>
            <li>
              <a href="https://tiendas.bluspro.net/" target="_blank" rel="noopener noreferrer" class="drawer-link" id="link-tienda">
                <span><i class="bi bi-bag-fill"></i> Tienda</span>
              </a>
            </li>
            <li>
              <a href="#" class="drawer-link" id="link-cursos">
                <span><i class="bi bi-journal-bookmark-fill"></i> Cursos</span>
              </a>
            </li>
            <li>
              <a href="#" class="drawer-link" id="link-nosotros">
                <span><i class="bi bi-info-circle-fill"></i> Nosotros</span>
              </a>
            </li>
            <li>
              <a href="#" class="drawer-link" id="link-blog">
                <span><i class="bi bi-stars"></i> Blog</span>
              </a>
            </li>
            <li>
              <a href="#" class="drawer-link" id="link-contacto">
                <span><i class="bi bi-envelope-fill"></i> Contacto</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', drawerHtml);

    // Inyectar dinámicamente opciones de sesión en el menú de hamburguesa
    const menuEl = document.querySelector('.drawer-menu');
    if (menuEl) {
      const userJson = localStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      
      let sessionHtml = '';
      if (user) {
        sessionHtml = `
          <li class="drawer-session-section" style="border-top: 1px solid rgba(0,0,0,0.08); margin-top: 2rem; padding-top: 1.5rem;">
            <div style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-gray); margin-bottom: 0.75rem; padding-left: 0.5rem; font-weight: 600;">
              Tu Cuenta
            </div>
            <div style="font-size: 0.95rem; font-weight: 500; color: var(--color-dark); margin-bottom: 1rem; padding-left: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
              <i class="bi bi-person-circle" style="color: var(--color-primary); font-size: 1.1rem;"></i> Hola, <span style="font-weight: 600;">${user.nombre}</span>
            </div>
          </li>
          <li>
            <a href="#" class="drawer-link" id="drawer-btn-perfil">
              <span><i class="bi bi-person-fill-gear"></i> Mi Perfil</span>
            </a>
          </li>
          ${user.rol === 'admin' ? `
          <li>
            <a href="admin.html" class="drawer-link">
              <span><i class="bi bi-shield-lock-fill"></i> Panel Admin</span>
            </a>
          </li>` : ''}
          <li>
            <a href="#" class="drawer-link" id="drawer-btn-logout">
              <span><i class="bi bi-box-arrow-right"></i> Cerrar Sesión</span>
            </a>
          </li>
        `;
      } else {
        sessionHtml = `
          <li class="drawer-session-section" style="border-top: 1px solid rgba(0,0,0,0.08); margin-top: 2rem; padding-top: 1.5rem;">
            <div style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-gray); margin-bottom: 0.75rem; padding-left: 0.5rem; font-weight: 600;">
              Tu Cuenta
            </div>
          </li>
          <li>
            <a href="login.html" class="drawer-link">
              <span><i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión</span>
            </a>
          </li>
          <li>
            <a href="login.html" class="drawer-link" style="color: var(--color-primary-dark);">
              <span><i class="bi bi-person-plus-fill"></i> Registrarse</span>
            </a>
          </li>
        `;
      }
      menuEl.insertAdjacentHTML('beforeend', sessionHtml);
      
      // Manejador del botón de perfil del drawer
      const drawerPerfilBtn = document.getElementById('drawer-btn-perfil');
      if (drawerPerfilBtn) {
        drawerPerfilBtn.addEventListener('click', (e) => {
          e.preventDefault();
          closeDrawer();
          window.openProfileModal();
        });
      }

      // Manejador del botón de logout del drawer
      const drawerLogoutBtn = document.getElementById('drawer-btn-logout');
      if (drawerLogoutBtn) {
        drawerLogoutBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            await fetch('/api/auth/logout', { method: 'POST' });
          } catch (err) {
            console.error('Error al cerrar sesión:', err);
          }
          localStorage.removeItem('user');
          window.location.reload();
        });
      }
    }
  }

  // 3. Obtener referencias y configurar manejadores de eventos
  const toggleBtn = document.getElementById('hamburger-toggle');
  const closeBtn = document.getElementById('drawer-close');
  const drawer = document.getElementById('hamburger-drawer');
  const overlay = document.getElementById('hamburger-drawer-overlay');
  
  // Abrir menú
  toggleBtn.addEventListener('click', () => {
    drawer.classList.add('active');
    overlay.classList.add('active');
  });

  // Cerrar menú
  const closeDrawer = () => {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
  };

  closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // 4. Comportamiento de los enlaces del Drawer
  const isHomePage = () => {
    return window.location.pathname.endsWith('index.html') || 
           window.location.pathname === '/' || 
           window.location.pathname === '/beauty-lms/' ||
           (!window.location.pathname.includes('.html') && !window.location.pathname.includes('admin') && !window.location.pathname.includes('curso') && !window.location.pathname.includes('login'));
  };

  const handleDrawerNavigation = (e, targetId) => {
    e.preventDefault();
    closeDrawer();
    
    if (isHomePage()) {
      const section = document.getElementById(targetId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.location.href = `index.html#${targetId}`;
    }
  };

  // Enlace Inicio
  const linkInicio = document.getElementById('link-inicio');
  if (linkInicio) {
    linkInicio.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
      if (isHomePage()) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.location.href = 'index.html';
      }
    });
  }

  // Enlace Tienda
  const linkTienda = document.getElementById('link-tienda');
  if (linkTienda) {
    linkTienda.addEventListener('click', () => {
      closeDrawer();
    });
  }

  // Enlace Cursos
  const linkCursos = document.getElementById('link-cursos');
  if (linkCursos) {
    linkCursos.addEventListener('click', (e) => {
      handleDrawerNavigation(e, 'cursos-container');
    });
  }

  // Enlace Nosotros
  const linkNosotros = document.getElementById('link-nosotros');
  if (linkNosotros) {
    linkNosotros.addEventListener('click', (e) => {
      handleDrawerNavigation(e, 'nosotros');
    });
  }

  // Enlace Blog
  const linkBlog = document.getElementById('link-blog');
  if (linkBlog) {
    linkBlog.addEventListener('click', (e) => {
      handleDrawerNavigation(e, 'blog');
    });
  }

  // Enlace Contacto
  const linkContacto = document.getElementById('link-contacto');
  if (linkContacto) {
    linkContacto.addEventListener('click', (e) => {
      handleDrawerNavigation(e, 'contacto');
    });
  }

  // Si cargamos una página con hash de sección, hacer scroll suave automáticamente
  if (window.location.hash) {
    setTimeout(() => {
      const targetId = window.location.hash.substring(1);
      const section = document.getElementById(targetId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  }
}

/**
 * Configura el widget flotante interactivo de WhatsApp
 */
function initWhatsAppWidget() {
  if (document.getElementById('whatsapp-widget')) return;

  const waWidgetHtml = `
    <div class="whatsapp-widget-container" id="whatsapp-widget">
      <!-- Burbuja flotante permanente -->
      <div class="whatsapp-bubble" id="whatsapp-bubble">
        <span>Contáctanos <i class="bi bi-chat-heart-fill" style="color: #e25555;"></i></span>
      </div>
      <!-- Botón Flotante Principal -->
      <button class="whatsapp-btn" id="whatsapp-btn" aria-label="Abrir formulario de ayuda de WhatsApp">
        <i class="bi bi-whatsapp"></i>
      </button>
      
      <!-- Ventana Emergente (Popup Form) -->
      <div class="whatsapp-popup" id="whatsapp-popup">
        <div class="whatsapp-popup-header">
          <div class="whatsapp-avatar">
            <i class="bi bi-person-badge-fill"></i>
          </div>
          <div class="whatsapp-header-text">
            <h4>Soporte Blush Pro Academy</h4>
            <span><i class="bi bi-circle-fill" style="font-size: 0.55rem; animation: pulse 1.5s infinite;"></i> En línea • Soporte</span>
          </div>
          <button class="whatsapp-popup-close" id="whatsapp-popup-close" aria-label="Cerrar soporte">&times;</button>
        </div>
        <div class="whatsapp-popup-body">
          <p>¿Tienes dudas con un curso o necesitas soporte técnico? Escríbenos y te atenderemos en WhatsApp.</p>
          <form id="whatsapp-support-form">
            <div class="form-group-whatsapp">
              <label for="wa-name">Tu Nombre Completo</label>
              <input type="text" id="wa-name" placeholder="Ej. Alejandra Paz" required>
            </div>
            <div class="form-group-whatsapp">
              <label for="wa-type">Tipo de Solicitud</label>
              <select id="wa-type" required>
                <option value="Duda sobre Curso" selected>Duda sobre un Curso</option>
                <option value="Soporte Técnico">Soporte Técnico de la Web</option>
                <option value="Código Promocional">Problemas con Cupones</option>
                <option value="Pagos / Compras">Pagos y Facturación</option>
                <option value="Otro">Otro Asunto</option>
              </select>
            </div>
            <div class="form-group-whatsapp">
              <label for="wa-message">Describe tu Consulta</label>
              <textarea id="wa-message" rows="3" placeholder="Ej. Hola, tengo una duda sobre la lección 2 del curso de Microblading..." required></textarea>
            </div>
            <button type="submit" class="wa-submit-btn">
              <i class="bi bi-whatsapp"></i> Iniciar Chat de WhatsApp
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', waWidgetHtml);

  // Obtener referencias de elementos
  const widgetContainer = document.getElementById('whatsapp-widget');
  const waBtn = document.getElementById('whatsapp-btn');
  const waPopup = document.getElementById('whatsapp-popup');
  const waBubble = document.getElementById('whatsapp-bubble');
  const closePopupBtn = document.getElementById('whatsapp-popup-close');
  const supportForm = document.getElementById('whatsapp-support-form');

  // Alternar apertura/cierre del popup al pulsar el botón verde
  waBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    waPopup.classList.toggle('active');
    
    // Ocultar burbuja flotante cuando el popup esté abierto
    if (waPopup.classList.contains('active')) {
      waBubble.style.opacity = '0';
    } else {
      waBubble.style.opacity = '0.95';
    }
  });

  // Cerrar popup desde el botón X
  closePopupBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    waPopup.classList.remove('active');
    waBubble.style.opacity = '0.95';
  });

  // Evitar que hacer clic dentro del popup lo cierre
  waPopup.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Cerrar el popup si se hace clic fuera del widget en cualquier parte del documento
  document.addEventListener('click', () => {
    if (waPopup.classList.contains('active')) {
      waPopup.classList.remove('active');
      waBubble.style.opacity = '0.95';
    }
  });

  // Procesar el envío del formulario de soporte
  supportForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('wa-name').value.trim();
    const type = document.getElementById('wa-type').value;
    const message = document.getElementById('wa-message').value.trim();

    // Formatear el texto de soporte
    const waText = `✨ *BLUSH PRO ACADEMY - SOPORTE* ✨\n\n` +
                   `👤 *Nombre:* ${name}\n` +
                   `🏷️ *Tipo de Consulta:* ${type}\n` +
                   `✉️ *Mensaje:* ${message}\n\n` +
                   `_Enviado desde el sistema de soporte automatizado._`;

    const encodedText = encodeURIComponent(waText);
    
    // Usamos el número de WhatsApp oficial configurado
    const phoneNumber = '50238040420'; // +502 3804-0420
    const waUrl = `https://wa.me/${phoneNumber}?text=${encodedText}`;

    // Abrir WhatsApp en pestaña nueva
    window.open(waUrl, '_blank');

    // Cerrar el popup y reiniciar formulario
    waPopup.classList.remove('active');
    waBubble.style.opacity = '0.95';
    supportForm.reset();
  });
}

function initSearchWidget() {
  if (document.getElementById('search-bar-container')) return;

  const searchHtml = `
    <div class="search-bar-container" id="search-bar-container">
      <div class="search-bar-wrapper">
        <i class="bi bi-search"></i>
        <input type="text" class="search-input" id="search-input" placeholder="Buscar cursos por título o descripción...">
        <button class="search-close-btn" id="search-close-btn" aria-label="Cerrar búsqueda"><i class="bi bi-x-lg"></i></button>
      </div>
    </div>
  `;

  const navbar = document.querySelector('.navbar');
  if (navbar) {
    navbar.insertAdjacentHTML('beforeend', searchHtml);
  } else {
    document.body.insertAdjacentHTML('afterbegin', searchHtml);
  }

  const searchContainer = document.getElementById('search-bar-container');
  const searchInput = document.getElementById('search-input');
  const closeBtn = document.getElementById('search-close-btn');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      searchContainer.style.display = 'none';
      searchInput.value = '';
      triggerCatalogFilter('');
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value;
      triggerCatalogFilter(query);
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = e.target.value.trim();
        const isHomePage = window.location.pathname.endsWith('index.html') || 
                           window.location.pathname === '/' || 
                           window.location.pathname === '/beauty-lms/' ||
                           (!window.location.pathname.includes('.html') && !window.location.pathname.includes('admin') && !window.location.pathname.includes('curso') && !window.location.pathname.includes('login'));
        if (!isHomePage) {
          window.location.href = `index.html?search=${encodeURIComponent(query)}`;
        }
      }
    });
  }
}

// Alternar barra de búsqueda
window.toggleSearchBar = function() {
  const container = document.getElementById('search-bar-container');
  const input = document.getElementById('search-input');
  if (!container || !input) return;

  if (container.style.display === 'block') {
    container.style.display = 'none';
    input.value = '';
    triggerCatalogFilter('');
  } else {
    container.style.display = 'block';
    input.focus();
  }
};

// Filtrar catálogo de cursos
function triggerCatalogFilter(query) {
  const isHomePage = window.location.pathname.endsWith('index.html') || 
                     window.location.pathname === '/' || 
                     window.location.pathname === '/beauty-lms/' ||
                     (!window.location.pathname.includes('.html') && !window.location.pathname.includes('admin') && !window.location.pathname.includes('curso') && !window.location.pathname.includes('login'));
  if (!isHomePage) return;

  const normalizedQuery = query.toLowerCase().trim();
  const cards = document.querySelectorAll('.curso-card');
  let matchCount = 0;

  cards.forEach(card => {
    const title = card.querySelector('.curso-titulo')?.textContent.toLowerCase() || '';
    const desc = card.querySelector('.curso-descripcion')?.textContent.toLowerCase() || '';
    
    if (title.includes(normalizedQuery) || desc.includes(normalizedQuery)) {
      card.style.display = 'block';
      matchCount++;
    } else {
      card.style.display = 'none';
    }
  });

  let noResultsMsg = document.getElementById('no-search-results-msg');
  if (matchCount === 0 && normalizedQuery !== '') {
    if (!noResultsMsg) {
      noResultsMsg = document.createElement('div');
      noResultsMsg.id = 'no-search-results-msg';
      noResultsMsg.style.cssText = 'grid-column: 1 / -1; text-align: center; color: var(--color-gray); padding: 3rem 0; font-size: 1.1rem;';
      noResultsMsg.innerHTML = `<i class="bi bi-search-heart" style="font-size: 2rem; color: var(--color-primary); display: block; margin-bottom: 0.5rem;"></i> No encontramos cursos que coincidan con tu búsqueda.`;
      const container = document.getElementById('cursos-container');
      if (container) container.appendChild(noResultsMsg);
    } else {
      noResultsMsg.style.display = 'block';
    }
  } else if (noResultsMsg) {
    noResultsMsg.style.display = 'none';
  }
}

function initProfileModal() {
  if (document.getElementById('profile-modal')) return;

  const modalHtml = `
    <div class="profile-modal" id="profile-modal">
      <div class="profile-modal-content">
        <div class="profile-modal-header">
          <h3 class="profile-modal-title">Mi Cuenta</h3>
          <button class="profile-close-btn" id="profile-close-btn" aria-label="Cerrar modal"><i class="bi bi-x-lg"></i></button>
        </div>

        <div class="profile-avatar-section">
          <div class="profile-avatar-circle" id="profile-avatar-circle">U</div>
          <span class="profile-role-badge" id="profile-role-badge">Alumna</span>
        </div>

        <!-- Pestañas -->
        <div class="profile-tabs">
          <button class="profile-tab-btn active" data-tab="tab-perfil">Datos Personales</button>
          <button class="profile-tab-btn" data-tab="tab-seguridad">Seguridad</button>
        </div>

        <!-- Pestaña Perfil -->
        <div class="profile-tab-pane active" id="tab-perfil">
          <form class="profile-form" id="profile-info-form">
            <div class="profile-field-group">
              <label for="profile-name">Nombre Completo</label>
              <input type="text" id="profile-name" required placeholder="Tu nombre">
            </div>
            <div class="profile-field-group">
              <label for="profile-email">Correo Electrónico</label>
              <input type="email" id="profile-email" disabled>
            </div>
            <button type="submit" class="btn-profile-save" id="btn-save-profile">
              <span><i class="bi bi-save-fill"></i> Guardar Cambios</span>
            </button>
          </form>
          <div id="profile-info-alert" class="alert" style="display: none; margin-top: 1rem; padding: 0.75rem; font-size: 0.85rem; border-radius: var(--border-radius);"></div>
        </div>

        <!-- Pestaña Seguridad -->
        <div class="profile-tab-pane" id="tab-seguridad">
          <form class="profile-form" id="profile-password-form">
            <div class="profile-field-group">
              <label for="profile-password-actual">Contraseña Actual</label>
              <input type="password" id="profile-password-actual" placeholder="Ingresa tu contraseña actual" required>
            </div>
            <div class="profile-field-group">
              <label for="profile-password-nueva">Nueva Contraseña</label>
              <input type="password" id="profile-password-nueva" placeholder="Mínimo 6 caracteres" required>
            </div>
            <div class="profile-field-group">
              <label for="profile-password-confirmar">Confirmar Nueva Contraseña</label>
              <input type="password" id="profile-password-confirmar" placeholder="Repite la contraseña nueva" required>
            </div>
            <button type="submit" class="btn-profile-save" id="btn-save-password">
              <span><i class="bi bi-shield-lock-fill"></i> Actualizar Contraseña</span>
            </button>
          </form>
          <div id="profile-password-alert" class="alert" style="display: none; margin-top: 1rem; padding: 0.75rem; font-size: 0.85rem; border-radius: var(--border-radius);"></div>
        </div>

        <div class="profile-actions-bottom">
          <span style="font-size: 0.85rem; color: var(--color-gray);">Sesión activa</span>
          <button class="btn-profile-logout" id="profile-btn-logout"><i class="bi bi-box-arrow-right"></i> Cerrar Sesión</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('profile-modal');
  const closeBtn = document.getElementById('profile-close-btn');
  const tabBtns = document.querySelectorAll('.profile-tab-btn');
  const tabPanes = document.querySelectorAll('.profile-tab-pane');
  const infoForm = document.getElementById('profile-info-form');
  const passwordForm = document.getElementById('profile-password-form');
  const logoutBtn = document.getElementById('profile-btn-logout');

  const infoAlert = document.getElementById('profile-info-alert');
  const passwordAlert = document.getElementById('profile-password-alert');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const userJson = localStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      if (user && user.requiresPasswordChange) {
        alert('Por razones de seguridad, debes actualizar tu contraseña temporal antes de continuar.');
        return;
      }
      modal.classList.remove('active');
    });
  }

  modal.addEventListener('click', (e) => {
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    if (user && user.requiresPasswordChange) return;

    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });

  if (infoForm) {
    infoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombreInput = document.getElementById('profile-name');
      const nombre = nombreInput.value.trim();
      const btnSave = document.getElementById('btn-save-profile');

      if (!nombre) return;

      btnSave.disabled = true;
      const btnSpan = btnSave.querySelector('span');
      const originalText = btnSpan.innerHTML;
      btnSpan.innerHTML = '<i class="bi bi-arrow-repeat bi-spin"></i> Guardando...';

      infoAlert.style.display = 'none';

      try {
        const response = await fetch('/api/auth/perfil', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre })
        });

        const data = await response.json();

        if (response.ok) {
          const userJson = localStorage.getItem('user');
          if (userJson) {
            const localUser = JSON.parse(userJson);
            localUser.nombre = nombre;
            localStorage.setItem('user', JSON.stringify(localUser));
          }

          infoAlert.className = 'alert alert-success';
          infoAlert.textContent = 'Perfil actualizado con éxito.';
          infoAlert.style.display = 'block';

          document.getElementById('profile-avatar-circle').textContent = nombre.charAt(0).toUpperCase();

          if (typeof window.renderNavbar === 'function') {
            window.renderNavbar();
          } else {
            const userLabel = document.querySelector('#nav-actions span span');
            if (userLabel) userLabel.textContent = nombre;
          }
        } else {
          infoAlert.className = 'alert alert-danger';
          infoAlert.textContent = data.error || 'Error al actualizar el perfil';
          infoAlert.style.display = 'block';
        }
      } catch (err) {
        console.error('Error al guardar perfil:', err);
        infoAlert.className = 'alert alert-danger';
        infoAlert.textContent = 'Error de conexión con el servidor';
        infoAlert.style.display = 'block';
      } finally {
        btnSave.disabled = false;
        btnSpan.innerHTML = originalText;
      }
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const passActual = document.getElementById('profile-password-actual').value;
      const passNueva = document.getElementById('profile-password-nueva').value;
      const passConfirmar = document.getElementById('profile-password-confirmar').value;
      const btnSavePass = document.getElementById('btn-save-password');

      passwordAlert.style.display = 'none';

      if (passNueva !== passConfirmar) {
        passwordAlert.className = 'alert alert-danger';
        passwordAlert.textContent = 'Las contraseñas nuevas no coinciden.';
        passwordAlert.style.display = 'block';
        return;
      }

      const tieneMinuscula = /[a-z]/.test(passNueva);
      const tieneMayuscula = /[A-Z]/.test(passNueva);
      const tieneNumero = /\d/.test(passNueva);
      const tieneEspecial = /[@$!%*?&._\-\/\+#]/.test(passNueva);

      if (passNueva.length < 8 || !tieneMinuscula || !tieneMayuscula || !tieneNumero || !tieneEspecial) {
        passwordAlert.className = 'alert alert-danger';
        passwordAlert.textContent = 'La nueva contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas, números y un carácter especial (@$!%*?&._-/#+).';
        passwordAlert.style.display = 'block';
        return;
      }

      btnSavePass.disabled = true;
      const btnSpan = btnSavePass.querySelector('span');
      const originalText = btnSpan.innerHTML;
      btnSpan.innerHTML = '<i class="bi bi-arrow-repeat bi-spin"></i> Actualizando...';

      try {
        const response = await fetch('/api/auth/password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passwordActual: passActual,
            passwordNueva: passNueva
          })
        });

        const data = await response.json();

        if (response.ok) {
          passwordAlert.className = 'alert alert-success';
          passwordAlert.textContent = 'Contraseña actualizada con éxito. Redirigiendo...';
          passwordAlert.style.display = 'block';
          passwordForm.reset();

          const userJson = localStorage.getItem('user');
          if (userJson) {
            const localUser = JSON.parse(userJson);
            if (localUser.requiresPasswordChange) {
              localUser.requiresPasswordChange = false;
              localStorage.setItem('user', JSON.stringify(localUser));
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            }
          }
        } else {
          passwordAlert.className = 'alert alert-danger';
          passwordAlert.textContent = data.error || 'Error al cambiar contraseña.';
          passwordAlert.style.display = 'block';
        }
      } catch (err) {
        console.error('Error al cambiar contraseña:', err);
        passwordAlert.className = 'alert alert-danger';
        passwordAlert.textContent = 'Error de conexión con el servidor';
        passwordAlert.style.display = 'block';
      } finally {
        btnSavePass.disabled = false;
        btnSpan.innerHTML = originalText;
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (err) {
        console.error('Error al cerrar sesión:', err);
      }
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    });
  }
}

window.openProfileModal = function() {
  const userJson = localStorage.getItem('user');
  if (!userJson) {
    window.location.href = 'login.html';
    return;
  }

  const user = JSON.parse(userJson);
  const modal = document.getElementById('profile-modal');
  if (!modal) return;

  document.getElementById('profile-name').value = user.nombre;
  document.getElementById('profile-email').value = user.correo;
  document.getElementById('profile-avatar-circle').textContent = user.nombre.charAt(0).toUpperCase();
  
  const roleLabel = document.getElementById('profile-role-badge');
  if (roleLabel) {
    roleLabel.textContent = user.rol === 'admin' ? 'Administradora' : 'Alumna';
  }

  document.getElementById('profile-info-alert').style.display = 'none';
  document.getElementById('profile-password-alert').style.display = 'none';
  document.getElementById('profile-password-form').reset();

  const closeBtn = document.getElementById('profile-close-btn');

  if (user.requiresPasswordChange) {
    if (closeBtn) closeBtn.style.display = 'none';
    
    document.querySelectorAll('.profile-tab-btn').forEach((b) => {
      if (b.getAttribute('data-tab') === 'tab-seguridad') {
        b.classList.add('active');
        b.style.display = 'block';
      } else {
        b.classList.remove('active');
        b.style.display = 'none';
      }
    });

    document.querySelectorAll('.profile-tab-pane').forEach((p) => {
      if (p.id === 'tab-seguridad') p.classList.add('active');
      else p.classList.remove('active');
    });

    const passwordAlert = document.getElementById('profile-password-alert');
    passwordAlert.className = 'alert alert-warning';
    passwordAlert.textContent = '🔒 Tu contraseña ha sido reiniciada por la administración. Por seguridad, debes establecer una nueva contraseña robusta para continuar.';
    passwordAlert.style.display = 'block';
  } else {
    if (closeBtn) closeBtn.style.display = 'block';

    document.querySelectorAll('.profile-tab-btn').forEach((b, i) => {
      b.style.display = 'block';
      if (i === 0) b.classList.add('active');
      else b.classList.remove('active');
    });

    document.querySelectorAll('.profile-tab-pane').forEach((p, i) => {
      if (i === 0) p.classList.add('active');
      else p.classList.remove('active');
    });
  }

  modal.classList.add('active');
};

document.addEventListener('click', (e) => {
  const toggleSearch = e.target.closest('#btn-toggle-search');
  const openProfile = e.target.closest('#btn-open-profile');

  if (toggleSearch) {
    e.preventDefault();
    if (typeof window.toggleSearchBar === 'function') {
      window.toggleSearchBar();
    }
  }

  if (openProfile) {
    e.preventDefault();
    if (typeof window.openProfileModal === 'function') {
      window.openProfileModal();
    }
  }
});

