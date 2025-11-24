// ============================================
// 📋 CONFIGURACIÓN GLOBAL
// ============================================

const GOOGLE_SCRIPT_URL = 'https://script.google.com/a/macros/mercadolibre.com.co/s/AKfycbzYkkrc1zyP8BgyvMuGvOH444a1VoyPCAkNWPVL3yMRalpOQBRp2DgbVWGUeNK6oUiIXg/exec';

const PRACTICE_TEXTS = {
    1: "En nuestro botiquin de herramientas buscamos que uses cada recurso a tu favor. El proceso consta de cinco pasos esenciales. Primero, el Sondeo: usa todas las herramientas disponibles y revisa la tipificacion. Segundo, la Exploracion: las preguntas son claves para que el usuario llegue a la solucion contigo. Tercero, la Comunicacion: se claro al explicar las razones por las que no excluimos el reclamo. Cuarto, las Recomendaciones: dale consejos al usuario para evitar futuros inconvenientes. Quinto, Asesora su Reputacion: revisa el impacto y destaca su medalla. Nunca cierres el chat apresuradamente.",
    
    2: "Cuando un comprador menciona que recibio el producto con diferencias, debemos indagar profundamente. Por ejemplo, si hay problemas con el tamano de unas brocas, preguntamos: Crees que pudo haber pasado algo durante el envio? Esto lo especificas en la ficha tecnica? Has presentado esta situacion anteriormente? En la comunicacion, utiliza frases empaticas como: Como pudimos verlo juntos o Tal como pudiste notarlo. Si el vendedor afirma que el comprador miente, manten la calma y solicita imagenes como evidencia para validar las diferencias, evitando confrontaciones directas.",
    
    3: "Asesorar sobre la reputacion es vital para la experiencia del vendedor. Debemos revisar si supero el 1,5% de reclamos permitidos; si esta en un 2,22%, debemos calcular cuantas ventas necesita para recuperar su color verde. Explicale el programa de Recovery Seller y ayudale a proyectar fechas en un calendario de 365 dias. Si el impacto proviene de mediaciones o cancelaciones, revisenlo juntos. Finalmente, propon revisar las publicaciones a fondo, completar la ficha tecnica en tiempo real y aclarar las medidas en la descripcion para que no vuelva a recibir reclamos en esos productos."
};

const LEVEL_TARGETS = {
    1: { ppm: 40, accuracy: 95, name: "Nivel 1: Fundamentos" },
    2: { ppm: 50, accuracy: 96, name: "Nivel 2: Indagacion" },
    3: { ppm: 60, accuracy: 97, name: "Nivel 3: Gestion Avanzada" }
};

let currentUser = { name: '', id: '' };
let currentLevel = 0;
let currentText = '';
let startTime = null;
let timerInterval = null;
let isTestActive = false;
let errors = 0;
let totalChars = 0;

// ============================================
// 🔐 LOGIN SOLO CON LDAP
// ============================================

function login() {
    console.log('🔐 Iniciando login...');
    
    const id = document.getElementById('userId').value.trim().toLowerCase();
    
    if (!id) {
        alert('⚠️ CAMPO OBLIGATORIO\n\nDebes ingresar tu LDAP');
        return;
    }
    
    const idRegex = /^[a-z0-9]+$/;
    if (!idRegex.test(id)) {
        alert('⚠️ FORMATO INCORRECTO\n\nEl LDAP debe:\n• Solo letras minusculas\n• Solo numeros\n• Sin espacios\n\nEjemplo: jcolmenares');
        document.getElementById('userId').focus();
        return;
    }
    
    if (id.length < 3) {
        alert('⚠️ LDAP muy corto (minimo 3 caracteres)');
        document.getElementById('userId').focus();
        return;
    }
    
    if (GOOGLE_SCRIPT_URL === 'TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI') {
        alert('❌ SISTEMA NO CONFIGURADO\n\nContacta al administrador.');
        return;
    }
    
    document.getElementById('loadingOverlay').classList.add('show');
    document.querySelector('.loading-overlay p').textContent = 'Validando LDAP...';
    
    // Validar usando JSONP (evita problemas de CORS)
    validateLDAPWithJSONP(id);
}

