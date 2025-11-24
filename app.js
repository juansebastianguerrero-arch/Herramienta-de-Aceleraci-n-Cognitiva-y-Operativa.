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
// 🔐 LOGIN CON VALIDACIÓN SIMPLE
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
        alert('⚠️ NOMBRE INCOMPLETO\n\nDebes ingresar tu nombre completo (nombre y apellido)\n\nEjemplo: Juan Sebastian Guerrero');
        document.getElementById('userName').focus();
        return;
    }
    
    // Validar formato del ID (solo letras minúsculas y números)
    const idRegex = /^[a-z0-9]+$/;
    if (!idRegex.test(id)) {
        alert('⚠️ FORMATO DE LDAP INCORRECTO\n\nEl LDAP debe:\n• Solo letras minusculas\n• Solo numeros\n• Sin espacios ni caracteres especiales\n\nEjemplo: uaguerrero');
        document.getElementById('userId').focus();
        return;
    }
    
    // Validar longitud mínima
    if (id.length < 3) {
        alert('⚠️ LDAP MUY CORTO\n\nEl LDAP debe tener al menos 3 caracteres');
        document.getElementById('userId').focus();
        return;
    }
    
    // Mostrar loading
    document.getElementById('loadingOverlay').classList.add('show');
    document.querySelector('.loading-overlay p').textContent = 'Validando usuario...';
    
    // Validar contra Google Sheets
    const isValid = await validateUserInSheet(id);
    
    document.getElementById('loadingOverlay').classList.remove('show');
    
    if (!isValid) {
        alert('❌ ACCESO DENEGADO\n\nEl LDAP "' + id + '" NO existe en el sistema.\n\nVerifica tu LDAP o contacta al administrador.');
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
}

// ============================================
// 🔍 VALIDAR USUARIO EN GOOGLE SHEETS
// ============================================

