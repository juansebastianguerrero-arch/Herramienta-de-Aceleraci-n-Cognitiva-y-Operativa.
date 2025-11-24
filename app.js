// ============================================
// 📋 CONFIGURACIÓN GLOBAL
// ============================================

// ⚠️ IMPORTANTE: Reemplaza esta URL con la de tu Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/a/macros/mercadolibre.com.co/s/AKfycbyxnDh86NBH5YpHT1AOP_UnFGUg3rGyi6_IKiArB54iAYdA_0odwPeZebKpwTh3f6RB5g/exec';

// Textos de práctica por nivel
const PRACTICE_TEXTS = {
    1: "En nuestro botiquín de herramientas buscamos que uses cada recurso a tu favor. El proceso consta de cinco pasos esenciales. Primero, el Sondeo: usa todas las herramientas disponibles y revisa la tipificación. Segundo, la Exploración: las preguntas son claves para que el usuario llegue a la solución contigo. Tercero, la Comunicación: sé claro al explicar las razones por las que no excluimos el reclamo. Cuarto, las Recomendaciones: dale consejos al usuario para evitar futuros inconvenientes. Quinto, Asesora su Reputación: revisa el impacto y destaca su medalla. Nunca cierres el chat apresuradamente.",
    
    2: "Cuando un comprador menciona que recibió el producto con diferencias, debemos indagar profundamente. Por ejemplo, si hay problemas con el tamaño de unas brocas, preguntamos: ¿Crees que pudo haber pasado algo durante el envío? ¿Esto lo especificas en la ficha técnica? ¿Has presentado esta situación anteriormente? En la comunicación, utiliza frases empáticas como: \"Como pudimos verlo juntos\" o \"Tal como pudiste notarlo\". Si el vendedor afirma que el comprador miente, mantén la calma y solicita imágenes como evidencia para validar las diferencias, evitando confrontaciones directas.",
    
    3: "Asesorar sobre la reputación es vital para la experiencia del vendedor. Debemos revisar si superó el 1,5% de reclamos permitidos; si está en un 2,22%, debemos calcular cuántas ventas necesita para recuperar su color verde. Explícale el programa de \"Recovery Seller\" y ayúdale a proyectar fechas en un calendario de 365 días. Si el impacto proviene de mediaciones o cancelaciones, revísenlo juntos. Finalmente, propón revisar las publicaciones a fondo, completar la ficha técnica en tiempo real y aclarar las medidas en la descripción para que no vuelva a recibir reclamos en esos productos."
};

// Metas por nivel
const LEVEL_TARGETS = {
    1: { ppm: 40, accuracy: 95, name: "Nivel 1: Fundamentos" },
    2: { ppm: 50, accuracy: 96, name: "Nivel 2: Indagación" },
    3: { ppm: 60, accuracy: 97, name: "Nivel 3: Gestión Avanzada" }
};

// ============================================
// 📊 VARIABLES GLOBALES
// ============================================

let currentUser = {
    name: '',
    id: ''
};

let currentLevel = 0;
let currentText = '';
let startTime = null;
let timerInterval = null;
let isTestActive = false;
let errors = 0;
let totalChars = 0;

// ============================================
// 🔐 FUNCIONES DE AUTENTICACIÓN
// ============================================

/**
 * Función de login
 */
function login() {
    console.log('🔐 Intentando login...');
    
    const name = document.getElementById('userName').value.trim();
    const id = document.getElementById('userId').value.trim();
    
    // Validación
    if (!name || !id) {
        alert('⚠️ Por favor, completa todos los campos');
        return;
    }
    
    // Validar formato del ID (solo letras minúsculas y números)
    const idRegex = /^[a-z0-9]+$/;
    if (!idRegex.test(id)) {
        alert('⚠️ El ID de usuario debe contener solo letras minúsculas y números, sin espacios ni caracteres especiales');
        return;
    }
    
    // Guardar datos del usuario
    currentUser.name = name;
    currentUser.id = id;
    
    console.log('✅ Login exitoso:', currentUser);
    
    // Cambiar de vista
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('levelSelection').classList.add('active');
}

/**
 * Función de logout
 */