// ============================================
// 🔍 VALIDAR LDAP CON JSONP (SIN CORS)
// ============================================

function validateLDAPWithJSONP(ldap) {
    console.log('🔍 Validando LDAP con JSONP:', ldap);
    
    // Crear callback único
    const callbackName = 'ldapCallback_' + Date.now();
    
    // Crear función callback global
    window[callbackName] = function(data) {
        console.log('📥 Respuesta recibida:', data);
        
        document.getElementById('loadingOverlay').classList.remove('show');
        
        if (data.exists === true) {
            console.log('✅ LDAP valido');
            
            currentUser.name = data.nombre || 'Usuario';
            currentUser.id = ldap;
            
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('levelSelection').classList.add('active');
            
            setTimeout(() => {
                alert(`✅ BIENVENIDO/A\n\n${currentUser.name}\n\nEquipo: ${data.lider || 'N/A'}`);
            }, 300);
        } else {
            console.log('❌ LDAP no encontrado');
            alert('❌ ACCESO DENEGADO\n\nEl LDAP "' + ldap + '" NO existe en el sistema.\n\nVerifica tu LDAP o contacta al administrador.');
            document.getElementById('userId').focus();
        }
        
        // Limpiar
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    // Crear script tag
    const script = document.createElement('script');
    script.src = `${GOOGLE_SCRIPT_URL}?action=checkUser&ldap=${encodeURIComponent(ldap)}&callback=${callbackName}`;
    
    // Manejar errores
    script.onerror = function() {
        console.error('❌ Error al cargar script');
        document.getElementById('loadingOverlay').classList.remove('show');
        alert('❌ ERROR DE CONEXION\n\nNo se pudo conectar con el sistema.\n\nVerifica:\n1. Tu conexion a internet\n2. Que el Google Apps Script este implementado como "Cualquier persona"\n\nContacta al administrador si el problema persiste.');
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    document.body.appendChild(script);
}

function logout() {
    if (confirm('¿Cerrar sesion?')) {
        currentUser = { name: '', id: '' };
        currentLevel = 0;
        document.getElementById('userId').value = '';
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('levelSelection').classList.remove('active');
        document.getElementById('typingSection').classList.remove('active');
    }
}

// ============================================
// 🎯 SELECCIÓN DE NIVEL
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
    if (isTestActive && !confirm('¿Salir? Perderas tu progreso.')) return;
    stopTest();
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
    if (currentLevel === 1) badge.style.background = '#4CAF50';
    if (currentLevel === 2) badge.style.background = '#FF9800';
    if (currentLevel === 3) badge.style.background = '#f44336';
    
    description.textContent = `${currentText.split(' ').length} palabras`;
    targetInfo.innerHTML = `<strong>Meta:</strong> ${target.ppm}+ PPM | ${target.accuracy}%+ Precision`;
}

// ============================================
// 📝 VISUALIZACIÓN
// ============================================

function displayText() {
    const display = document.getElementById('textDisplay');
    display.innerHTML = currentText.split('').map((char, index) => {
        return `<span class="char" id="char-${index}">${char === ' ' ? '&nbsp;' : char}</span>`;
    }).join('');
}

function scrollToCurrentChar() {
    const currentChar = document.querySelector('.char.current');
    if (currentChar) {
        const textDisplay = document.getElementById('textDisplay');
        const charTop = currentChar.offsetTop;
        const displayHeight = textDisplay.clientHeight;
        const scrollTop = textDisplay.scrollTop;
        
        if (charTop < scrollTop + 20 || charTop > scrollTop + displayHeight - 60) {
            textDisplay.scrollTo({
                top: Math.max(0, charTop - (displayHeight / 2) + 20),
                behavior: 'smooth'
            });
        }
    }
}

// ============================================
// ⏱️ TEST
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
            charElement.className = inputText[i] === currentText[i] ? 'char correct' : 'char incorrect';
            if (inputText[i] !== currentText[i]) errors++;
        } else if (i === inputText.length) {
            charElement.className = 'char current';
        } else {
            charElement.className = 'char';
        }
    }
    
    scrollToCurrentChar();
    updateStats();
    
    if (inputText.length >= currentText.length) finishTest();
}

