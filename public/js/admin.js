// Variables de Estado
let token = localStorage.getItem('token');
let user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
let activeTab = 'cursos';
let loadedCourses = [];
let currentCursoIdGestion = null; // Para lecciones

// Validar Rol de Administrador
function verificarAccesoAdmin() {
  if (!user || user.rol !== 'admin') {
    document.getElementById('access-denied-view').style.display = 'block';
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
  } else {
    document.getElementById('main-view').style.display = 'block';
    document.getElementById('btn-logout').addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (err) {
        console.error('Error al cerrar sesión:', err);
      }
      localStorage.clear();
      window.location.href = 'index.html';
    });
    switchTab('cursos');
  }
}

// Switch de Pestañas
function switchTab(tab) {
  activeTab = tab;
  
  // Actualizar estilos sidebar
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.classList.remove('active');
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (onclickAttr.includes(`'${tab}'`)) {
      btn.classList.add('active');
    }
  });

  // Renderizar el contenedor correspondiente
  const container = document.getElementById('tab-content');
  
  // Resetear animación para que se ejecute la transición de entrada
  container.style.animation = 'none';
  container.offsetHeight; // Forzar reflow del navegador
  container.style.animation = '';

  if (tab === 'cursos') {
    renderCursosView(container);
  } else if (tab === 'suscripciones') {
    renderSuscripcionesView(container);
  } else if (tab === 'usuarios') {
    renderUsuariosView(container);
  } else if (tab === 'cupones') {
    renderCuponesView(container);
  } else if (tab === 'ventas') {
    renderVentasView(container);
  } else if (tab === 'blogs') {
    renderBlogsView(container);
  }
}

// --- TAB: CURSOS ---
async function renderCursosView(container) {
  container.innerHTML = `
    <div class="content-header">
      <h2 class="content-title">Gestión de Cursos</h2>
      <button class="btn-auth" onclick="openCursoModal()" style="margin-top:0; padding:0.6rem 1.2rem;">+ Nuevo Curso</button>
    </div>
    <div id="cursos-alert" class="alert" style="display: none; margin-bottom: 1rem;"></div>
    <div class="table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th class="col-id">ID</th>
            <th class="col-mini">Miniatura</th>
            <th class="col-title">Título</th>
            <th class="col-price">Precio</th>
            <th class="col-actions-cursos">Acciones</th>
          </tr>
        </thead>
        <tbody id="cursos-table-body">
          <tr><td colspan="5" style="text-align:center;">Cargando cursos...</td></tr>
        </tbody>
      </table>
    </div>
  `;
  await fetchCursos();
}

async function fetchCursos() {
  try {
    const response = await fetch('/api/admin/cursos', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || 'Error al cargar cursos');
    loadedCourses = data;
    
    const tbody = document.getElementById('cursos-table-body');
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay cursos registrados.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(curso => `
      <tr>
        <td class="col-id">${curso.id}</td>
        <td class="col-mini">
          <img src="${escapeHtml(curso.miniatura_url)}" alt="Miniatura" style="width: 70px; height: 40px; object-fit: cover; border-radius: 4px;" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'70\' height=\'40\' viewBox=\'0 0 70 40\'><rect width=\'100%\' height=\'100%\' fill=\'%231a1a1a\'/><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23d6af37\' font-family=\'sans-serif\' font-size=\'10\' font-weight=\'bold\'>BLUSH</text></svg>';">
        </td>
        <td class="col-title" style="font-weight: 500;">${escapeHtml(curso.titulo)}</td>
        <td class="col-price"><strong>Q${parseFloat(curso.precio).toFixed(2)}</strong></td>
        <td class="col-actions-cursos">
          <div class="actions-cell">
            <button class="btn-action lessons" onclick="openLeccionesModal(${curso.id}, '${escapeHtml(curso.titulo.replace(/'/g, "\\'"))}')"><i class="bi bi-list-nested"></i> Temario</button>
            <button class="btn-action edit" onclick="openCursoModal(${curso.id})"><i class="bi bi-pencil-square"></i> Editar</button>
            <button class="btn-action delete" onclick="deleteCurso(${curso.id})"><i class="bi bi-trash"></i> Eliminar</button>
          </div>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    showTabAlert('cursos-alert', 'danger', error.message);
  }
}

// Modal de Cursos
// eslint-disable-next-line no-unused-vars
function openCursoModal(cursoId = null) {
  const modal = document.getElementById('curso-modal');
  const title = document.getElementById('curso-modal-title');
  const form = document.getElementById('curso-form');
  
  form.reset();
  document.getElementById('curso-id-input').value = '';

  const preview = document.getElementById('curso-image-preview');
  const placeholder = document.getElementById('curso-image-preview-placeholder');
  const fileInfo = document.getElementById('curso-file-info');
  const fileInput = document.getElementById('curso-image-file');
  
  if (fileInput) fileInput.value = '';
  if (fileInfo) fileInfo.textContent = '';
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
  if (placeholder) placeholder.style.display = 'block';
  document.getElementById('curso-miniatura').value = '';
  document.getElementById('curso-trailer').value = 'dQw4w9WgXcQ';

  if (cursoId) {
    title.textContent = 'Editar Curso';
    const curso = loadedCourses.find(c => c.id === cursoId);
    if (curso) {
      document.getElementById('curso-id-input').value = curso.id;
      document.getElementById('curso-titulo').value = curso.titulo;
      document.getElementById('curso-desc').value = curso.descripcion;
      document.getElementById('curso-precio').value = curso.precio;
      document.getElementById('curso-miniatura').value = curso.miniatura_url;
      document.getElementById('curso-trailer').value = curso.trailer_youtube_id || 'dQw4w9WgXcQ';
      
      if (preview && curso.miniatura_url) {
        preview.src = curso.miniatura_url;
        preview.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
      }
    }
  } else {
    title.textContent = 'Nuevo Curso';
  }

  modal.style.display = 'flex';
}

document.getElementById('curso-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cursoId = document.getElementById('curso-id-input').value;
  const payload = {
    titulo: document.getElementById('curso-titulo').value.trim(),
    descripcion: document.getElementById('curso-desc').value.trim(),
    precio: parseFloat(document.getElementById('curso-precio').value),
    miniatura_url: document.getElementById('curso-miniatura').value.trim(),
    trailer_youtube_id: document.getElementById('curso-trailer').value.trim()
  };

  const method = cursoId ? 'PUT' : 'POST';
  const url = cursoId ? `/api/admin/cursos/${cursoId}` : '/api/admin/cursos';

  const btnSave = e.target.querySelector('button[type="submit"]');
  const originalText = btnSave.textContent;
  try {
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="bi bi-arrow-repeat bi-spin" style="margin-right: 6px;"></i> Guardando...';
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al procesar curso');

    closeModal('curso');
    fetchCursos();
  } catch (error) {
    alert(error.message);
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = originalText;
  }
});

async function deleteCurso(id) {
  if (!confirm('¿Estás segura de eliminar este curso? Se borrarán todas sus lecciones e inscripciones vinculadas.')) return;
  try {
    const response = await fetch(`/api/admin/cursos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al eliminar curso');
    }
    fetchCursos();
  } catch (error) {
    alert(error.message);
  }
}


// --- GESTIÓN DE TEMARIO (MÓDULOS Y LECCIONES) ---
let draggedModuleId = null;
let draggedLessonId = null;
let loadedPasos = [];
let loadedLecciones = [];

// eslint-disable-next-line no-unused-vars
async function openLeccionesModal(cursoId, cursoTitulo) {
  currentCursoIdGestion = cursoId;
  document.getElementById('lecciones-modal-title').textContent = `Temario: ${cursoTitulo}`;
  document.getElementById('lecciones-modal').style.display = 'flex';
  document.getElementById('lecciones-alert').style.display = 'none';
  
  await fetchTemario(cursoId);
}

async function fetchTemario(cursoId) {
  const container = document.getElementById('temario-modulos-container');
  container.innerHTML = '<div style="text-align:center; padding:2rem;"><i class="bi bi-arrow-repeat bi-spin" style="font-size:2rem; color:var(--color-primary);"></i><p style="margin-top:0.5rem;">Cargando temario...</p></div>';
  
  try {
    // 1. Obtener pasos (módulos)
    const resPasos = await fetch(`/api/admin/cursos/${cursoId}/pasos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resPasos.ok) throw new Error('Error al cargar los módulos');
    loadedPasos = await resPasos.json();
    
    // 2. Obtener lecciones
    const resLecciones = await fetch(`/api/admin/cursos/${cursoId}/lecciones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resLecciones.ok) throw new Error('Error al cargar las lecciones');
    loadedLecciones = await resLecciones.json();
    
    renderTemarioHtml();
  } catch (error) {
    showTabAlert('lecciones-alert', 'danger', error.message);
  }
}