function logout() {
    if (confirm('¿Seguro que deseas cerrar sesión?')) {
        console.log('👋 Cerrando sesión...');
        
        // Resetear datos
        currentUser = { name: '', id: '' };
        currentLevel = 0;
        
        // Limpiar campos
        document.getElementById('userName').value = '';
        document.getElementById('userId').value = '';
        
        // Cambiar de vista
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('levelSelection').classList.remove('active');
        document.getElementById('typingSection').classList.remove('active');
        
        console.log('✅ Sesión cerrada');
    }
}

// ============================================
// 🎯 FUNCIONES DE SELECCIÓN DE NIVEL
// ============================================

/**
 * Seleccionar nivel de práctica
 */
function selectLevel(level) {
    console.log(`🎯 Nivel seleccionado: ${level}`);
    
    currentLevel = level;
    currentText = PRACTICE_TEXTS[level];
    
    // Cambiar de vista
    document.getElementById('levelSelection').classList.remove('active');
    document.getElementById('typingSection').classList.add('active');
    
    // Actualizar información del nivel
    updateLevelInfo();
    
    // Mostrar el texto
    displayText();
    
    // Resetear estadísticas
    resetStats();
}

/**
 * Volver a la selección de niveles
 */
function backToLevels() {
    if (isTestActive) {
        if (!confirm('¿Seguro que deseas salir? Perderás tu progreso actual.')) {
            return;
        }
        stopTest();
    }
    
    console.log('🔙 Volviendo a selección de niveles...');
    
    document.getElementById('typingSection').classList.remove('active');
    document.getElementById('levelSelection').classList.add('active');
    
    resetTest();
}

/**
 * Actualizar información del nivel actual
 */
function updateLevelInfo() {
    const target = LEVEL_TARGETS[currentLevel];
    const badge = document.getElementById('currentLevelBadge');
    const description = document.getElementById('levelDescription');
    const targetInfo = document.getElementById('targetInfo');
    
    // Configurar badge
    badge.textContent = target.name;
    badge.className = 'level-badge';
    
    // Colores por nivel
    if (currentLevel === 1) badge.style.background = '#4CAF50';
    if (currentLevel === 2) badge.style.background = '#FF9800';
    if (currentLevel === 3) badge.style.background = '#f44336';
    
    // Descripción
    const wordCount = currentText.split(' ').length;
    description.textContent = `${wordCount} palabras`;
    
    // Meta
    targetInfo.innerHTML = `<strong>Meta:</strong> ${target.ppm}+ PPM | ${target.accuracy}%+ Precisión`;
}

// ============================================
// 📝 FUNCIONES DE VISUALIZACIÓN DEL TEXTO
// ============================================

/**
 * Mostrar el texto a escribir
 */
function displayText() {
    console.log('📝 Mostrando texto...');
    
    const display = document.getElementById('textDisplay');
    
    // Crear spans para cada carácter
    display.innerHTML = currentText.split('').map((char, index) => {
        const displayChar = char === ' ' ? '&nbsp;' : char;
        return `<span class="char" id="char-${index}">${displayChar}</span>`;
    }).join('');
    
    console.log(`✅ Texto mostrado: ${currentText.length} caracteres`);
}

// ============================================
// ⏱️ FUNCIONES DEL TEST
// ============================================

/**
 * Iniciar el test
 */
function startTest() {
    if (isTestActive) {
        console.log('⚠️ Test ya está activo');
        return;
    }
    
    console.log('🚀 Iniciando test...');
    
    isTestActive = true;
    startTime = Date.now();
    errors = 0;
    totalChars = 0;
    
    // Habilitar área de texto
    const inputArea = document.getElementById('inputArea');
    inputArea.disabled = false;
    inputArea.value = '';
    inputArea.focus();
    
    // Deshabilitar botón de inicio
    document.getElementById('startBtn').disabled = true;
    
    // Ocultar resultados previos
    document.getElementById('results').classList.remove('show');
    
    // Iniciar cronómetro
    timerInterval = setInterval(updateTimer, 100);
    
    // Agregar listener para el input
    inputArea.addEventListener('input', handleInput);
    
    console.log('✅ Test iniciado');
}