function updateTimer() {
    if (!startTime) return;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer').textContent = elapsed + 's';
}

function updateStats() {
    if (!startTime) return;
    
    const elapsed = (Date.now() - startTime) / 1000 / 60;
    const ppm = Math.round((totalChars / 5) / elapsed) || 0;
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
// 💾 GUARDAR
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
        console.log('✅ Datos enviados');
        document.getElementById('loadingOverlay').classList.remove('show');
    })
    .catch(() => {
        document.getElementById('loadingOverlay').classList.remove('show');
    });
}

// ============================================
// 📊 RESULTADOS
// ============================================

function showResults(time, ppm, accuracy, score) {
    const target = LEVEL_TARGETS[currentLevel];
    const metPPM = ppm >= target.ppm;
    const metAccuracy = accuracy >= target.accuracy;
    const passedLevel = metPPM && metAccuracy;
    const quartile = calculateQuartile(score, currentLevel);
    
    document.getElementById('results').innerHTML = `
        <h2>${passedLevel ? '🎉 ¡Excelente!' : '💪 Sigue practicando'}</h2>
        <div class="results-grid">
            <div class="result-item">
                <strong>⏱️ Tiempo</strong>
                <div class="value">${time}s</div>
            </div>
            <div class="result-item">
                <strong>⚡ PPM</strong>
                <div class="value" style="color: ${metPPM ? '#4CAF50' : '#f44336'}">${ppm}</div>
                <small>${metPPM ? '✅' : '❌'} Meta: ${target.ppm}+</small>
            </div>
            <div class="result-item">
                <strong>🎯 Precision</strong>
                <div class="value" style="color: ${metAccuracy ? '#4CAF50' : '#f44336'}">${accuracy}%</div>
                <small>${metAccuracy ? '✅' : '❌'} Meta: ${target.accuracy}%+</small>
            </div>
            <div class="result-item">
                <strong>📊 Puntaje</strong>
                <div class="value">${score}</div>
            </div>
        </div>
        <div class="quartile-info">
            <h3>📍 Tu Ubicacion</h3>
            <div class="quartile-badge ${quartile.class}">${quartile.label}</div>
            <p>${quartile.description}</p>
        </div>
    `;
    document.getElementById('results').classList.add('show');
}

function calculateQuartile(score, level) {
    const ranges = {
        1: { q1: 45, q2: 38, q3: 30 },
        2: { q1: 55, q2: 48, q3: 40 },
        3: { q1: 65, q2: 58, q3: 50 }
    };
    
    const range = ranges[level];
    
    if (score >= range.q1) return { label: 'Q1 - Top Performer', class: 'q1', description: '¡Excelente! Top 25%' };
    if (score >= range.q2) return { label: 'Q2 - Competente', class: 'q2', description: 'Buen trabajo!' };
    if (score >= range.q3) return { label: 'Q3 - En Desarrollo', class: 'q3', description: 'Sigue practicando' };
    return { label: 'Q4 - Necesita Mejora', class: 'q4', description: 'Practica mas' };
}

window.onload = function() {
    console.log('✅ Sistema iniciado');
    document.getElementById('userId').focus();
};

document.addEventListener('DOMContentLoaded', function() {
    const inputArea = document.getElementById('inputArea');
    if (inputArea) {
        inputArea.addEventListener('paste', function(e) {
            e.preventDefault();
            alert('⚠️ No puedes pegar texto');
        });
    }
});
