// ============================================
// 📋 CONFIGURACIÓN GLOBAL
// ============================================

// ⚠️ IMPORTANTE: Reemplaza esta URL con la de tu Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/a/macros/mercadolibre.com.co/s/AKfycbwXsSwQXFM_ATqQpw9XvCacaNcpa5mLSa7WHidbc6h0ZKlF-YtIKZnWjY6GWBXYV5Ss2g/exec';

// Textos de práctica por nivel (SIN TILDES NI SÍMBOLOS ESPECIALES)
const PRACTICE_TEXTS = {
    1: "En nuestro botiquin de herramientas buscamos que uses cada recurso a tu favor. El proceso consta de cinco pasos esenciales. Primero, el Sondeo: usa todas las herramientas disponibles y revisa la tipificacion. Segundo, la Exploracion: las preguntas son claves para que el usuario llegue a la solucion contigo. Tercero, la Comunicacion: se claro al explicar las razones por las que no excluimos el reclamo. Cuarto, las Recomendaciones: dale consejos al usuario para evitar futuros inconvenientes. Quinto, Asesora su Reputacion: revisa el impacto y destaca su medalla. Nunca cierres el chat apresuradamente.",
    
    2: "Cuando un comprador menciona que recibio el producto con diferencias, debemos indagar profundamente. Por ejemplo, si hay problemas con el tamano de unas brocas, preguntamos: Crees que pudo haber pasado algo durante el envio? Esto lo especificas en la ficha tecnica? Has presentado esta situacion anteriormente? En la comunicacion, utiliza frases empaticas como: Como pudimos verlo juntos o Tal como pudiste notarlo. Si el vendedor afirma que el comprador miente, manten la calma y solicita imagenes como evidencia para validar las diferencias, evitando confrontaciones directas.",
    
    3: "Asesorar sobre la reputacion es vital para la experiencia del vendedor. Debemos revisar si supero el 1,5% de reclamos permitidos; si esta en un 2,22%, debemos calcular cuantas ventas necesita para recuperar su color verde. Explicale el programa de Recovery Seller y ayudale a proyectar fechas en un calendario de 365 dias. Si el impacto proviene de mediaciones o cancelaciones, revisenlo juntos. Finalmente, propon revisar las publicaciones a fondo, completar la ficha tecnica en tiempo real y aclarar las medidas en la descripcion para que no vuelva a recibir reclamos en esos productos."
};

