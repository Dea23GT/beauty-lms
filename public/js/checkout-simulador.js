// Obtener parámetros de la URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('user_id');
const cursoId = urlParams.get('curso_id');
const sig = urlParams.get('sig');

// Elementos DOM
const valCursoId = document.getElementById('val-curso-id');
const valCursoTitulo = document.getElementById('val-curso-titulo');
const valUserId = document.getElementById('val-user-id');
const valPrecio = document.getElementById('val-precio');
const btnApprove = document.getElementById('btn-approve');
const btnCancel = document.getElementById('btn-cancel');
const alertBox = document.getElementById('alert-box');
const actionsContainer = document.getElementById('actions-container');
let appliedCouponCode = null;
let couponType = null;

// Cargar información del curso
async function loadCheckoutInfo() {
  if (!userId || !cursoId || !sig) {
    showAlert('danger', 'Parámetros de checkout inválidos o incompletos.');
    actionsContainer.style.display = 'none';
    return;
  }

  valUserId.textContent = userId;
  valCursoId.textContent = cursoId;

  try {
    const response = await fetch(`/api/cursos/${cursoId}`);
    if (!response.ok) throw new Error('No se pudo obtener información del curso');
    
    const curso = await response.json();
    valCursoTitulo.textContent = curso.titulo;
    valPrecio.textContent = `Q${parseFloat(curso.precio).toFixed(2)}`;
  } catch (error) {
    console.error(error);
    valCursoTitulo.textContent = 'Curso de Belleza Especializado';
    valPrecio.textContent = 'Q49.99';
  }
}

// Eventos
btnCancel.addEventListener('click', () => {
  window.location.href = `curso.html?id=${cursoId}`;
});

const couponCodeInput = document.getElementById('coupon-code');
const btnApplyCoupon = document.getElementById('btn-apply-coupon');
const couponMsg = document.getElementById('coupon-msg');

btnApplyCoupon.addEventListener('click', async () => {
  const code = couponCodeInput.value.trim().toUpperCase();
  if (!code) {
    showCouponMessage('error', 'Por favor ingresa un código.');
    return;
  }

  try {
    btnApplyCoupon.disabled = true;
    btnApplyCoupon.innerHTML = '<i class="bi bi-arrow-repeat bi-spin"></i>';

    const response = await fetch('/api/pagos/verificar-codigo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ codigo: code, curso_id: parseInt(cursoId, 10) })
    });

    const data = await response.json();
    btnApplyCoupon.disabled = false;
    btnApplyCoupon.textContent = 'Aplicar';

    if (!response.ok) {
      showCouponMessage('error', data.error || 'Cupón no válido.');
      appliedCouponCode = null;
      couponType = null;
      await loadCheckoutInfo();
      btnApprove.textContent = 'Simular Pago Exitoso';
      document.getElementById('test-automation-container').style.display = 'none';
      return;
    }

    appliedCouponCode = code;
    couponType = data.tipo;
    
    showCouponMessage('success', data.mensaje);
    valPrecio.textContent = `Q${parseFloat(data.precioFinal).toFixed(2)}`;
    
    if (data.precioFinal === 0 && couponType === 'gratis') {
      btnApprove.textContent = 'Activar Curso Gratis';
      document.getElementById('test-automation-container').style.display = 'block';
    } else {
      btnApprove.textContent = 'Simular Pago Exitoso';
      document.getElementById('test-automation-container').style.display = 'none';
    }

  } catch (error) {
    console.error(error);
    showCouponMessage('error', 'Error al verificar el cupón.');
    btnApplyCoupon.disabled = false;
    btnApplyCoupon.textContent = 'Aplicar';
  }
});

function showCouponMessage(type, text) {
  couponMsg.textContent = text;
  couponMsg.className = `coupon-message ${type}`;
}

btnApprove.addEventListener('click', async () => {
  if (appliedCouponCode && couponType === 'gratis') {
    await applyFreeActivation();
  } else {
    await handleNormalSimulatedPayment();
  }
});