function renderTemarioHtml() {
  const container = document.getElementById('temario-modulos-container');
  
  if (loadedPasos.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; background: var(--color-light); border: 2px dashed var(--color-gray-light); border-radius: var(--border-radius);">
        <i class="bi bi-journal-x" style="font-size: 3rem; color: var(--color-gray);"></i>
        <h3 style="font-family: var(--font-title); font-size: 1.5rem; margin-top: 1rem; margin-bottom: 0.5rem;">Sin Módulos</h3>
        <p style="color: var(--color-gray); margin-bottom: 1.5rem;">Este curso aún no tiene módulos configurados. Crea uno para comenzar a agregar clases.</p>
        <button class="btn-primary" onclick="openModuloModal()" style="padding: 0.6rem 1.2rem; font-size: 0.85rem; margin-top: 0;">Crear Primer Módulo</button>
      </div>
    `;
    return;
  }
  
  let html = '';
  
  loadedPasos.forEach((paso, index) => {
    const leccionesPaso = loadedLecciones.filter(l => l.paso_id === paso.id);
    
    // Zona de soltado antes del elemento
    html += `
      <div class="drop-zone" data-index="${index}" ondragover="allowDrop(event)" ondragenter="dragEnter(event)" ondragleave="dragLeave(event)" ondrop="handleDrop(event)">
        <i class="bi bi-plus-circle-dotted"></i> Soltar aquí para mover
      </div>
    `;
    
    // Tarjeta del módulo
    html += `
      <div class="module-card" draggable="true" data-id="${paso.id}" ondragstart="handleDragStart(event)" ondragend="handleDragEnd(event)" style="border: 1px solid var(--color-gray-light); border-radius: var(--border-radius); background: white; margin-bottom: 0.5rem; overflow: hidden; box-shadow: var(--shadow); transition: transform 0.2s ease, box-shadow 0.2s ease;">
        <div class="module-card-header">
          <div class="drag-handle" style="cursor: move; color: var(--color-gray); font-size: 1.2rem;"><i class="bi bi-grip-vertical"></i></div>
          
          <div class="module-img-frame">
            <img src="${paso.miniatura_url || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'70\' height=\'40\' viewBox=\'0 0 70 40\'><rect width=\'100%\' height=\'100%\' fill=\'%231a1a1a\'/><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23d6af37\' font-family=\'sans-serif\' font-size=\'10\' font-weight=\'bold\'>MOD</text></svg>'}" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'70\' height=\'40\' viewBox=\'0 0 70 40\'><rect width=\'100%\' height=\'100%\' fill=\'%231a1a1a\'/><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23d6af37\' font-family=\'sans-serif\' font-size=\'10\' font-weight=\'bold\'>MOD</text></svg>';">
          </div>
          
          <div class="module-info-admin">
            <h4>${escapeHtml(paso.titulo)}</h4>
            <p>${escapeHtml(paso.descripcion || 'Sin descripción')}</p>
          </div>
          
          <div class="module-actions-admin">
            <button class="btn-action lessons" onclick="openLeccionFormModal(${paso.id})"><i class="bi bi-plus-circle"></i> + Clase</button>
            <button class="btn-action edit" onclick="openModuloModal(${paso.id})"><i class="bi bi-pencil"></i></button>
            <button class="btn-action delete" onclick="deleteModulo(${paso.id})"><i class="bi bi-trash"></i></button>
          </div>
        </div>
        
        <div class="module-card-body" style="padding: 0.5rem 1rem 1rem 1rem;">
          <div class="lessons-list-admin" style="display: flex; flex-direction: column; gap: 0.4rem;">
            ${leccionesPaso.length === 0 ? `
              <div class="lesson-drop-zone" data-paso-id="${paso.id}" data-index="0" ondragover="allowLessonDrop(event)" ondragenter="lessonDragEnter(event)" ondragleave="lessonDragLeave(event)" ondrop="handleLessonDrop(event)">
                <i class="bi bi-plus-circle-dotted"></i> Soltar clase aquí
              </div>
              <div style="text-align: center; padding: 1rem; color: var(--color-gray); font-size: 0.8rem; border: 1px dashed #eee; border-radius: 4px;">
                Este módulo no tiene clases registradas. Haz clic en "+ Clase" para agregar una.
              </div>
            ` : (function() {
              let lessonsHtml = '';
              leccionesPaso.forEach((leccion, lIndex) => {
                lessonsHtml += `
                  <div class="lesson-drop-zone" data-paso-id="${paso.id}" data-index="${lIndex}" ondragover="allowLessonDrop(event)" ondragenter="lessonDragEnter(event)" ondragleave="lessonDragLeave(event)" ondrop="handleLessonDrop(event)">
                    <i class="bi bi-plus-circle-dotted"></i> Soltar clase aquí
                  </div>
                  <div class="lesson-row-admin" draggable="true" data-id="${leccion.id}" ondragstart="handleLessonDragStart(event)" ondragend="handleLessonDragEnd(event)">
                    <div class="lesson-info-admin">
                      <div class="drag-handle-lesson" style="cursor: move; color: var(--color-gray); font-size: 1.1rem; display: flex; align-items: center;"><i class="bi bi-grip-vertical"></i></div>
                      <span style="font-weight: 600; color: var(--color-primary-dark); background: #fdfaf2; padding: 0.1rem 0.4rem; border-radius: 3px; font-size: 0.75rem;">Clase ${leccion.orden}</span>
                      <span class="lesson-title-admin" title="${escapeHtml(leccion.titulo)}">${escapeHtml(leccion.titulo)}</span>
                      <span class="lesson-youtube-id">(${escapeHtml(leccion.youtube_id)})</span>
                    </div>
                    <div class="lesson-actions-admin">
                      <button class="btn-action edit" onclick="openLeccionFormModal(${paso.id}, ${leccion.id})"><i class="bi bi-pencil-square"></i></button>
                      <button class="btn-action delete" onclick="deleteLeccion(${leccion.id})"><i class="bi bi-trash"></i></button>
                    </div>
                  </div>
                `;
              });
              lessonsHtml += `
                <div class="lesson-drop-zone" data-paso-id="${paso.id}" data-index="${leccionesPaso.length}" ondragover="allowLessonDrop(event)" ondragenter="lessonDragEnter(event)" ondragleave="lessonDragLeave(event)" ondrop="handleLessonDrop(event)">
                  <i class="bi bi-plus-circle-dotted"></i> Soltar clase al final
                </div>
              `;
              return lessonsHtml;
            })()}
          </div>
        </div>
      </div>
    `;
  });
  
  // Zona de soltado al final
  html += `
    <div class="drop-zone" data-index="${loadedPasos.length}" ondragover="allowDrop(event)" ondragenter="dragEnter(event)" ondragleave="dragLeave(event)" ondrop="handleDrop(event)">
      <i class="bi bi-plus-circle-dotted"></i> Soltar aquí para mover al final
    </div>
  `;
  
  container.innerHTML = html;
}

// LÓGICA DRAG AND DROP DE MÓDULOS
// eslint-disable-next-line no-unused-vars
function handleDragStart(event) {
  const card = event.currentTarget;
  draggedModuleId = parseInt(card.getAttribute('data-id'), 10);
  card.classList.add('dragging');
  event.dataTransfer.setData('text/plain', draggedModuleId);
  event.dataTransfer.effectAllowed = 'move';
  document.getElementById('temario-modulos-container').classList.add('drag-active');
}

// eslint-disable-next-line no-unused-vars
function handleDragEnd(event) {
  event.currentTarget.classList.remove('dragging');
  document.getElementById('temario-modulos-container').classList.remove('drag-active');
  document.querySelectorAll('.drop-zone').forEach(zone => {
    zone.classList.remove('drop-zone-hover');
  });
}

// eslint-disable-next-line no-unused-vars
function allowDrop(event) {
  event.preventDefault();
}

// eslint-disable-next-line no-unused-vars
function dragEnter(event) {
  event.preventDefault();
  event.currentTarget.classList.add('drop-zone-hover');
}

// eslint-disable-next-line no-unused-vars
function dragLeave(event) {
  event.currentTarget.classList.remove('drop-zone-hover');
}

// eslint-disable-next-line no-unused-vars
async function handleDrop(event) {
  event.preventDefault();
  const zone = event.currentTarget;
  zone.classList.remove('drop-zone-hover');
  
  const targetIndex = parseInt(zone.getAttribute('data-index'), 10);
  
  // Reordenar localmente
  const draggedIndex = loadedPasos.findIndex(p => p.id === draggedModuleId);
  if (draggedIndex === -1) return;
  
  const [draggedPaso] = loadedPasos.splice(draggedIndex, 1);
  
  let insertIndex = targetIndex;
  if (draggedIndex < targetIndex) {
    insertIndex = targetIndex - 1;
  }
  
  loadedPasos.splice(insertIndex, 0, draggedPaso);
  renderTemarioHtml();
  
  const orderedIds = loadedPasos.map(p => p.id);
  
  try {
    const response = await fetch(`/api/admin/cursos/${currentCursoIdGestion}/pasos/reordenar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ids: orderedIds })
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al reordenar');
    }
  } catch (error) {
    alert('Error al guardar el orden: ' + error.message);
    await fetchTemario(currentCursoIdGestion);
  }
}