async function validateUserInSheet(userId) {
    console.log('🔍 Validando LDAP:', userId);
    
    // Verificar que la URL esté configurada
    if (GOOGLE_SCRIPT_URL === 'TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI') {
        console.error('❌ URL no configurada');
        alert('❌ SISTEMA NO CONFIGURADO\n\nContacta al administrador.\n\nCódigo: URL_NOT_CONFIGURED');
        return false;
    }
    
    try {
        // Llamar al endpoint de validación
        const url = `${GOOGLE_SCRIPT_URL}?action=checkUser&ldap=${encodeURIComponent(userId)}`;
        
        console.log('📤 Consultando:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        });
        
        const text = await response.text();
        console.log('📥 Respuesta raw:', text);
        
        // Intentar parsear como JSON
        try {
            const data = JSON.parse(text);
            console.log('📥 Respuesta parseada:', data);
            return data.exists === true;
        } catch (e) {
            // Si no es JSON, verificar si contiene "true" o "false"
            if (text.includes('true')) {
                console.log('✅ Usuario existe (respuesta texto)');
                return true;
            } else {
                console.log('❌ Usuario no existe (respuesta texto)');
                return false;
            }
        }
        
    } catch (error) {
        console.error('❌ Error en validación:', error);
        alert('❌ ERROR DE CONEXIÓN\n\nNo se pudo conectar con el sistema.\n\nVerifica tu internet y vuelve a intentar.\n\nError: ' + error.message);
        return false;
    }
}

function logout() {
    if (confirm('¿Seguro que deseas cerrar sesion?')) {
        currentUser = { name: '', id: '' };
        currentLevel = 0;
        
        document.getElementById('userName').value = '';
        document.getElementById('userId').value = '';
        
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('levelSelection').classList.remove('active');
        document.getElementById('typingSection').classList.remove('active');
    }
}

// ============================================
// 🎯 FUNCIONES DE SELECCIÓN DE NIVEL
// ============================================

function selectLevel(level) {
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
// 📝 VISUALIZACIÓN DEL TEXTO
// ============================================

function displayText() {
    const display = document.getElementById('textDisplay');
    display.innerHTML = currentText.split('').map((char, index) => {
        const displayChar = char === ' ' ? '&nbsp;' : char;
        return `<span class="char" id="char-${index}">${displayChar}</span>`;
    }).join('');
}

// ============================================
// 🎯 SCROLL AUTOMÁTICO
// ============================================

function scrollToCurrentChar() {
    const currentChar = document.querySelector('.char.current');
    if (currentChar) {
        const textDisplay = document.getElementById('textDisplay');
        const charTop = currentChar.offsetTop;
        const displayHeight = textDisplay.clientHeight;
        const scrollTop = textDisplay.scrollTop;
        
        if (charTop < scrollTop + 20 || charTop > scrollTop + displayHeight - 60) {
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
    if (isTestActive) return;
    
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
    
    scrollToCurrentChar();
    updateStats();
    
    if (inputText.length >= currentText.length) {
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
    const accuracy = totalChars > 0 ? Math.round(((totalChars - errors) / totalChars) * 100) : 100;
    const score = Math.round(ppm * (accuracy / 100));
    
    document.getElementById('wpm').textContent = ppm;
    document.getElementById('accuracy').textContent = accuracy + '%';
    document.getElementById('errors').textContent = errors;
    document.getElementById('score').textContent = score;
}

function finishTest() {
    stopTest();
    
    const finalTime = Math.floor((Date.now() - startTime) / 1000);
    const ppm = parseInt(document.getElementById('wpm').textContent);
    const accuracy = parseInt(document.getElementById('accuracy').textContent);
    const score = parseInt(document.getElementById('score').textContent);
    
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
}

function resetTest() {
    stopTest();
    startTime = null;
    errors = 0;
    totalChars = 0;
    
    document.getElementById('inputArea').value = '';
    resetStats();
    document.getElementById('results').classList.remove('show');
    displayText();
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
    
    if (GOOGLE_SCRIPT_URL === 'TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI') {
        document.getElementById('loadingOverlay').classList.remove('show');
        return;
    }
    
    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(() => {
        document.getElementById('loadingOverlay').classList.remove('show');
    })
    .catch(error => {
        document.getElementById('loadingOverlay').classList.remove('show');
    });
}

// ============================================
// 📊 MOSTRAR RESULTADOS
// ============================================

function showResults(time, ppm, accuracy, score) {
    const target = LEVEL_TARGETS[currentLevel];
    const metPPM = ppm >= target.ppm;
    const metAccuracy = accuracy >= target.accuracy;
    const passedLevel = metPPM && metAccuracy;
    const quartile = calculateQuartile(score, currentLevel);
    
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <h2>${passedLevel ? '🎉 ¡Excelente trabajo!' : '💪 Sigue practicando'}</h2>
        <div class="results-grid">
            <div class="result-item">
                <strong>⏱️ Tiempo Total</strong>
                <div class="value">${time}s</div>
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
            </div>
        </div>
        <div class="quartile-info">
            <h3>📍 Tu Ubicacion en el Ranking</h3>
            <div class="quartile-badge ${quartile.class}">${quartile.label}</div>
            <p>${quartile.description}</p>
        </div>
    `;
    resultsDiv.classList.add('show');
}

function calculateQuartile(score, level) {
    const ranges = {
        1: { q1: 45, q2: 38, q3: 30 },
        2: { q1: 55, q2: 48, q3: 40 },
        3: { q1: 65, q2: 58, q3: 50 }
    };
    
    const range = ranges[level];
    
    if (score >= range.q1) {
        return { label: 'Q1 - Top Performer', class: 'q1', description: '¡Excelente! Estas en el 25% superior.' };
    } else if (score >= range.q2) {
        return { label: 'Q2 - Competente', class: 'q2', description: '¡Buen trabajo! Estas por encima del promedio.' };
    } else if (score >= range.q3) {
        return { label: 'Q3 - En Desarrollo', class: 'q3', description: 'Estas en el promedio. Sigue practicando.' };
    } else {
        return { label: 'Q4 - Necesita Mejora', class: 'q4', description: 'Practica mas para mejorar.' };
    }
}

// ============================================
// 🚀 INICIALIZACIÓN
// ============================================

window.onload = function() {
    console.log('🚀 Sistema iniciado');
};

document.addEventListener('DOMContentLoaded', function() {
    const inputArea = document.getElementById('inputArea');
    if (inputArea) {
        inputArea.addEventListener('paste', function(e) {
            e.preventDefault();
            alert('⚠️ No esta permitido pegar texto.');
        });
    }
});