/**
 * Manejar el input del usuario
 */
function handleInput(e) {
    if (!isTestActive) return;
    
    const inputText = e.target.value;
    totalChars = inputText.length;
    
    // Actualizar visualización carácter por carácter
    errors = 0;
    
    for (let i = 0; i < currentText.length; i++) {
        const charElement = document.getElementById(`char-${i}`);
        
        if (i < inputText.length) {
            // Carácter ya escrito
            if (inputText[i] === currentText[i]) {
                charElement.className = 'char correct';
            } else {
                charElement.className = 'char incorrect';
                errors++;
            }
        } else if (i === inputText.length) {
            // Carácter actual
            charElement.className = 'char current';
        } else {
            // Caracteres pendientes
            charElement.className = 'char';
        }
    }
    
    // Actualizar estadísticas
    updateStats();
    
    // Verificar si terminó
    if (inputText.length >= currentText.length) {
        console.log('🏁 Test completado');
        finishTest();
    }
}

/**
 * Actualizar el cronómetro
 */
function updateTimer() {
    if (!startTime) return;
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer').textContent = elapsed + 's';
}

/**
 * Actualizar estadísticas en tiempo real
 */
function updateStats() {
    if (!startTime) return;
    
    const elapsed = (Date.now() - startTime) / 1000 / 60; // minutos
    const wordsTyped = totalChars / 5; // 5 caracteres = 1 palabra
    const ppm = Math.round(wordsTyped / elapsed) || 0;
    
    const accuracy = totalChars > 0 
        ? Math.round(((totalChars - errors) / totalChars) * 100)
        : 100;
    
    const score = Math.round(ppm * (accuracy / 100));
    
    // Actualizar UI
    document.getElementById('wpm').textContent = ppm;
    document.getElementById('accuracy').textContent = accuracy + '%';
    document.getElementById('errors').textContent = errors;
    document.getElementById('score').textContent = score;
}

/**
 * Finalizar el test
 */
function finishTest() {
    console.log('🏁 Finalizando test...');
    
    stopTest();
    
    const finalTime = Math.floor((Date.now() - startTime) / 1000);
    const ppm = parseInt(document.getElementById('wpm').textContent);
    const accuracy = parseInt(document.getElementById('accuracy').textContent);
    const score = parseInt(document.getElementById('score').textContent);
    
    console.log(`📊 Resultados: ${ppm} PPM | ${accuracy}% | Score: ${score}`);
    
    // Guardar resultados
    saveResults(finalTime, ppm, accuracy, score);
    
    // Mostrar resultados
    showResults(finalTime, ppm, accuracy, score);
}

/**
 * Detener el test
 */
function stopTest() {
    isTestActive = false;
    clearInterval(timerInterval);
    
    const inputArea = document.getElementById('inputArea');
    inputArea.disabled = true;
    inputArea.removeEventListener('input', handleInput);
    
    document.getElementById('startBtn').disabled = false;
    
    console.log('⏹️ Test detenido');
}

/**
 * Reiniciar el test
 */
function resetTest() {
    console.log('🔄 Reiniciando test...');
    
    stopTest();
    
    startTime = null;
    errors = 0;
    totalChars = 0;
    
    // Limpiar input
    document.getElementById('inputArea').value = '';
    
    // Resetear estadísticas
    resetStats();
    
    // Ocultar resultados
    document.getElementById('results').classList.remove('show');
    
    // Mostrar texto nuevamente
    displayText();
    
    console.log('✅ Test reiniciado');
}

/**
 * Resetear estadísticas
 */
function resetStats() {
    document.getElementById('wpm').textContent = '0';
    document.getElementById('accuracy').textContent = '100%';
    document.getElementById('timer').textContent = '0s';
    document.getElementById('errors').textContent = '0';
    document.getElementById('score').textContent = '0';
}

// ============================================
// 💾 GUARDAR RESULTADOS
// ============================================

/**
 * Guardar resultados en Google Sheets
 */