// LÓGICA DRAG AND DROP DE LECCIONES (CLASES)
// eslint-disable-next-line no-unused-vars
function handleLessonDragStart(event) {
  const row = event.currentTarget;
  draggedLessonId = parseInt(row.getAttribute('data-id'), 10);
  row.classList.add('dragging');
  event.dataTransfer.setData('text/plain', draggedLessonId);
  event.dataTransfer.effectAllowed = 'move';
  
  // Detener la propagación para que el módulo contenedor no inicie su propio drag
  event.stopPropagation();
  
  // Activar visualmente las zonas de soltado de lecciones
  document.querySelectorAll('.lessons-list-admin').forEach(list => {
    list.classList.add('drag-active-lesson');
  });
}

// eslint-disable-next-line no-unused-vars
function handleLessonDragEnd(event) {
  event.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.lessons-list-admin').forEach(list => {
    list.classList.remove('drag-active-lesson');
  });
  document.querySelectorAll('.lesson-drop-zone').forEach(zone => {
    zone.classList.remove('lesson-drop-zone-hover');
  });
}

// eslint-disable-next-line no-unused-vars
function allowLessonDrop(event) {
  event.preventDefault();
}

// eslint-disable-next-line no-unused-vars
function lessonDragEnter(event) {
  event.preventDefault();
  event.currentTarget.classList.add('lesson-drop-zone-hover');
}

// eslint-disable-next-line no-unused-vars
function lessonDragLeave(event) {
  event.currentTarget.classList.remove('lesson-drop-zone-hover');
}

// eslint-disable-next-line no-unused-vars
async function handleLessonDrop(event) {
  event.preventDefault();
  const zone = event.currentTarget;
  zone.classList.remove('lesson-drop-zone-hover');
  
  const pasoId = parseInt(zone.getAttribute('data-paso-id'), 10);
  const targetIndex = parseInt(zone.getAttribute('data-index'), 10);
  
  const draggedLesson = loadedLecciones.find(l => l.id === draggedLessonId);
  if (!draggedLesson) return;
  
  // Algoritmo de reordenamiento de clases agrupando por pasos
  const groups = {};
  loadedPasos.forEach(p => {
    groups[p.id] = loadedLecciones.filter(l => l.paso_id === p.id && l.id !== draggedLessonId);
  });
  
  // Cambiar el módulo de la lección arrastrada al paso actual
  draggedLesson.paso_id = pasoId;
  
  if (!groups[pasoId]) {
    groups[pasoId] = [];
  }
  groups[pasoId].splice(targetIndex, 0, draggedLesson);
  
  // Re-secuenciar y aplanar la lista de lecciones asignando orden correlativo por módulo
  const newLecciones = [];
  loadedPasos.forEach(p => {
    let currentOrder = 1;
    const group = groups[p.id] || [];
    group.forEach(l => {
      l.orden = currentOrder++;
      newLecciones.push(l);
    });
  });
  
  loadedLecciones = newLecciones;
  renderTemarioHtml();
  
  const payload = loadedLecciones.map(l => ({
    id: l.id,
    orden: l.orden,
    paso_id: l.paso_id
  }));
  
  try {
    const response = await fetch(`/api/admin/cursos/${currentCursoIdGestion}/lecciones/reordenar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ lecciones: payload })
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al guardar el nuevo orden de clases.');
    }
  } catch (error) {
    alert('Error al guardar el orden de las clases: ' + error.message);
    await fetchTemario(currentCursoIdGestion);
  }
}

// CRUD MÓDULOS GESTIÓN
// eslint-disable-next-line no-unused-vars
function openModuloModal(moduloId = null) {
  const modal = document.getElementById('modulo-modal');
  const title = document.getElementById('modulo-modal-title');
  const form = document.getElementById('modulo-form');
  
  form.reset();
  document.getElementById('modulo-id-input').value = '';
  
  const preview = document.getElementById('modulo-image-preview');
  const placeholder = document.getElementById('modulo-image-preview-placeholder');
  const fileInfo = document.getElementById('modulo-file-info');
  const fileInput = document.getElementById('modulo-image-file');
  
  if (fileInput) fileInput.value = '';
  if (fileInfo) fileInfo.textContent = '';
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
  if (placeholder) placeholder.style.display = 'block';
  document.getElementById('modulo-miniatura-url').value = '';
  document.getElementById('modulo-alert').style.display = 'none';
  
  if (moduloId) {
    title.textContent = 'Editar Módulo';
    const paso = loadedPasos.find(p => p.id === moduloId);
    if (paso) {
      document.getElementById('modulo-id-input').value = paso.id;
      document.getElementById('modulo-titulo').value = paso.titulo;
      document.getElementById('modulo-desc').value = paso.descripcion || '';
      document.getElementById('modulo-miniatura-url').value = paso.miniatura_url || '';
      
      if (preview && paso.miniatura_url) {
        preview.src = paso.miniatura_url;
        preview.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
      }
    }
  } else {
    title.textContent = 'Nuevo Módulo';
  }
  
  modal.style.display = 'flex';
}

document.getElementById('modulo-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const moduloId = document.getElementById('modulo-id-input').value;
  const payload = {
    titulo: document.getElementById('modulo-titulo').value.trim(),
    descripcion: document.getElementById('modulo-desc').value.trim(),
    miniatura_url: document.getElementById('modulo-miniatura-url').value.trim()
  };
  
  const method = moduloId ? 'PUT' : 'POST';
  const url = moduloId ? `/api/admin/pasos/${moduloId}` : `/api/admin/cursos/${currentCursoIdGestion}/pasos`;
  
  const btnSave = e.target.querySelector('button[type="submit"]');
  const originalText = btnSave.textContent;
  
  try {
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="bi bi-arrow-repeat bi-spin" style="margin-right: 6px;"></i> Guardando...';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al guardar módulo');
    
    closeModal('modulo');
    await fetchTemario(currentCursoIdGestion);
  } catch (error) {
    showTabAlert('modulo-alert', 'danger', error.message);
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = originalText;
  }
});

// eslint-disable-next-line no-unused-vars
async function deleteModulo(id) {
  if (!confirm('¿Estás segura de eliminar este módulo? Las clases asociadas quedarán sin módulo asignado (Otras Lecciones).')) return;
  try {
    const response = await fetch(`/api/admin/pasos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al eliminar módulo');
    }
    await fetchTemario(currentCursoIdGestion);
  } catch (error) {
    alert(error.message);
  }
}

// CRUD CLASES GESTIÓN (FORM EN MODAL)
// eslint-disable-next-line no-unused-vars
function openLeccionFormModal(pasoId, leccionId = null) {
  const modal = document.getElementById('leccion-form-modal');
  const actionTitle = document.getElementById('leccion-modal-title-action');
  const form = document.getElementById('leccion-form-modal-element');
  
  form.reset();
  document.getElementById('leccion-id-input').value = '';
  document.getElementById('leccion-paso-id-input').value = pasoId;
  document.getElementById('leccion-alert-modal').style.display = 'none';
  
  if (leccionId) {
    actionTitle.textContent = 'Editar Clase';
    const leccion = loadedLecciones.find(l => l.id === leccionId);
    if (leccion) {
      document.getElementById('leccion-id-input').value = leccion.id;
      document.getElementById('leccion-titulo').value = leccion.titulo;
      document.getElementById('leccion-orden').value = leccion.orden;
      document.getElementById('leccion-yt').value = leccion.youtube_id;
    }
  } else {
    actionTitle.textContent = 'Agregar Clase';
    
    const leccionesPaso = loadedLecciones.filter(l => l.paso_id === pasoId);
    const maxOrden = leccionesPaso.reduce((max, l) => l.orden > max ? l.orden : max, 0);
    document.getElementById('leccion-orden').value = maxOrden + 1;
  }
  
  modal.style.display = 'flex';
}