// Metas por nivel
const LEVEL_TARGETS = {
    1: { ppm: 40, accuracy: 95, name: "Nivel 1: Fundamentos" },
    2: { ppm: 50, accuracy: 96, name: "Nivel 2: Indagacion" },
    3: { ppm: 60, accuracy: 97, name: "Nivel 3: Gestion Avanzada" }
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
// 🔐 FUNCIONES DE AUTENTICACIÓN CON VALIDACIÓN OBLIGATORIA
// ============================================

async function login() {
    console.log('🔐 Intentando login...');
    
    const name = document.getElementById('userName').value.trim();
    const id = document.getElementById('userId').value.trim();
    
    // Validación de campos vacíos
    if (!name || !id) {
        alert('⚠️ CAMPOS OBLIGATORIOS\n\nDebes completar:\n• Nombre Completo\n• ID de Usuario (LDAP)');
        return;
    }
    
    // Validar formato del nombre (debe tener al menos nombre y apellido)
    const nameWords = name.split(' ').filter(word => word.length > 0);
    if (nameWords.length < 2) {
        alert('⚠️ NOMBRE INCOMPLETO\n\nDebes ingresar tu nombre completo (nombre y apellido)\n\nEjemplo correcto:\nJohan Colmenares Rodriguez');
        document.getElementById('userName').focus();
        return;
    }
    
    // Validar formato del ID (solo letras minúsculas y números, sin espacios)
    const idRegex = /^[a-z0-9]+$/;
    if (!idRegex.test(id)) {
        alert('⚠️ FORMATO DE ID INCORRECTO\n\nEl ID de usuario (LDAP) debe:\n• Contener solo letras minusculas\n• Contener solo numeros\n• NO tener espacios\n• NO tener caracteres especiales\n\nEjemplo correcto: jcolmenares\nEjemplo incorrecto: JColmenares o j.colmenares');
        document.getElementById('userId').focus();
        return;
    }
    
    // Validar longitud mínima del ID
    if (id.length < 3) {
        alert('⚠️ ID MUY CORTO\n\nEl ID de usuario debe tener al menos 3 caracteres');
        document.getElementById('userId').focus();
        return;
    }
    
    // Mostrar loading mientras valida
    document.getElementById('loadingOverlay').classList.add('show');
    document.querySelector('.loading-overlay p').textContent = 'Validando usuario...';
    
    try {
        // Validar usuario contra Google Sheets
        const isValid = await validateUser(id, name);
        
        document.getElementById('loadingOverlay').classList.remove('show');
        
        if (!isValid) {
            alert('❌ ACCESO DENEGADO\n\nEl usuario NO existe en el sistema o los datos no coinciden.\n\nVerifica:\n• Tu ID de usuario (LDAP) en minusculas\n• Tu nombre completo exacto\n\nSi el problema persiste, contacta al administrador.');
            document.getElementById('userId').focus();
            return;
        }
        
        // Usuario válido - permitir acceso
        currentUser.name = name;
        currentUser.id = id;
        
        console.log('✅ Login exitoso:', currentUser);
        
        // Cambiar de vista
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('levelSelection').classList.add('active');
        
        // Mensaje de bienvenida
        setTimeout(() => {
            alert(`✅ BIENVENIDO/A ${name.split(' ')[0].toUpperCase()}!\n\nAcceso concedido.\n\nSelecciona un nivel para comenzar tu practica.`);
        }, 300);
        
    } catch (error) {
        document.getElementById('loadingOverlay').classList.remove('show');
        console.error('❌ Error en validacion:', error);
        alert('⚠️ ERROR AL VALIDAR USUARIO\n\nNo se pudo conectar con el sistema de validacion.\n\nPor favor:\n1. Verifica tu conexion a internet\n2. Intenta nuevamente\n3. Si el problema persiste, contacta al administrador\n\nCodigo de error: ' + error.message);
    }
}

// ============================================
// 🔍 VALIDAR USUARIO CONTRA GOOGLE SHEETS (OBLIGATORIO)
// ============================================

async function validateUser(userId, userName) {
    console.log('🔍 Validando usuario:', userId);
    
    // Verificar que la URL esté configurada
    if (GOOGLE_SCRIPT_URL === 'TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI') {
        console.error('❌ URL de Google Apps Script no configurada');
        alert('❌ SISTEMA NO CONFIGURADO\n\nEl sistema no esta configurado correctamente.\n\nContacta al administrador del sistema.\n\nCodigo de error: URL_NOT_CONFIGURED');
        return false;
    }
    
    try {
        // Crear URL con parámetros para validación
        const validationURL = `${GOOGLE_SCRIPT_URL}?action=validate&userId=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName)}`;
        
        console.log('📤 Enviando peticion de validacion...');
        
        const response = await fetch(validationURL, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('📥 Respuesta de validacion:', data);
        
        if (data.valid === true) {
            console.log('✅ Usuario validado correctamente');
            return true;
        } else {
            console.log('❌ Usuario no valido:', data.message);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error en fetch de validacion:', error);
        
        // BLOQUEAR ACCESO SI HAY ERROR
        alert('❌ ERROR DE CONEXION\n\nNo se pudo validar tu usuario.\n\nVerifica:\n1. Tu conexion a internet\n2. Que el sistema este configurado correctamente\n\nContacta al administrador si el problema persiste.\n\nError tecnico: ' + error.message);
        return false;
    }
}

function logout() {
    if (confirm('¿Seguro que deseas cerrar sesion?')) {
        console.log('👋 Cerrando sesion...');
        
        currentUser = { name: '', id: '' };
        currentLevel = 0;
        
        document.getElementById('userName').value = '';
        document.getElementById('userId').value = '';
        
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('levelSelection').classList.remove('active');
        document.getElementById('typingSection').classList.remove('active');
        
        console.log('✅ Sesion cerrada');
    }
}

// ============================================
// 🎯 FUNCIONES DE SELECCIÓN DE NIVEL
// ============================================

function selectLevel(level) {
    console.log(`🎯 Nivel seleccionado: ${level}`);
    
    currentLevel = level;
    currentText = PRACTICE_TEXTS[level];
    
    document.getElementById('levelSelection').classList.remove('active');
    document.getElementById('typingSection').classList.add('active');
    
    updateLevelInfo();
    displayText();
    resetStats();
}

function backToLevels() {
    if (isTestActive) {
        if (!confirm('¿Seguro que deseas salir? Perderas tu progreso actual.')) {
            return;
        }
        stopTest();
    }
    
    console.log('🔙 Volviendo a seleccion de niveles...');
    
    document.getElementById('typingSection').classList.remove('active');
    document.getElementById('levelSelection').classList.add('active');
    
    resetTest();
}

function updateLevelInfo() {
    const target = LEVEL_TARGETS[currentLevel];
    const badge = document.getElementById('currentLevelBadge');
    const description = document.getElementById('levelDescription');
    const targetInfo = document.getElementById('targetInfo');
    
    badge.textContent = target.name;
    badge.className = 'level-badge';
    
    if (currentLevel === 1) badge.style.background = '#4CAF50';
    if (currentLevel === 2) badge.style.background = '#FF9800';
    if (currentLevel === 3) badge.style.background = '#f44336';
    
    const wordCount = currentText.split(' ').length;
    description.textContent = `${wordCount} palabras`;
    
    targetInfo.innerHTML = `<strong>Meta:</strong> ${target.ppm}+ PPM | ${target.accuracy}%+ Precision`;
}

// ============================================
// 📝 FUNCIONES DE VISUALIZACIÓN DEL TEXTO
// ============================================

function displayText() {
    console.log('📝 Mostrando texto...');
    
    const display = document.getElementById('textDisplay');
    
    display.innerHTML = currentText.split('').map((char, index) => {
        const displayChar = char === ' ' ? '&nbsp;' : char;
        return `<span class="char" id="char-${index}">${displayChar}</span>`;
    }).join('');
    
    console.log(`✅ Texto mostrado: ${currentText.length} caracteres`);
}

// ============================================
// 🎯 SCROLL AUTOMÁTICO MEJORADO
// ============================================

function scrollToCurrentChar() {
    const currentChar = document.querySelector('.char.current');
    if (currentChar) {
        const textDisplay = document.getElementById('textDisplay');
        
        // Calcular la posición del carácter dentro del contenedor
        const charTop = currentChar.offsetTop;
        const displayHeight = textDisplay.clientHeight;
        const scrollTop = textDisplay.scrollTop;
        
        // Si el carácter está fuera de la vista visible
        if (charTop < scrollTop + 20 || charTop > scrollTop + displayHeight - 60) {
            // Hacer scroll suave para mantener el carácter visible
            const targetScroll = charTop - (displayHeight / 2) + 20;
            textDisplay.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        }
    }
}

// ============================================
// ⏱️ FUNCIONES DEL TEST
// ============================================

function startTest() {
    if (isTestActive) {
        console.log('⚠️ Test ya esta activo');
        return;
    }
    
    console.log('🚀 Iniciando test...');
    
    isTestActive = true;
    startTime = Date.now();
    errors = 0;
    totalChars = 0;
    
    const inputArea = document.getElementById('inputArea');
    inputArea.disabled = false;
    inputArea.value = '';
    inputArea.focus();
    
    document.getElementById('startBtn').disabled = true;
    document.getElementById('results').classList.remove('show');
    
    timerInterval = setInterval(updateTimer, 100);
    
    inputArea.addEventListener('input', handleInput);
    
    console.log('✅ Test iniciado');
}

function handleInput(e) {
    if (!isTestActive) return;
    
    const inputText = e.target.value;
    totalChars = inputText.length;
    
    errors = 0;
    
    for (let i = 0; i < currentText.length; i++) {
        const charElement = document.getElementById(`char-${i}`);
        
        if (i < inputText.length) {
            if (inputText[i] === currentText[i]) {
                charElement.className = 'char correct';
            } else {
                charElement.className = 'char incorrect';
                errors++;
            }
        } else if (i === inputText.length) {
            charElement.className = 'char current';
        } else {
            charElement.className = 'char';
        }
    }
    
    // SCROLL AUTOMÁTICO
    scrollToCurrentChar();
    
    updateStats();
    
    if (inputText.length >= currentText.length) {
        console.log('🏁 Test completado');
        finishTest();
    }
}

function updateTimer() {
    if (!startTime) return;
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer').textContent = elapsed + 's';
}

function updateStats() {
    if (!startTime) return;
    
    const elapsed = (Date.now() - startTime) / 1000 / 60;
    const wordsTyped = totalChars / 5;
    const ppm = Math.round(wordsTyped / elapsed) || 0;
    
    const accuracy = totalChars > 0 
        ? Math.round(((totalChars - errors) / totalChars) * 100)
        : 100;
    
    const score = Math.round(ppm * (accuracy / 100));
    
    document.getElementById('wpm').textContent = ppm;
    document.getElementById('accuracy').textContent = accuracy + '%';
    document.getElementById('errors').textContent = errors;
    document.getElementById('score').textContent = score;
}

function finishTest() {
    console.log('🏁 Finalizando test...');
    
    stopTest();
    
    const finalTime = Math.floor((Date.now() - startTime) / 1000);
    const ppm = parseInt(document.getElementById('wpm').textContent);
    const accuracy = parseInt(document.getElementById('accuracy').textContent);
    const score = parseInt(document.getElementById('score').textContent);
    
    console.log(`📊 Resultados: ${ppm} PPM | ${accuracy}% | Score: ${score}`);
    
    saveResults(finalTime, ppm, accuracy, score);
    showResults(finalTime, ppm, accuracy, score);
}

function stopTest() {
    isTestActive = false;
    clearInterval(timerInterval);
    
    const inputArea = document.getElementById('inputArea');
    inputArea.disabled = true;
    inputArea.removeEventListener('input', handleInput);
    
    document.getElementById('startBtn').disabled = false;
    
    console.log('⏹️ Test detenido');
}

function resetTest() {
    console.log('🔄 Reiniciando test...');
    
    stopTest();
    
    startTime = null;
    errors = 0;
    totalChars = 0;
    
    document.getElementById('inputArea').value = '';
    
    resetStats();
    document.getElementById('results').classList.remove('show');
    
    displayText();
    
    console.log('✅ Test reiniciado');
}

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

function saveResults(time, ppm, accuracy, score) {
    console.log('💾 Guardando resultados...');
    
    document.getElementById('loadingOverlay').classList.add('show');
    document.querySelector('.loading-overlay p').textContent = 'Guardando resultados...';
    
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
    
    if (GOOGLE_SCRIPT_URL === 'TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI') {
        console.error('❌ URL de Google Apps Script no configurada');
        document.getElementById('loadingOverlay').classList.remove('show');
        alert('⚠️ Sistema no configurado. Los resultados no se guardaran. Contacta al administrador.');
        return;
    }
    
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
// 📊 MOSTRAR RESULTADOS (CUARTILES INVERTIDOS)
// ============================================

function showResults(time, ppm, accuracy, score) {
    console.log('📊 Mostrando resultados...');
    
    const target = LEVEL_TARGETS[currentLevel];
    const metPPM = ppm >= target.ppm;
    const metAccuracy = accuracy >= target.accuracy;
    const passedLevel = metPPM && metAccuracy;
    
    // CUARTILES INVERTIDOS (Q1 = MEJOR, Q4 = PEOR)
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
                <strong>🎯 Precision</strong>
                <div class="value" style="color: ${metAccuracy ? '#4CAF50' : '#f44336'}">${accuracy}%</div>
                <small>${metAccuracy ? '✅' : '❌'} Meta: ${target.accuracy}%+</small>
            </div>
            
            <div class="result-item">
                <strong>📊 Puntaje Final</strong>
                <div class="value">${score}</div>
                <small>PPM × Precision</small>
            </div>
        </div>
        
        <div class="quartile-info">
            <h3>📍 Tu Ubicacion en el Ranking</h3>
            <div class="quartile-badge ${quartile.class}">${quartile.label}</div>
            <p>${quartile.description}</p>
        </div>
        
        <div class="performance-message">
            <strong>${passedLevel ? '🎯 ¡Meta alcanzada!' : '💪 Continua mejorando'}</strong>
            <p>${getPerformanceMessage(ppm, accuracy, target)}</p>
        </div>
    `;
    
    resultsDiv.classList.add('show');
    
    console.log('✅ Resultados mostrados');
}

// ============================================
// 🔄 CUARTILES INVERTIDOS (Q1 = MEJOR, Q4 = PEOR)
// ============================================

function calculateQuartile(score, level) {
    const ranges = {
        1: { q1: 45, q2: 38, q3: 30 },
        2: { q1: 55, q2: 48, q3: 40 },
        3: { q1: 65, q2: 58, q3: 50 }
    };
    
    const range = ranges[level];
    
    if (score >= range.q1) {
        return {
            label: 'Q1 - Top Performer',
            class: 'q1',
            description: '¡Excelente! Estas en el 25% superior. Eres un referente del equipo. ¡Felicitaciones!'
        };
    } 
    else if (score >= range.q2) {
        return {
            label: 'Q2 - Competente',
            class: 'q2',
            description: '¡Buen trabajo! Estas por encima del promedio. Sigue practicando para llegar al nivel experto.'
        };
    } 
    else if (score >= range.q3) {
        return {
            label: 'Q3 - En Desarrollo',
            class: 'q3',
            description: 'Estas en el promedio. Con practica constante alcanzaras mejores resultados. ¡Vas por buen camino!'
        };
    } 
    else {
        return {
            label: 'Q4 - Necesita Mejora',
            class: 'q4',
            description: 'Estas en el 25% inferior. Practica mas para mejorar tu velocidad y precision. ¡No te rindas!'
        };
    }
}

function getPerformanceMessage(ppm, accuracy, target) {
    if (ppm >= target.ppm && accuracy >= target.accuracy) {
        return `Has superado las metas del ${target.name}. ¡Estas listo para casos reales con esta complejidad! Considera intentar el siguiente nivel.`;
    } else if (ppm < target.ppm && accuracy >= target.accuracy) {
        return `Tu precision es excelente (${accuracy}%), pero necesitas aumentar tu velocidad. Intenta escribir mas rapido sin perder calidad. Meta: ${target.ppm} PPM.`;
    } else if (ppm >= target.ppm && accuracy < target.accuracy) {
        return `Tienes buena velocidad (${ppm} PPM), pero cometes demasiados errores. Reduce la velocidad y enfocate en la precision. Meta: ${target.accuracy}%.`;
    } else {
        return `Necesitas mejorar tanto velocidad como precision. Practica con textos mas cortos primero y aumenta gradualmente. ¡La practica hace al maestro!`;
    }
}

// ============================================
// 🚀 INICIALIZACIÓN
// ============================================

window.onload = function() {
    console.log('🚀 ========== SISTEMA DE MECANOGRAFIA INICIADO ==========');
    console.log('📅 Fecha:', new Date().toLocaleString('es-ES'));
    console.log('🌐 Navegador:', navigator.userAgent);
    
    if (GOOGLE_SCRIPT_URL === 'TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI') {
        console.warn('⚠️ ADVERTENCIA: URL de Google Apps Script no configurada');
        console.warn('⚠️ El sistema NO funcionara hasta que configures la URL');
    } else {
        console.log('✅ URL de Google Apps Script configurada');
    }
    
    console.log('✅ Sistema listo para usar');
    console.log('============================================================');
};

// ============================================
// 🔧 UTILIDADES
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const inputArea = document.getElementById('inputArea');
    
    if (inputArea) {
        inputArea.addEventListener('paste', function(e) {
            e.preventDefault();
            alert('⚠️ No esta permitido pegar texto. Debes escribirlo manualmente.');
            console.log('🚫 Intento de pegado bloqueado');
        });
        
        console.log('✅ Proteccion contra pegado activada');
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'F12') {
        e.preventDefault();
        console.log('🚫 F12 bloqueado');
    }
    
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        console.log('🚫 Ctrl+Shift+I bloqueado');
    }
});

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

if (isMobile()) {
    console.log('📱 Dispositivo movil detectado');
} else {
    console.log('💻 Dispositivo de escritorio detectado');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        login,
        logout,
        selectLevel,
        startTest,
        calculateQuartile
    };
}