function saveResults(time, ppm, accuracy, score) {
    console.log('💾 Guardando resultados...');
    
    // Mostrar loading
    document.getElementById('loadingOverlay').classList.add('show');
    
    const data = {
        timestamp: new Date().toISOString(),
        id_empleado: currentUser.id,
        nombre: currentUser.name,
        nivel: currentLevel,
        tiempo_segundos: time,
        ppm: ppm,
        precision: accuracy,
        errores: errors,
        puntaje: score,
        texto_palabras: currentText.split(' ').length
    };
    
    console.log('📤 Enviando datos:', data);
    
    // Validar URL
    if (GOOGLE_SCRIPT_URL === 'TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI') {
        console.error('❌ URL de Google Apps Script no configurada');
        document.getElementById('loadingOverlay').classList.remove('show');
        alert('⚠️ Sistema no configurado. Contacta al administrador.');
        return;
    }
    
    // Enviar a Google Sheets
    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(() => {
        console.log('✅ Datos enviados correctamente');
        document.getElementById('loadingOverlay').classList.remove('show');
    })
    .catch(error => {
        console.error('❌ Error al enviar datos:', error);
        document.getElementById('loadingOverlay').classList.remove('show');
        alert('⚠️ Hubo un problema al guardar tus resultados. Por favor, contacta al administrador.');
    });
}

// ============================================
// 📊 MOSTRAR RESULTADOS
// ============================================

/**
 * Mostrar resultados del test
 */
function showResults(time, ppm, accuracy, score) {
    console.log('📊 Mostrando resultados...');
    
    const target = LEVEL_TARGETS[currentLevel];
    const metPPM = ppm >= target.ppm;
    const metAccuracy = accuracy >= target.accuracy;
    const passedLevel = metPPM && metAccuracy;
    
    // Calcular cuartil
    const quartile = calculateQuartile(score, currentLevel);
    
    const resultsDiv = document.getElementById('results');
    
    resultsDiv.innerHTML = `
        <h2>${passedLevel ? '🎉 ¡Excelente trabajo!' : '💪 Sigue practicando'}</h2>
        
        <div class="results-grid">
            <div class="result-item">
                <strong>⏱️ Tiempo Total</strong>
                <div class="value">${time}s</div>
                <small>${Math.floor(time / 60)}m ${time % 60}s</small>
            </div>
            
            <div class="result-item">
                <strong>⚡ Palabras por Minuto</strong>
                <div class="value" style="color: ${metPPM ? '#4CAF50' : '#f44336'}">${ppm} PPM</div>
                <small>${metPPM ? '✅' : '❌'} Meta: ${target.ppm}+ PPM</small>
            </div>
            
            <div class="result-item">
                <strong>🎯 Precisión</strong>
                <div class="value" style="color: ${metAccuracy ? '#4CAF50' : '#f44336'}">${accuracy}%</div>
                <small>${metAccuracy ? '✅' : '❌'} Meta: ${target.accuracy}%+</small>
            </div>
            
            <div class="result-item">
                <strong>📊 Puntaje Final</strong>
                <div class="value">${score}</div>
                <small>PPM × Precisión</small>
            </div>
        </div>
        
        <div class="quartile-info">
            <h3>📍 Tu Ubicación en el Ranking</h3>
            <div class="quartile-badge ${quartile.class}">${quartile.label}</div>
            <p>${quartile.description}</p>
        </div>
        
        <div class="performance-message">
            <strong>${passedLevel ? '🎯 ¡Meta alcanzada!' : '💪 Continúa mejorando'}</strong>
            <p>${getPerformanceMessage(ppm, accuracy, target)}</p>
        </div>
    `;
    
    resultsDiv.classList.add('show');
    
    console.log('✅ Resultados mostrados');
}

/**
 * Calcular cuartil según nivel y puntaje
 */