document.getElementById('leccion-form-modal-element').addEventListener('submit', async (e) => {
  e.preventDefault();
  const leccionId = document.getElementById('leccion-id-input').value;
  const pasoId = parseInt(document.getElementById('leccion-paso-id-input').value, 10);
  const payload = {
    titulo: document.getElementById('leccion-titulo').value.trim(),
    orden: parseInt(document.getElementById('leccion-orden').value, 10),
    youtube_id: document.getElementById('leccion-yt').value.trim(),
    paso_id: pasoId
  };
  
  const method = leccionId ? 'PUT' : 'POST';
  const url = leccionId ? `/api/admin/lecciones/${leccionId}` : `/api/admin/cursos/${currentCursoIdGestion}/lecciones`;
  
  const btnSave = e.target.querySelector('button[type="submit"]');
  const originalText = btnSave.textContent;
  
  try {
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="bi bi-arrow-repeat bi-spin" style="margin-right: 6px;"></i> Guardando...';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al guardar la clase');
    
    closeModal('leccion-form');
    await fetchTemario(currentCursoIdGestion);
  } catch (error) {
    showTabAlert('leccion-alert-modal', 'danger', error.message);
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = originalText;
  }
});

// eslint-disable-next-line no-unused-vars
async function deleteLeccion(id) {
  if (!confirm('¿Estás segura de eliminar esta clase?')) return;
  try {
    const response = await fetch(`/api/admin/lecciones/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al eliminar clase');
    }
    await fetchTemario(currentCursoIdGestion);
  } catch (error) {
    alert(error.message);
  }
}


// --- TAB: SUSCRIPCIONES ---
async function renderSuscripcionesView(container) {
  container.innerHTML = `
    <div class="content-header">
      <h2 class="content-title">Control de Suscripciones</h2>
    </div>
    <div id="sub-alert" class="alert" style="display: none; margin-bottom: 1.5rem;"></div>

    <!-- Formulario Rápido de Alta Manual -->
    <div style="background-color: var(--color-gray-light); padding: 1.5rem; border-radius: var(--border-radius); margin-bottom: 2rem;">
      <h3 style="font-size: 1.1rem; margin-bottom: 1rem; font-family: var(--font-title); letter-spacing: 0.5px;">Matricular Alumna Manualmente</h3>
      <form id="sub-manual-form" style="display: grid; grid-template-columns: 2fr 2fr 1fr; gap: 1rem; align-items: end;">
        <div>
          <label for="sub-correo" class="form-label" style="font-size: 0.8rem;">Correo de la Alumna</label>
          <input type="email" id="sub-correo" class="form-control" placeholder="alumna@correo.com" required style="padding: 0.6rem;">
        </div>
        <div>
          <label for="sub-curso-select" class="form-label" style="font-size: 0.8rem;">Curso</label>
          <select id="sub-curso-select" class="form-control" required style="padding: 0.6rem; border: 1px solid var(--color-gray-light); border-radius: var(--border-radius); background: white;">
            <option value="">Seleccione un curso...</option>
          </select>
        </div>
        <div>
          <button type="submit" class="btn-auth" style="margin-top:0; width:100%; padding:0.7rem 1rem;">Matricular</button>
        </div>
      </form>
    </div>

    <div class="table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th class="col-alumna">Alumna</th>
            <th class="col-correo">Correo</th>
            <th class="col-curso">Curso</th>
            <th class="col-status">Estado</th>
            <th class="col-actions-subs">Acciones</th>
          </tr>
        </thead>
        <tbody id="subs-table-body">
          <tr><td colspan="5" style="text-align:center;">Cargando suscripciones...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  // Cargar catálogo de cursos en el dropdown select
  try {
    const resCursos = await fetch('/api/cursos');
    const cursos = await resCursos.json();
    const select = document.getElementById('sub-curso-select');
    cursos.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.titulo;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Error al cargar dropdown cursos:', err);
  }

  // Enlace manual
  document.getElementById('sub-manual-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.textContent;
    const payload = {
      correo: document.getElementById('sub-correo').value.trim(),
      curso_id: parseInt(document.getElementById('sub-curso-select').value, 10),
      es_activo: 1
    };

    try {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="bi bi-arrow-repeat bi-spin" style="margin-right: 6px;"></i> Matriculando...';
      const response = await fetch('/api/admin/inscripciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al matricular');

      showTabAlert('sub-alert', 'success', 'Alumna matriculada con éxito');
      document.getElementById('sub-manual-form').reset();
      fetchSuscripciones();
    } catch (error) {
      showTabAlert('sub-alert', 'danger', error.message);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = originalText;
    }
  });

  await fetchSuscripciones();
}

async function fetchSuscripciones() {
  try {
    const response = await fetch('/api/admin/inscripciones', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al cargar suscripciones');

    const tbody = document.getElementById('subs-table-body');
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay suscripciones registradas.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(sub => `
      <tr>
        <td class="col-alumna" style="font-weight:500;">${escapeHtml(sub.usuario_nombre)}</td>
        <td class="col-correo"><code>${escapeHtml(sub.usuario_correo)}</code></td>
        <td class="col-curso">${escapeHtml(sub.curso_titulo)}</td>
        <td class="col-status">
          <span class="badge ${sub.es_activo ? 'badge-success' : 'badge-danger'}">
            ${sub.es_activo ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td class="col-actions-subs">
          <div class="actions-cell">
            <button class="btn-action edit" onclick="toggleSuscripcion(${sub.id}, ${sub.es_activo})">
              ${sub.es_activo ? '<i class="bi bi-x-circle"></i> Desactivar' : '<i class="bi bi-check-circle"></i> Activar'}
            </button>
            <button class="btn-action delete" onclick="deleteSuscripcion(${sub.id})"><i class="bi bi-trash"></i> Revocar</button>
          </div>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    showTabAlert('sub-alert', 'danger', error.message);
  }
}

// eslint-disable-next-line no-unused-vars
async function toggleSuscripcion(id, esActivoActual) {
  try {
    const response = await fetch(`/api/admin/inscripciones/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ es_activo: !esActivoActual })
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al cambiar estado');
    }
    fetchSuscripciones();
  } catch (error) {
    alert(error.message);
  }
}

// eslint-disable-next-line no-unused-vars
async function deleteSuscripcion(id) {
  if (!confirm('¿Estás segura de revocar esta suscripción? La alumna perderá acceso inmediato.')) return;
  try {
    const response = await fetch(`/api/admin/inscripciones/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al revocar');
    }
    fetchSuscripciones();
  } catch (error) {
    alert(error.message);
  }
}


// --- TAB: USUARIAS ---
async function renderUsuariosView(container) {
  container.innerHTML = `
    <div class="content-header">
      <h2 class="content-title">Listado de Usuarias</h2>
    </div>
    <div id="users-alert" class="alert" style="display: none; margin-bottom: 1rem;"></div>
    <div class="table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th class="col-id">ID</th>
            <th class="col-alumna">Nombre</th>
            <th class="col-correo">Correo Electrónico</th>
            <th class="col-rol">Rol</th>
            <th class="col-date">Fecha Registro</th>
            <th class="col-actions-users">Acciones</th>
          </tr>
        </thead>
        <tbody id="users-table-body">
          <tr><td colspan="6" style="text-align:center;">Cargando usuarias...</td></tr>
        </tbody>
      </table>
    </div>
  `;
  await fetchUsuarios();
}

async function fetchUsuarios() {
  try {
    const response = await fetch('/api/admin/usuarios', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al cargar usuarios');

    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = data.map(u => `
      <tr>
        <td class="col-id">${u.id}</td>
        <td class="col-alumna" style="font-weight: 500;">${escapeHtml(u.nombre)}</td>
        <td class="col-correo"><code>${escapeHtml(u.correo)}</code></td>
        <td class="col-rol">
          <span class="badge ${u.rol === 'admin' ? 'badge-primary' : 'badge-success'}">
            ${u.rol}
          </span>
        </td>
        <td class="col-date">${new Date(u.fecha_creacion).toLocaleDateString()}</td>
        <td class="col-actions-users">
          <div class="actions-cell">
            <button class="btn-action edit" onclick="openUserCoursesModal(${u.id}, '${escapeHtml(u.nombre.replace(/'/g, "\\'"))}')" style="margin-right: 0.25rem;">
              <i class="bi bi-journal-check"></i> Cursos
            </button>
            <button class="btn-action delete" onclick="openResetPasswordModal(${u.id}, '${escapeHtml(u.nombre.replace(/'/g, "\\'"))}')">
              <i class="bi bi-shield-slash"></i> Contraseña
            </button>
          </div>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    showTabAlert('users-alert', 'danger', error.message);
  }
}

