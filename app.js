const GOOGLE_SCRIPT_URL = 'https://script.google.com/a/macros/mercadolibre.com.co/s/AKfycbzJIEVMrQoPv_KawZYmCO1C64J2bnBG_Z4YB3vDUzB96GqNwuMT59ePbotkcvG-HXLPFA/exec';

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

function login() {
    const id = document.getElementById('userId').value.trim().toLowerCase();
    
    if (!id) {
        alert('⚠️ Debes ingresar tu LDAP');
        return;
    }
    
    if (!/^[a-z0-9]+$/.test(id)) {
        alert('⚠️ LDAP invalido (solo minusculas y numeros)');
        document.getElementById('userId').focus();
        return;
    }
    
    if (id.length < 3) {
        alert('⚠️ LDAP muy corto');
        document.getElementById('userId').focus();
        return;
    }
    
    document.getElementById('loadingOverlay').classList.add('show');
    validateLDAPWithJSONP(id);
}

function validateLDAPWithJSONP(ldap) {
    const callbackName = 'ldapCallback_' + Date.now();
    
    window[callbackName] = function(data) {
        document.getElementById('loadingOverlay').classList.remove('show');
        
        if (data.exists === true) {
            currentUser.name = data.nombre || 'Usuario';
            currentUser.id = ldap;
            
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('levelSelection').classList.add('active');
        } else {
            alert('❌ LDAP "' + ldap + '" no existe en el sistema');
            document.getElementById('userId').focus();
        }
        
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    const script = document.createElement('script');
    script.src = `${GOOGLE_SCRIPT_URL}?action=checkUser&ldap=${encodeURIComponent(ldap)}&callback=${callbackName}`;
    script.onerror = function() {
        document.getElementById('loadingOverlay').classList.remove('show');
        alert('❌ Error de conexion');
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
    if (isTestActive && !confirm('¿Salir?')) return;
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

function displayText() {
    const display = document.getElementById('textDisplay');
    display.innerHTML = currentText.split('').map((char, index) => {
        return `<span class="char" id="char-${index}">${char === ' ' ? '&nbsp;' : char}</span>`;
    }).join('');
}

// ============================================
// 🎯 SCROLL AUTOMÁTICO DEFINITIVO
// ============================================

function scrollToCurrentChar() {
    const currentChar = document.querySelector('.char.current');
    
    if (!currentChar) return;
    
    const textDisplay = document.getElementById('textDisplay');
    
    // Obtener posiciones
    const containerRect = textDisplay.getBoundingClientRect();
    const charRect = currentChar.getBoundingClientRect();
    
    // Verificar si está fuera de vista
    const margen = 50;
    const isAbove = charRect.top < containerRect.top + margen;
    const isBelow = charRect.bottom > containerRect.bottom - margen;
    
    if (isAbove || isBelow) {
        // Hacer scroll instantáneo para mantener visible
        const charOffsetTop = currentChar.offsetTop;
        const containerHeight = textDisplay.clientHeight;
        
        // Centrar el carácter
        textDisplay.scrollTop = charOffsetTop - (containerHeight / 2);
    }
}

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
    
    // SCROLL AUTOMÁTICO - se ejecuta en cada tecla
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

function saveResults(time, ppm, accuracy, score) {
    document.getElementById('loadingOverlay').classList.add('show');
    document.querySelector('.loading-overlay p').textContent = 'Guardando...';
    
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
    
    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(() => document.getElementById('loadingOverlay').classList.remove('show'))
    .catch(() => document.getElementById('loadingOverlay').classList.remove('show'));
}

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