function calculateQuartile(score, level) {
    const ranges = {
        1: { q1: 30, q2: 38, q3: 45 },
        2: { q1: 40, q2: 48, q3: 55 },
        3: { q1: 50, q2: 58, q3: 65 }
    };
    
    const range = ranges[level];
    
    if (score < range.q1) {
        return {
            label: 'Q1 - Necesita Mejora',
            class: 'q1',
            description: 'Estás en el 25% inferior. Practica más para mejorar tu velocidad y precisión. ¡No te rindas!'
        };
    } else if (score < range.q2) {
        return {
            label: 'Q2 - En Desarrollo',
            class: 'q2',
            description: 'Estás en el promedio bajo. Con práctica constante alcanzarás mejores resultados. ¡Vas por buen camino!'
        };
    } else if (score < range.q3) {
        return {
            label: 'Q3 - Competente',
            class: 'q3',
            description: '¡Buen trabajo! Estás por encima del promedio. Sigue practicando para llegar al nivel experto.'
        };
    } else {
        return {
            label: 'Q4 - Top Performer',
            class: 'q4',
            description: '¡Excelente! Estás en el 25% superior. Eres un referente del equipo. ¡Felicitaciones!'
        };
    }
}

/**
 * Obtener mensaje de rendimiento personalizado
 */
function getPerformanceMessage(ppm, accuracy, target) {
    if (ppm >= target.ppm && accuracy >= target.accuracy) {
        return `Has superado las metas del ${target.name}. ¡Estás listo para casos reales con esta complejidad! Considera intentar el siguiente nivel.`;
    } else if (ppm < target.ppm && accuracy >= target.accuracy) {
        return `Tu precisión es excelente (${accuracy}%), pero necesitas aumentar tu velocidad. Intenta escribir más rápido sin perder calidad. Meta: ${target.ppm} PPM.`;
    } else if (ppm >= target.ppm && accuracy < target.accuracy) {
        return `Tienes buena velocidad (${ppm} PPM), pero cometes demasiados errores. Reduce la velocidad y enfócate en la precisión. Meta: ${target.accuracy}%.`;
    } else {
        return `Necesitas mejorar tanto velocidad como precisión. Practica con textos más cortos primero y aumenta gradualmente. ¡La práctica hace al maestro!`;
    }
}

// ============================================
// 🚀 INICIALIZACIÓN
// ============================================

/**
 * Función que se ejecuta al cargar la página
 */
window.onload = function() {
    console.log('🚀 ========== SISTEMA DE MECANOGRAFÍA INICIADO ==========');
    console.log('📅 Fecha:', new Date().toLocaleString('es-ES'));
    console.log('🌐 Navegador:', navigator.userAgent);
    
    // Verificar configuración
    if (GOOGLE_SCRIPT_URL === 'TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI') {
        console.warn('⚠️ ADVERTENCIA: URL de Google Apps Script no configurada');
        console.warn('⚠️ Los resultados NO se guardarán hasta que configures la URL');
    } else {
        console.log('✅ URL de Google Apps Script configurada');
    }
    
    console.log('✅ Sistema listo para usar');
    console.log('============================================================');
};

// ============================================
// 🔧 UTILIDADES
// ============================================

/**
 * Prevenir pegado de texto
 */
document.addEventListener('DOMContentLoaded', function() {
    const inputArea = document.getElementById('inputArea');
    
    if (inputArea) {
        inputArea.addEventListener('paste', function(e) {
            e.preventDefault();
            alert('⚠️ No está permitido pegar texto. Debes escribirlo manualmente.');
            console.log('🚫 Intento de pegado bloqueado');
        });
        
        console.log('✅ Protección contra pegado activada');
    }
});

/**
 * Detectar teclas especiales
 */
document.addEventListener('keydown', function(e) {
    // Bloquear F12 (DevTools)
    if (e.key === 'F12') {
        e.preventDefault();
        console.log('🚫 F12 bloqueado');
    }
    
    // Bloquear Ctrl+Shift+I (DevTools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        console.log('🚫 Ctrl+Shift+I bloqueado');
    }
});

// ============================================
// 📱 RESPONSIVE HELPERS
// ============================================

/**
 * Detectar si es dispositivo móvil
 */
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

if (isMobile()) {
    console.log('📱 Dispositivo móvil detectado');
} else {
    console.log('💻 Dispositivo de escritorio detectado');
}

// ============================================
// 🎯 EXPORT (para testing)
// ============================================

// Si estás en un entorno de desarrollo, puedes exportar funciones
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        login,
        logout,
        selectLevel,
        startTest,
        calculateQuartile
    };
}