let currentUserIdGestion = null;
// eslint-disable-next-line no-unused-vars
async function openUserCoursesModal(usuarioId, usuarioNombre) {
  currentUserIdGestion = usuarioId;
  document.getElementById('user-courses-modal-title').textContent = `Cursos de: ${usuarioNombre}`;
  document.getElementById('user-courses-modal').style.display = 'flex';
  document.getElementById('user-courses-alert').style.display = 'none';
  await fetchUserCourses(usuarioId);
}

async function fetchUserCourses(usuarioId) {
  try {
    const response = await fetch(`/api/admin/usuarios/${usuarioId}/cursos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al obtener cursos de la usuaria');

    const tbody = document.getElementById('user-courses-table-body');
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay cursos en el sistema.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(c => `
      <tr>
        <td class="col-curso" style="font-weight: 500;">${escapeHtml(c.titulo)}</td>
        <td class="col-status">
          <span class="badge ${c.inscrito ? 'badge-success' : 'badge-danger'}">
            ${c.inscrito ? 'Inscrita' : 'Sin Acceso'}
          </span>
        </td>
        <td class="col-actions-users">
          <div class="actions-cell">
            ${c.inscrito 
              ? `<button class="btn-action delete" onclick="revokeUserCourse(${usuarioId}, ${c.id})"><i class="bi bi-x-circle"></i> Revocar</button>`
              : `<button class="btn-action edit" onclick="assignUserCoursePrep(${usuarioId}, ${c.id}, '${escapeHtml(c.titulo.replace(/'/g, "\\'"))}', ${c.precio})"><i class="bi bi-check-circle"></i> Asignar</button>`
            }
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showTabAlert('user-courses-alert', 'danger', error.message);
  }
}

// eslint-disable-next-line no-unused-vars
async function revokeUserCourse(usuarioId, cursoId) {
  if (!confirm('¿Estás segura de revocar el acceso a este curso?')) return;
  try {
    const response = await fetch(`/api/admin/usuarios/${usuarioId}/cursos/${cursoId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al revocar curso');

    showTabAlert('user-courses-alert', 'success', 'Acceso revocado con éxito');
    await fetchUserCourses(usuarioId);
  } catch (error) {
    showTabAlert('user-courses-alert', 'danger', error.message);
  }
}

// eslint-disable-next-line no-unused-vars
function assignUserCoursePrep(usuarioId, cursoId, cursoTitulo, cursoPrecio) {
  document.getElementById('assign-usuario-id').value = usuarioId;
  document.getElementById('assign-curso-id').value = cursoId;
  document.getElementById('assign-curso-titulo').value = cursoTitulo;
  document.getElementById('assign-monto').value = parseFloat(cursoPrecio).toFixed(2);
  document.getElementById('assign-metodo').value = 'VisaLink';
  document.getElementById('assign-referencia').value = '';
  
  document.getElementById('assign-course-alert').style.display = 'none';
  document.getElementById('assign-course-modal').style.display = 'flex';
}

document.getElementById('assign-course-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const usuarioId = document.getElementById('assign-usuario-id').value;
  const cursoId = parseInt(document.getElementById('assign-curso-id').value, 10);
  const payload = {
    curso_id: cursoId,
    precio_pagado: parseFloat(document.getElementById('assign-monto').value),
    metodo_pago: document.getElementById('assign-metodo').value,
    referencia: document.getElementById('assign-referencia').value.trim()
  };

  const btnSave = e.target.querySelector('button[type="submit"]');
  const originalText = btnSave.textContent;
  try {
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="bi bi-arrow-repeat bi-spin" style="margin-right: 6px;"></i> Procesando...';
    const response = await fetch(`/api/admin/usuarios/${usuarioId}/cursos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al asignar curso');

    closeModal('assign-course');
    showTabAlert('user-courses-alert', 'success', 'Curso asignado y venta registrada');
    await fetchUserCourses(usuarioId);
  } catch (error) {
    showTabAlert('assign-course-alert', 'danger', error.message);
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = originalText;
  }
});

// eslint-disable-next-line no-unused-vars
function openResetPasswordModal(usuarioId, usuarioNombre) {
  document.getElementById('reset-password-usuario-id').value = usuarioId;
  document.getElementById('reset-password-usuario-nombre').value = usuarioNombre;
  document.getElementById('reset-password-alert').style.display = 'none';
  document.getElementById('reset-password-result-container').style.display = 'none';
  document.getElementById('reset-password-temporal-val').value = '';
  
  const btnSubmit = document.getElementById('btn-submit-reset-pass');
  btnSubmit.disabled = false;
  btnSubmit.textContent = 'Generar Contraseña Temporal';
  document.getElementById('reset-password-modal').style.display = 'flex';
}

document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const usuarioId = document.getElementById('reset-password-usuario-id').value;
  const btnSubmit = document.getElementById('btn-submit-reset-pass');
  const alertBox = document.getElementById('reset-password-alert');
  const resultContainer = document.getElementById('reset-password-result-container');
  const tempPassInput = document.getElementById('reset-password-temporal-val');

  alertBox.style.display = 'none';
  resultContainer.style.display = 'none';

  try {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="bi bi-arrow-repeat bi-spin" style="margin-right: 6px;"></i> Generando...';

    const response = await fetch(`/api/admin/usuarios/${usuarioId}/password-reset`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al reiniciar contraseña');

    tempPassInput.value = data.passwordTemporal;
    resultContainer.style.display = 'block';
    
    alertBox.textContent = '¡Contraseña temporal generada con éxito!';
    alertBox.className = 'alert alert-success';
    alertBox.style.display = 'block';

    btnSubmit.textContent = 'Generar Nueva Contraseña Temporal';
  } catch (error) {
    alertBox.textContent = error.message;
    alertBox.className = 'alert alert-danger';
    alertBox.style.display = 'block';
    btnSubmit.textContent = 'Generar Contraseña Temporal';
  } finally {
    btnSubmit.disabled = false;
  }
});

window.copyTempPassword = function() {
  const tempPassInput = document.getElementById('reset-password-temporal-val');
  tempPassInput.select();
  tempPassInput.setSelectionRange(0, 99999); // Para móviles

  navigator.clipboard.writeText(tempPassInput.value)
    .then(() => {
      const btnCopy = document.getElementById('btn-copy-temp-pass');
      const originalHtml = btnCopy.innerHTML;
      btnCopy.innerHTML = '<i class="bi bi-check-lg"></i> Copiado';
      setTimeout(() => {
        btnCopy.innerHTML = originalHtml;
      }, 2000);
    })
    .catch(err => {
      console.error('Error al copiar al portapapeles: ', err);
      alert('No se pudo copiar automáticamente. Por favor, selecciona el texto y cópialo manualmente.');
    });
};