async function applyFreeActivation() {
  try {
    btnApprove.disabled = true;
    btnApprove.innerHTML = '<i class="bi bi-arrow-repeat bi-spin" style="margin-right: 6px;"></i> Procesando Activación...';

    const response = await fetch('/api/pagos/aplicar-codigo-gratis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        codigo: appliedCouponCode,
        curso_id: parseInt(cursoId, 10)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo aplicar la activación gratuita');
    }

    showAlert('success', '¡Curso activado con éxito! Redireccionando a tu curso en 3 segundos...');
    actionsContainer.style.display = 'none';

    setTimeout(() => {
      window.location.href = `curso.html?id=${cursoId}`;
    }, 3000);

  } catch (error) {
    console.error(error);
    showAlert('danger', 'Error de activación: ' + error.message);
    btnApprove.disabled = false;
    btnApprove.textContent = 'Activar Curso Gratis';
  }
}

async function handleNormalSimulatedPayment() {
  try {
    btnApprove.disabled = true;
    btnApprove.innerHTML = '<i class="bi bi-arrow-repeat bi-spin" style="margin-right: 6px;"></i> Procesando Transacción...';
    
    const response = await fetch('/api/pagos/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': sig
      },
      body: JSON.stringify({
        user_id: userId,
        curso_id: cursoId,
        status: 'completed',
        coupon: appliedCouponCode
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'El procesador rechazó la notificación de pago');
    }

    showAlert('success', '¡Pago Aprobado! Redireccionando a tu curso en 3 segundos...');
    actionsContainer.style.display = 'none';

    setTimeout(() => {
      window.location.href = `curso.html?id=${cursoId}`;
    }, 3000);

  } catch (error) {
    console.error(error);
    showAlert('danger', 'Error al procesar pago: ' + error.message);
    btnApprove.disabled = false;
    btnApprove.textContent = 'Simular Pago Exitoso';
  }
}

// eslint-disable-next-line no-unused-vars
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  
  document.getElementById(`tab-content-${tabId}`).style.display = 'block';
  document.getElementById(`tab-btn-${tabId}`).classList.add('active');
}

const btnRequestVisaLink = document.getElementById('btn-request-visalink');
const btnSubmitTransfer = document.getElementById('btn-submit-transfer');

btnRequestVisaLink.addEventListener('click', () => {
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
  const userEmail = user ? user.correo : 'alumna@beauty.com';
  const cursoTitulo = valCursoTitulo.textContent;
  const precioVal = valPrecio.textContent;

  const message = `✨ *BLUSH PRO ACADEMY - SOLICITUD DE VISALINK* ✨\n\n` +
                  `📧 *Correo de la Alumna:* ${userEmail}\n` +
                  `📚 *Curso:* ${cursoTitulo} (ID: ${cursoId})\n` +
                  `💵 *Monto:* ${precioVal}\n\n` +
                  `Hola, solicito el enlace de pago VisaLink para inscribirme a este curso.`;

  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/50238040420?text=${encoded}`, '_blank');
});

btnSubmitTransfer.addEventListener('click', () => {
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
  const userEmail = user ? user.correo : 'alumna@beauty.com';
  const cursoTitulo = valCursoTitulo.textContent;
  const precioVal = valPrecio.textContent;

  const message = `✨ *BLUSH PRO ACADEMY - COMPROBANTE DE DEPOSITO* ✨\n\n` +
                  `📧 *Correo de la Alumna:* ${userEmail}\n` +
                  `📚 *Curso:* ${cursoTitulo} (ID: ${cursoId})\n` +
                  `💵 *Monto:* ${precioVal}\n\n` +
                  `Hola, adjunto la fotografía de mi comprobante de depósito/transferencia a Banrural para activar mi curso.`;

  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/50238040420?text=${encoded}`, '_blank');
});

function showAlert(type, message) {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  alertBox.style.display = 'block';
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

loadCheckoutInfo();
loadBanner();