// --- TAB: VENTAS Y REPORTES ---
async function renderVentasView(container) {
  container.innerHTML = `
    <div class="content-header">
      <h2 class="content-title"><i class="bi bi-graph-up-arrow"></i> Ventas y Reportes</h2>
    </div>
    <div id="ventas-alert" class="alert" style="display: none; margin-bottom: 1.5rem;"></div>

    <!-- KPI Cards Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
      <div style="background-color: var(--color-white); border: 1px solid var(--color-gray-light); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow); border-left: 4px solid var(--color-primary); min-width: 0;">
        <h4 style="font-size: 0.85rem; color: var(--color-gray); text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.5px;">Ingresos Totales</h4>
        <p id="kpi-ingresos" style="font-size: 1.8rem; font-weight: 700; color: var(--color-dark); margin: 0;">Q0.00</p>
      </div>
      <div style="background-color: var(--color-white); border: 1px solid var(--color-gray-light); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow); border-left: 4px solid var(--color-dark); min-width: 0;">
        <h4 style="font-size: 0.85rem; color: var(--color-gray); text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.5px;">Total de Ventas</h4>
        <p id="kpi-ventas" style="font-size: 1.8rem; font-weight: 700; color: var(--color-dark); margin: 0;">0</p>
      </div>
    </div>

    <!-- Reporte de Ventas por Curso y Métodos -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem;">
      <!-- Ventas por Curso -->
      <div style="background-color: var(--color-white); border: 1px solid var(--color-gray-light); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow); min-width: 0;">
        <h3 style="font-size: 1.1rem; margin-bottom: 1rem; font-family: var(--font-title); border-bottom: 1px solid var(--color-gray-light); padding-bottom: 0.5rem;"><i class="bi bi-book"></i> Ventas por Curso</h3>
        <div class="table-container">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="col-curso">Curso</th>
                <th class="col-status" style="text-align: center;">Cant.</th>
                <th class="col-monto" style="text-align: right;">Ingresos</th>
              </tr>
            </thead>
            <tbody id="ventas-curso-body">
              <tr><td colspan="3" style="text-align: center;">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Ventas por Método -->
      <div style="background-color: var(--color-white); border: 1px solid var(--color-gray-light); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow); min-width: 0;">
        <h3 style="font-size: 1.1rem; margin-bottom: 1rem; font-family: var(--font-title); border-bottom: 1px solid var(--color-gray-light); padding-bottom: 0.5rem;"><i class="bi bi-credit-card"></i> Ventas por Método de Pago</h3>
        <div class="table-container">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="col-metodo">Método</th>
                <th class="col-status" style="text-align: center;">Cant.</th>
                <th class="col-monto" style="text-align: right;">Ingresos</th>
              </tr>
            </thead>
            <tbody id="ventas-metodo-body">
              <tr><td colspan="3" style="text-align: center;">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Historial Detallado de Ventas -->
    <div style="background-color: var(--color-white); border: 1px solid var(--color-gray-light); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow); min-width: 0;">
      <h3 style="font-size: 1.2rem; margin-bottom: 1rem; font-family: var(--font-title); border-bottom: 1px solid var(--color-gray-light); padding-bottom: 0.5rem;"><i class="bi bi-clock-history"></i> Historial Detallado de Ventas</h3>
      <div class="table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th class="col-alumna">Alumna</th>
              <th class="col-curso">Curso</th>
              <th class="col-monto">Monto</th>
              <th class="col-metodo">Método</th>
              <th class="col-ref">Referencia</th>
              <th class="col-fecha">Fecha</th>
            </tr>
          </thead>
          <tbody id="ventas-historial-body">
            <tr><td colspan="7" style="text-align: center;">Cargando historial...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  await fetchVentasReportes();
}

async function fetchVentasReportes() {
  try {
    const resStats = await fetch('/api/admin/reportes/ventas', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const stats = await resStats.json();
    if (!resStats.ok) throw new Error(stats.error || 'Error al obtener reportes');

    document.getElementById('kpi-ingresos').textContent = `Q${parseFloat(stats.ingresos_totales).toFixed(2)}`;
    document.getElementById('kpi-ventas').textContent = stats.total_ventas;

    const cursoBody = document.getElementById('ventas-curso-body');
    if (stats.por_curso.length === 0) {
      cursoBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay datos.</td></tr>';
    } else {
      cursoBody.innerHTML = stats.por_curso.map(c => `
        <tr>
          <td class="col-curso" style="font-weight: 500;">${escapeHtml(c.curso_titulo)}</td>
          <td class="col-status" style="text-align: center;">${c.cantidad_ventas}</td>
          <td class="col-monto" style="text-align: right; font-weight: 600;">Q${parseFloat(c.ingresos).toFixed(2)}</td>
        </tr>
      `).join('');
    }

    const metodoBody = document.getElementById('ventas-metodo-body');
    if (stats.por_metodo.length === 0) {
      metodoBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay datos.</td></tr>';
    } else {
      metodoBody.innerHTML = stats.por_metodo.map(m => `
        <tr>
          <td class="col-metodo" style="font-weight: 500;">${escapeHtml(m.metodo_pago)}</td>
          <td class="col-status" style="text-align: center;">${m.cantidad_ventas}</td>
          <td class="col-monto" style="text-align: right; font-weight: 600;">Q${parseFloat(m.ingresos).toFixed(2)}</td>
        </tr>
      `).join('');
    }

    const resVentas = await fetch('/api/admin/ventas', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const ventas = await resVentas.json();
    if (!resVentas.ok) throw new Error(ventas.error || 'Error al cargar historial de ventas');

    const historialBody = document.getElementById('ventas-historial-body');
    if (ventas.length === 0) {
      historialBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No se han registrado ventas.</td></tr>';
    } else {
      historialBody.innerHTML = ventas.map(v => `
        <tr>
          <td class="col-id">${v.id}</td>
          <td class="col-alumna">
            <div style="font-weight: 500;">${escapeHtml(v.usuario_nombre)}</div>
            <div style="font-size: 0.8rem; color: var(--color-gray);">${escapeHtml(v.usuario_correo)}</div>
          </td>
          <td class="col-curso" style="font-weight: 500;">${escapeHtml(v.curso_titulo)}</td>
          <td class="col-monto"><strong>Q${parseFloat(v.precio_pagado).toFixed(2)}</strong></td>
          <td class="col-metodo">
            <span class="badge badge-primary" style="background-color: #EBF5FB; color: #2E86C1; border: 1px solid #AED6F1;">
              ${escapeHtml(v.metodo_pago)}
            </span>
          </td>
          <td class="col-ref"><code>${escapeHtml(v.referencia || 'N/A')}</code></td>
          <td class="col-fecha">${new Date(v.fecha_venta).toLocaleString()}</td>
        </tr>
      `).join('');
    }

  } catch (error) {
    showTabAlert('ventas-alert', 'danger', error.message);
  }
}

// --- TAB: CUPONES Y BANNER ---
async function renderCuponesView(container) {
  let localBannersList = [];

  container.innerHTML = `
    <div class="content-header">
      <h2 class="content-title"><i class="bi bi-ticket-perforated"></i> Cupones y Banner Promocional</h2>
    </div>
    <div id="cupones-alert" class="alert" style="display: none; margin-bottom: 1.5rem;"></div>

    <!-- Sección de Banner -->
    <div style="background-color: var(--color-white); border: 1px solid var(--color-gray-light); padding: 1.5rem; border-radius: var(--border-radius); margin-bottom: 2rem; box-shadow: var(--shadow);">
      <h3 style="font-size: 1.1rem; margin-bottom: 1rem; font-family: var(--font-title); letter-spacing: 0.5px;"><i class="bi bi-megaphone"></i> Banners Promocionales</h3>
      
      <!-- Agregar Nuevo Banner -->
      <div style="display: flex; gap: 1rem; align-items: end; margin-bottom: 1.5rem;">
        <div style="flex: 1;">
          <label for="new-banner-text" class="form-label" style="font-size: 0.8rem;">Agregar Nuevo Anuncio</label>
          <input type="text" id="new-banner-text" class="form-control" placeholder="Ej. ¡50% de descuento con el código BELLEZA50!" style="padding: 0.6rem;">
        </div>
        <div>
          <button type="button" id="btn-add-banner" class="btn-action edit" style="margin-top:0; padding:0.7rem 1.2rem;"><i class="bi bi-plus-circle"></i> Agregar</button>
        </div>
      </div>
      
      <!-- Lista de Banners -->
      <label class="form-label" style="font-size: 0.8rem; display: block; margin-bottom: 0.5rem;">Anuncios Registrados</label>
      <div id="banners-list-container" style="display: flex; flex-direction: column; gap: 0.75rem;">
        <!-- Se carga dinámicamente -->
      </div>
      
      <button type="button" id="btn-save-banners" class="btn-auth" style="margin-top: 1.5rem; width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;"><i class="bi bi-save"></i> Guardar Banners</button>
    </div>

    <!-- Formulario Rápido de Creación de Cupón -->
    <div style="background-color: var(--color-gray-light); padding: 1.5rem; border-radius: var(--border-radius); margin-bottom: 2rem;">
      <h3 style="font-size: 1.1rem; margin-bottom: 1rem; font-family: var(--font-title); letter-spacing: 0.5px;"><i class="bi bi-plus-circle"></i> Crear Código Promocional</h3>
      <form id="cupon-form" style="display: grid; grid-template-columns: 2fr 2fr 1fr 2fr 1fr; gap: 1rem; align-items: end;">
        <div>
          <label for="cupon-codigo" class="form-label" style="font-size: 0.8rem;">Código</label>
          <input type="text" id="cupon-codigo" class="form-control" placeholder="BELLEZA50" required style="padding: 0.6rem; text-transform: uppercase;">
        </div>
        <div>
          <label for="cupon-tipo" class="form-label" style="font-size: 0.8rem;">Tipo</label>
          <select id="cupon-tipo" class="form-control" required style="padding: 0.6rem; border: 1px solid var(--color-gray-light); border-radius: var(--border-radius); background: white;" onchange="toggleDiscountField()">
            <option value="descuento">Descuento (%)</option>
            <option value="gratis">Acceso Gratis</option>
          </select>
        </div>
        <div>
          <label for="cupon-descuento" class="form-label" style="font-size: 0.8rem;">Descuento %</label>
          <input type="number" id="cupon-descuento" class="form-control" min="0" max="100" placeholder="50" required style="padding: 0.6rem;">
        </div>
        <div>
          <label for="cupon-curso" class="form-label" style="font-size: 0.8rem;">Aplicable a</label>
          <select id="cupon-curso" class="form-control" style="padding: 0.6rem; border: 1px solid var(--color-gray-light); border-radius: var(--border-radius); background: white;">
            <option value="">Global (Todos los cursos)</option>
          </select>
        </div>
        <div>
          <button type="submit" class="btn-auth" style="margin-top:0; width:100%; padding:0.7rem 1rem;">Crear</button>
        </div>
      </form>
    </div>

    <div class="table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th class="col-rol">Código</th>
            <th class="col-metodo">Tipo</th>
            <th class="col-monto" style="text-align: center;">Descuento</th>
            <th class="col-curso">Aplicación</th>
            <th class="col-status">Estado</th>
            <th class="col-rol">Acciones</th>
          </tr>
        </thead>
        <tbody id="cupones-table-body">
          <tr><td colspan="6" style="text-align:center;">Cargando cupones...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  // Renderizar la lista de banners en la vista actual
  const renderLocalBanners = () => {
    const listContainer = document.getElementById('banners-list-container');
    if (localBannersList.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; color: var(--color-gray); border: 1px dashed var(--color-gray-light); border-radius: 4px; font-size: 0.85rem;">
          No hay banners configurados. Agrega uno arriba para comenzar.
        </div>
      `;
      return;
    }

    listContainer.innerHTML = localBannersList.map((banner, index) => `
      <div style="display: flex; align-items: center; justify-content: space-between; background: #fafafa; border: 1px solid var(--color-gray-light); border-radius: 4px; padding: 0.6rem 0.8rem; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0; flex: 1;">
          <span style="font-size: 0.95rem; color: var(--color-primary-dark); font-weight: bold;">#${index + 1}</span>
          <span style="font-size: 0.85rem; color: var(--color-dark); word-break: break-all; flex: 1;">${escapeHtml(banner.texto)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem; flex-shrink: 0;">
          <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; cursor: pointer; user-select: none;">
            <input type="checkbox" ${banner.activo ? 'checked' : ''} onchange="window.toggleLocalBanner(${index})" style="cursor: pointer; width: 16px; height: 16px;">
            Activo
          </label>
          <button type="button" class="btn-action delete" onclick="window.deleteLocalBanner(${index})" style="padding: 0.3rem 0.5rem; font-size: 0.75rem; margin-top:0;"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    `).join('');
  };

  // Definir funciones en el objeto window para que los eventos inline puedan invocarlas
  window.toggleLocalBanner = (index) => {
    localBannersList[index].activo = !localBannersList[index].activo;
    renderLocalBanners();
  };

  window.deleteLocalBanner = (index) => {
    localBannersList.splice(index, 1);
    renderLocalBanners();
  };

  // Cargar catálogo de cursos en el dropdown select
  try {
    const resCursos = await fetch('/api/cursos');
    const cursos = await resCursos.json();
    const select = document.getElementById('cupon-curso');
    cursos.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.titulo;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Error al cargar dropdown cursos para cupones:', err);
  }

  // Cargar banners desde el backend
  try {
    const resBanners = await fetch('/api/admin/config/banners', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (resBanners.ok) {
      const data = await resBanners.json();
      localBannersList = data.banners || [];
      renderLocalBanners();
    }
  } catch (err) {
    console.error('Error al cargar banners actuales:', err);
  }

  // Manejador para agregar banners locales
  const addBannerInput = document.getElementById('new-banner-text');
  const addBannerBtn = document.getElementById('btn-add-banner');
  
  const handleAddBanner = () => {
    const text = addBannerInput.value.trim();
    if (!text) return;
    localBannersList.push({ texto: text, activo: true });
    addBannerInput.value = '';
    renderLocalBanners();
  };
  
  addBannerBtn.addEventListener('click', handleAddBanner);
  addBannerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBanner();
    }
  });

  // Manejador para guardar banners en la base de datos
  const saveBannersBtn = document.getElementById('btn-save-banners');
  saveBannersBtn.addEventListener('click', async () => {
    try {
      saveBannersBtn.disabled = true;
      saveBannersBtn.innerHTML = '<i class="bi bi-arrow-repeat bi-spin" style="margin-right: 6px;"></i> Guardando...';
      const response = await fetch('/api/admin/config/banners', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ banners: localBannersList })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al guardar banners');
      showTabAlert('cupones-alert', 'success', 'Banners promocionales actualizados con éxito');
    } catch (error) {
      showTabAlert('cupones-alert', 'danger', error.message);
    } finally {
      saveBannersBtn.disabled = false;
      saveBannersBtn.innerHTML = '<i class="bi bi-save" style="margin-right: 6px;"></i> Guardar Banners';
    }
  });

  // Crear Cupón Handler
  document.getElementById('cupon-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.textContent;
    const payload = {
      codigo: document.getElementById('cupon-codigo').value.trim().toUpperCase(),
      tipo: document.getElementById('cupon-tipo').value,
      descuento_porcentaje: parseFloat(document.getElementById('cupon-descuento').value || 0),
      curso_id: document.getElementById('cupon-curso').value !== '' ? parseInt(document.getElementById('cupon-curso').value, 10) : null,
      activo: true
    };

    try {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="bi bi-arrow-repeat bi-spin" style="margin-right: 6px;"></i> Creando...';
      const response = await fetch('/api/admin/cupones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al crear cupón');

      showTabAlert('cupones-alert', 'success', 'Cupón creado con éxito');
      document.getElementById('cupon-form').reset();
      toggleDiscountField();
      fetchCupones();
    } catch (error) {
      showTabAlert('cupones-alert', 'danger', error.message);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = originalText;
    }
  });

  await fetchCupones();
}

function toggleDiscountField() {
  const tipo = document.getElementById('cupon-tipo').value;
  const descInput = document.getElementById('cupon-descuento');
  if (tipo === 'gratis') {
    descInput.value = '0';
    descInput.disabled = true;
    descInput.removeAttribute('required');
  } else {
    descInput.disabled = false;
    descInput.setAttribute('required', 'required');
  }
}

async function fetchCupones() {
  try {
    const response = await fetch('/api/admin/cupones', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al cargar cupones');

    const tbody = document.getElementById('cupones-table-body');
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay cupones registrados.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(cupon => `
      <tr>
        <td class="col-rol" style="font-weight: 600;"><code>${escapeHtml(cupon.codigo)}</code></td>
        <td class="col-metodo" style="text-transform: capitalize;">${cupon.tipo === 'descuento' ? 'Descuento' : 'Acceso Gratis'}</td>
        <td class="col-monto" style="text-align: center;"><strong>${cupon.tipo === 'descuento' ? parseFloat(cupon.descuento_porcentaje) + '%' : '-'}</strong></td>
        <td class="col-curso">${cupon.curso_titulo ? escapeHtml(cupon.curso_titulo) : '<em>Global (Todos los cursos)</em>'}</td>
        <td class="col-status">
          <span class="badge ${cupon.activo ? 'badge-success' : 'badge-danger'}">
            ${cupon.activo ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td class="col-rol">
          <div class="actions-cell">
            <button class="btn-action delete" onclick="deleteCupon(${cupon.id})"><i class="bi bi-trash"></i> Eliminar</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showTabAlert('cupones-alert', 'danger', error.message);
  }
}

async function deleteCupon(id) {
  if (!confirm('¿Estás segura de eliminar este cupón?')) return;
  try {
    const response = await fetch(`/api/admin/cupones/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al eliminar cupón');
    }
    fetchCupones();
  } catch (error) {
    showTabAlert('cupones-alert', 'danger', error.message);
  }
}


// --- HELPERS GENERALES DE MODALES Y ALERTAS ---
function closeModal(type) {
  const modal = document.getElementById(`${type}-modal`) || document.getElementById(type);
  if (modal) {
    modal.style.display = 'none';
  }
}

function showTabAlert(alertId, type, message) {
  const box = document.getElementById(alertId);
  if (box) {
    box.textContent = message;
    box.className = `alert alert-${type}`;
    box.style.display = 'block';
    
    // Auto ocultar después de 5 segundos si es éxito
    if (type === 'success') {
      setTimeout(() => { box.style.display = 'none'; }, 5000);
    }
  }
}

// CONFIGURACIÓN DE SUBIDA DE IMÁGENES POR AJAX
function setupImageUploads() {
  const cursoFileInput = document.getElementById('curso-image-file');
  if (cursoFileInput) {
    cursoFileInput.addEventListener('change', (e) => handleImageUpload(e, 'cursos', 'curso-miniatura', 'curso-image-preview', 'curso-file-info'));
  }
  
  const moduloFileInput = document.getElementById('modulo-image-file');
  if (moduloFileInput) {
    moduloFileInput.addEventListener('change', (e) => handleImageUpload(e, 'modulos', 'modulo-miniatura-url', 'modulo-image-preview', 'modulo-file-info'));
  }

  const blogFileInput = document.getElementById('blog-image-file');
  if (blogFileInput) {
    blogFileInput.addEventListener('change', (e) => handleImageUpload(e, 'blogs', 'blog-imagen-url', 'blog-image-preview', 'blog-file-info'));
  }
}

async function handleImageUpload(event, type, hiddenUrlInputId, previewImgId, infoMsgId) {
  const fileInput = event.target;
  const file = fileInput.files[0];
  const infoMsg = document.getElementById(infoMsgId);
  const previewImg = document.getElementById(previewImgId);
  const hiddenInput = document.getElementById(hiddenUrlInputId);
  const placeholder = previewImg.previousElementSibling;
  
  if (!file) return;
  
  // Validar formato en cliente
  const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp'];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    alert('Formato no permitido. Solo se aceptan archivos PNG, JPG, JPEG o WEBP.');
    fileInput.value = '';
    return;
  }
  
  // Validar tamaño en cliente (5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('El archivo excede el tamaño límite permitido de 5MB.');
    fileInput.value = '';
    return;
  }
  
  // Mostrar metadatos preliminares
  const sizeKB = (file.size / 1024).toFixed(1);
  infoMsg.style.color = 'var(--color-gray)';
  infoMsg.textContent = `Archivo seleccionado: .${ext.toUpperCase()} (${sizeKB} KB) - Subiendo...`;
  
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const response = await fetch(`/api/admin/upload?type=${type}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al subir imagen');
    
    // Guardar URL en campo oculto
    hiddenInput.value = data.url;
    
    // Mostrar preview
    previewImg.src = data.url;
    previewImg.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    
    // Mostrar metadatos definitivos en color éxito
    infoMsg.style.color = 'var(--color-success)';
    infoMsg.textContent = `¡Subido con éxito! Formato: ${data.meta.mimeType.split('/')[1].toUpperCase()} | Tamaño: ${data.meta.size}`;
    
  } catch (error) {
    console.error('Error al subir:', error);
    infoMsg.style.color = 'var(--color-danger)';
    infoMsg.textContent = `Error: ${error.message}`;
    fileInput.value = '';
    hiddenInput.value = '';
  }
}

// --- TAB: BLOGS ---
let loadedBlogs = [];

async function renderBlogsView(container) {
  container.innerHTML = `
    <div class="content-header">
      <h2 class="content-title">Gestión de Blogs</h2>
      <button class="btn-auth" onclick="openBlogModal()" style="margin-top:0; padding:0.6rem 1.2rem;">+ Nuevo Artículo</button>
    </div>
    <div id="blogs-alert" class="alert" style="display: none; margin-bottom: 1rem;"></div>
    <div class="table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th class="col-id">ID</th>
            <th class="col-mini">Imagen</th>
            <th class="col-title">Título</th>
            <th class="col-rol">Categoría</th>
            <th class="col-actions-cursos">Acciones</th>
          </tr>
        </thead>
        <tbody id="blogs-table-body">
          <tr><td colspan="5" style="text-align:center;">Cargando artículos...</td></tr>
        </tbody>
      </table>
    </div>
  `;
  await fetchBlogs();
}

async function fetchBlogs() {
  try {
    const response = await fetch('/api/admin/blogs', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || 'Error al cargar blogs');
    loadedBlogs = data;
    
    const tbody = document.getElementById('blogs-table-body');
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay artículos de blog registrados.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(blog => `
      <tr>
        <td class="col-id">${blog.id}</td>
        <td class="col-mini">
          <img src="${escapeHtml(blog.imagen_url)}" alt="Imagen" style="width: 70px; height: 40px; object-fit: cover; border-radius: 4px;" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'70\' height=\'40\' viewBox=\'0 0 70 40\'><rect width=\'100%\' height=\'100%\' fill=\'%231a1a1a\'/><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23d6af37\' font-family=\'sans-serif\' font-size=\'10\' font-weight=\'bold\'>BLUSH</text></svg>';">
        </td>
        <td class="col-title" style="font-weight: 500;">${escapeHtml(blog.titulo)}</td>
        <td class="col-rol" style="text-align: center;"><span class="badge badge-primary">${escapeHtml(blog.categoria)}</span></td>
        <td class="col-actions-cursos">
          <div class="actions-cell">
            <button class="btn-action edit" onclick="openBlogModal(${blog.id})"><i class="bi bi-pencil-square"></i> Editar</button>
            <button class="btn-action delete" onclick="deleteBlog(${blog.id})"><i class="bi bi-trash"></i> Eliminar</button>
          </div>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    showTabAlert('blogs-alert', 'danger', error.message);
  }
}

// Modal de Blogs
window.openBlogModal = function(blogId = null) {
  const modal = document.getElementById('blog-modal');
  const title = document.getElementById('blog-modal-title');
  const form = document.getElementById('blog-form');
  
  form.reset();
  document.getElementById('blog-id-input').value = '';

  const preview = document.getElementById('blog-image-preview');
  const placeholder = document.getElementById('blog-image-preview-placeholder');
  const fileInfo = document.getElementById('blog-file-info');
  const fileInput = document.getElementById('blog-image-file');
  
  if (fileInput) fileInput.value = '';
  if (fileInfo) fileInfo.textContent = '';
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
  if (placeholder) placeholder.style.display = 'block';
  document.getElementById('blog-imagen-url').value = '';

  if (blogId) {
    title.textContent = 'Editar Artículo';
    const blog = loadedBlogs.find(b => b.id === blogId);
    if (blog) {
      document.getElementById('blog-id-input').value = blog.id;
      document.getElementById('blog-titulo').value = blog.titulo;
      document.getElementById('blog-categoria').value = blog.categoria;
      document.getElementById('blog-extracto').value = blog.extracto;
      document.getElementById('blog-contenido').value = blog.contenido;
      document.getElementById('blog-imagen-url').value = blog.imagen_url;
      
      if (preview && blog.imagen_url) {
        preview.src = blog.imagen_url;
        preview.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
      }
    }
  } else {
    title.textContent = 'Nuevo Artículo';
  }

  modal.style.display = 'flex';
};

// Formulario de Blogs submit
document.getElementById('blog-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const blogId = document.getElementById('blog-id-input').value;
  const payload = {
    titulo: document.getElementById('blog-titulo').value.trim(),
    categoria: document.getElementById('blog-categoria').value.trim(),
    extracto: document.getElementById('blog-extracto').value.trim(),
    contenido: document.getElementById('blog-contenido').value.trim(),
    imagen_url: document.getElementById('blog-imagen-url').value.trim()
  };

  const method = blogId ? 'PUT' : 'POST';
  const url = blogId ? `/api/admin/blogs/${blogId}` : '/api/admin/blogs';

  const btnSave = e.target.querySelector('button[type="submit"]');
  const originalText = btnSave.textContent;
  try {
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="bi bi-arrow-repeat bi-spin" style="margin-right: 6px;"></i> Guardando...';
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al procesar artículo de blog');

    closeModal('blog');
    fetchBlogs();
  } catch (error) {
    alert(error.message);
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = originalText;
  }
});

// Eliminar Blog
window.deleteBlog = async function(id) {
  if (!confirm('¿Estás segura de eliminar este artículo de blog?')) return;
  try {
    const response = await fetch(`/api/admin/blogs/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al eliminar blog');
    }
    fetchBlogs();
  } catch (error) {
    alert(error.message);
  }
};

// Inicializar verificación y cargas
verificarAccesoAdmin();
setupImageUploads();
