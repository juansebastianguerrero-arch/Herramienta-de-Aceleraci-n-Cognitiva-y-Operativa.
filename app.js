// ============================================
// 📋 CONFIGURACIÓN GLOBAL
// ============================================

const GOOGLE_SCRIPT_URL = 'https://script.google.com/a/macros/mercadolibre.com.co/s/AKfycbxU1RrFj9Naj20l6pmimKi4PWFWC14DFH6QCGQuiANSy0OER5nWMsuzZG9f9O9s0OW84Q/exec';

const LEVEL_TARGETS = {
    1: { ppm: 40, accuracy: 95, name: "Nivel 1: Fundamentos" },
    2: { ppm: 50, accuracy: 96, name: "Nivel 2: Indagacion" },
    3: { ppm: 60, accuracy: 97, name: "Nivel 3: Gestion Avanzada" }
};

const LEVEL_TEXTS = {
    1: `El botiquin de herramientas es fundamental para brindar un servicio de calidad. Los 5 pasos esenciales del proceso de atencion son: saludo inicial, indagacion profunda, resolucion efectiva, confirmacion de satisfaccion y despedida cordial. Cada paso debe ejecutarse con precision y empatia hacia el cliente.`,
    
    2: `Como puedo ayudarte hoy? Entiendo tu situacion y estoy aqui para resolverla. Cuentame mas detalles sobre lo que esta pasando. Lamento mucho los inconvenientes que has experimentado. Vamos a solucionar esto juntos. Cual es tu principal preocupacion en este momento? Dejame verificar esa informacion para ti.`,
    
    3: `El programa Recovery Seller tiene como objetivo recuperar el 85% de los vendedores afectados. El calculo se realiza asi: total de casos resueltos dividido entre casos totales multiplicado por 100. Si tenemos 340 casos resueltos de 400 totales, el porcentaje es 85%. La meta trimestral es mantener un NPS superior a 75 puntos.`
};

// Variables globales
let currentUser = { name: '', id: '', lider: '', turno: '', color: '' };
let currentLevel = 0;
let currentText = '';
let startTime = null;
let timerInterval = null;
let isTestActive = false;
let errors = 0;
let totalChars = 0;
let currentCharIndex = 0;

// NUEVAS VARIABLES PARA MÉTRICAS AVANZADAS
let firstCharTime = null;
let lastKeyTime = null;
let pausasLargas = 0;
let correcciones = 0;
let tiemposSinPausa = [];

// ============================================
// 🔐 SISTEMA DE LOGIN
// ============================================

function login() {
    const id = document.getElementById('userId').value.trim().toLowerCase();
    
    if (!id) {
        mostrarAlerta('⚠️ Debes ingresar tu LDAP', 'warning');
        return;
    }
    
    if (!/^[a-z0-9]+$/.test(id)) {
        mostrarAlerta('⚠️ LDAP invalido (solo minusculas y numeros)', 'error');
        document.getElementById('userId').focus();
        return;
    }
    
    if (id.length < 3) {
        mostrarAlerta('⚠️ LDAP muy corto (minimo 3 caracteres)', 'error');
        document.getElementById('userId').focus();
        return;
    }
    
    mostrarLoading('Validando LDAP...');
    validateLDAPWithJSONP(id);
}

function validateLDAPWithJSONP(ldap) {
    const callbackName = 'jsonpCallback_' + Date.now();
    
    window[callbackName] = function(response) {
        ocultarLoading();
        
        console.log('📥 Respuesta LDAP:', response);
        
        if (response.exists) {
            currentUser = {
                id: ldap,
                name: response.nombre,
                lider: response.lider,
                turno: response.turno,
                color: response.color
            };
            
            console.log('✅ Usuario autenticado:', currentUser);
            
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('levelSelection').classList.add('active');
            
            mostrarAlerta(`✅ Bienvenido ${currentUser.name}!`, 'success');
        } else {
            mostrarAlerta('❌ LDAP no encontrado en el sistema', 'error');
            document.getElementById('userId').focus();
        }
        
        delete window[callbackName];
        const script = document.querySelector(`script[src*="${callbackName}"]`);
        if (script) script.remove();
    };
    
    const script = document.createElement('script');
    script.src = `${GOOGLE_SCRIPT_URL}?action=checkUser&ldap=${encodeURIComponent(ldap)}&callback=${callbackName}`;
    script.onerror = function() {
        ocultarLoading();
        mostrarAlerta('❌ Error de conexion. Intenta nuevamente.', 'error');
        delete window[callbackName];
    };
    
    document.body.appendChild(script);
}

function logout() {
    if (isTestActive && !confirm('¿Estas seguro de cerrar sesion? Se perdera el progreso actual.')) {
        return;
    }
    
    stopTest();
    currentUser = { name: '', id: '', lider: '', turno: '', color: '' };
    currentLevel = 0;
    
    document.getElementById('levelSelection').classList.remove('active');
    document.getElementById('typingSection').classList.remove('active');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('userId').value = '';
    document.getElementById('userId').focus();
    
    mostrarAlerta('👋 Sesion cerrada', 'info');
}

// ============================================
// 📚 SISTEMA DE NIVELES
// ============================================

function selectLevel(level) {
    currentLevel = level;
    currentText = LEVEL_TEXTS[level];
    
    console.log(`📚 Nivel ${level} seleccionado`);
    console.log(`📝 Texto: ${currentText.length} caracteres`);
    
    document.getElementById('levelSelection').classList.remove('active');
    document.getElementById('typingSection').classList.add('active');
    
    updateLevelInfo();
    displayText();
    resetStats();
    
    document.getElementById('startBtn').focus();
}

function backToLevels() {
    if (isTestActive && !confirm('¿Salir del test? Se perdera el progreso actual.')) {
        return;
    }
    
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
    
    if (currentLevel === 1) badge.style.background = 'linear-gradient(135deg, #4CAF50, #66bb6a)';
    if (currentLevel === 2) badge.style.background = 'linear-gradient(135deg, #FF9800, #ffb74d)';
    if (currentLevel === 3) badge.style.background = 'linear-gradient(135deg, #f44336, #ef5350)';
    
    const wordCount = currentText.split(' ').length;
    description.textContent = `${wordCount} palabras | ${currentText.length} caracteres`;
    targetInfo.innerHTML = `<strong>Meta:</strong> ${target.ppm}+ PPM | ${target.accuracy}%+ Precision`;
}

function displayText() {
    const display = document.getElementById('textDisplay');
    display.innerHTML = currentText.split('').map((char, index) => {
        return `<span class="char" id="char-${index}">${char === ' ' ? '&nbsp;' : char}</span>`;
    }).join('');
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-indicator';
    progressBar.id = 'progressBar';
    display.insertBefore(progressBar, display.firstChild);
}

// ============================================
// ⏱️ SISTEMA DE TEST
// ============================================

function startTest() {
    if (isTestActive) return;
    
    console.log('🚀 Iniciando test...');
    
    isTestActive = true;
    startTime = Date.now();
    errors = 0;
    totalChars = 0;
    currentCharIndex = 0;
    
    // RESETEAR MÉTRICAS AVANZADAS
    firstCharTime = null;
    lastKeyTime = null;
    pausasLargas = 0;
    correcciones = 0;
    tiemposSinPausa = [];
    
    const inputArea = document.getElementById('inputArea');
    inputArea.disabled = false;
    inputArea.value = '';
    inputArea.placeholder = 'Comienza a escribir...';
    inputArea.focus();
    
    const startBtn = document.getElementById('startBtn');
    startBtn.textContent = 'Test en Progreso...';
    startBtn.disabled = true;
    
    timerInterval = setInterval(updateTimer, 100);
    
    document.getElementById('char-0').classList.add('current');
    
    mostrarAlerta('✅ Test iniciado! Escribe con precision.', 'success');
}

function stopTest() {
    if (!isTestActive) return;
    
    console.log('⏹️ Deteniendo test...');
    
    isTestActive = false;
    clearInterval(timerInterval);
    
    const inputArea = document.getElementById('inputArea');
    inputArea.disabled = true;
    
    const startBtn = document.getElementById('startBtn');
    startBtn.textContent = 'Iniciar Test';
    startBtn.disabled = false;
}

function resetTest() {
    stopTest();
    
    document.getElementById('inputArea').value = '';
    document.getElementById('inputArea').disabled = true;
    
    resetStats();
    
    document.getElementById('results').innerHTML = '';
    document.getElementById('results').classList.remove('show');
    
    if (currentText) {
        displayText();
    }
    
    // Resetear métricas avanzadas
    firstCharTime = null;
    lastKeyTime = null;
    pausasLargas = 0;
    correcciones = 0;
    tiemposSinPausa = [];
    
    console.log('🔄 Test reseteado');
}

// ============================================
// ⌨️ MANEJO DE ESCRITURA CON MÉTRICAS AVANZADAS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const inputArea = document.getElementById('inputArea');
    
    if (inputArea) {
        inputArea.addEventListener('paste', function(e) {
            e.preventDefault();
            mostrarAlerta('⚠️ No puedes pegar texto. Debes escribir manualmente.', 'warning');
        });
        
        inputArea.addEventListener('input', handleInput);
        
        inputArea.addEventListener('copy', function(e) {
            e.preventDefault();
        });
        
        inputArea.addEventListener('cut', function(e) {
            e.preventDefault();
        });
        
        // NUEVO: Detectar backspace (correcciones)
        inputArea.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && isTestActive) {
                correcciones++;
                console.log('⌫ Corrección detectada. Total:', correcciones);
            }
        });
    }
});

function handleInput(e) {
    if (!isTestActive) return;
    
    const inputText = e.target.value;
    const inputLength = inputText.length;
    const now = Date.now();
    
    // CAPTURAR TIEMPO DEL PRIMER CARÁCTER
    if (inputLength === 1 && !firstCharTime) {
        firstCharTime = now - startTime;
        console.log('⏱️ Tiempo 1er carácter:', firstCharTime, 'ms');
    }
    
    // DETECTAR PAUSAS LARGAS (>2 segundos)
    if (lastKeyTime && (now - lastKeyTime) > 2000) {
        pausasLargas++;
        console.log('⏸️ Pausa larga detectada. Total:', pausasLargas);
    }
    
    // REGISTRAR TIEMPO ENTRE TECLAS (para velocidad sostenida)
    if (lastKeyTime) {
        const tiempoEntreTeclas = now - lastKeyTime;
        if (tiempoEntreTeclas < 2000) { // Solo si no es pausa larga
            tiemposSinPausa.push(tiempoEntreTeclas);
        }
    }
    
    lastKeyTime = now;
    
    // Actualizar progreso
    updateProgress(inputLength);
    
    // Actualizar visualización carácter por carácter
    for (let i = 0; i < currentText.length; i++) {
        const charElement = document.getElementById(`char-${i}`);
        
        if (i < inputLength) {
            if (inputText[i] === currentText[i]) {
                charElement.className = 'char correct';
            } else {
                charElement.className = 'char incorrect';
                if (i === inputLength - 1 && !charElement.dataset.errorCounted) {
                    errors++;
                    charElement.dataset.errorCounted = 'true';
                }
            }
        } else if (i === inputLength) {
            charElement.className = 'char current';
            currentCharIndex = i;
            scrollToCurrentChar(charElement);
        } else {
            charElement.className = 'char';
            delete charElement.dataset.errorCounted;
        }
    }
    
    totalChars = inputLength;
    updateStats();
    
    if (inputLength === currentText.length) {
        finishTest();
    }
}

// ============================================
// 📊 SCROLL AUTOMÁTICO INTELIGENTE
// ============================================

function scrollToCurrentChar(charElement) {
    const display = document.getElementById('textDisplay');
    
    if (!charElement || !display) return;
    
    const charTop = charElement.offsetTop;
    const displayHeight = display.clientHeight;
    const currentScroll = display.scrollTop;
    
    const targetScroll = charTop - (displayHeight / 3);
    
    if (charTop < currentScroll + 50 || charTop > currentScroll + displayHeight - 50) {
        display.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth'
        });
    }
    
    highlightCurrentLine();
}

function highlightCurrentLine() {
    document.querySelectorAll('.line-highlight').forEach(el => {
        el.classList.remove('line-highlight');
    });
    
    let lineStart = currentCharIndex;
    while (lineStart > 0 && currentText[lineStart - 1] !== ' ') {
        lineStart--;
    }
    
    let lineEnd = currentCharIndex;
    while (lineEnd < currentText.length && currentText[lineEnd] !== ' ') {
        lineEnd++;
    }
    
    for (let i = lineStart; i <= lineEnd && i < currentText.length; i++) {
        const char = document.getElementById(`char-${i}`);
        if (char && !char.classList.contains('correct') && !char.classList.contains('incorrect')) {
            char.classList.add('line-highlight');
        }
    }
}

function updateProgress(currentLength) {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const percentage = (currentLength / currentText.length) * 100;
        progressBar.style.width = percentage + '%';
    }
}

// ============================================
// 📈 ACTUALIZACIÓN DE ESTADÍSTICAS
// ============================================

function updateTimer() {
    if (!isTestActive || !startTime) return;
    
    const elapsed = (Date.now() - startTime) / 1000;
    document.getElementById('timer').textContent = elapsed.toFixed(1) + 's';
}

function updateStats() {
    if (!isTestActive || !startTime) return;
    
    const elapsed = (Date.now() - startTime) / 1000;
    
    const wordsTyped = totalChars / 5;
    const minutes = elapsed / 60;
    const ppm = minutes > 0 ? Math.round(wordsTyped / minutes) : 0;
    
    const accuracy = totalChars > 0 ? ((totalChars - errors) / totalChars * 100) : 100;
    
    const score = ppm * (accuracy / 100);
    
    document.getElementById('wpm').textContent = ppm;
    document.getElementById('accuracy').textContent = accuracy.toFixed(1) + '%';
    document.getElementById('errors').textContent = errors;
    document.getElementById('score').textContent = score.toFixed(2);
}

function resetStats() {
    document.getElementById('wpm').textContent = '0';
    document.getElementById('accuracy').textContent = '100%';
    document.getElementById('timer').textContent = '0s';
    document.getElementById('errors').textContent = '0';
    document.getElementById('score').textContent = '0';
}

// ============================================
// 🏁 FINALIZACIÓN CON GUARDADO AUTOMÁTICO
// ============================================

function finishTest() {
    console.log('🏁 Test finalizado!');
    
    stopTest();
    
    const elapsed = (Date.now() - startTime) / 1000;
    
    // Calcular métricas finales
    const wordsTyped = totalChars / 5;
    const minutes = elapsed / 60;
    const ppm = Math.round(wordsTyped / minutes);
    const accuracy = ((totalChars - errors) / totalChars * 100);
    const score = ppm * (accuracy / 100);
    
    // CALCULAR VELOCIDAD SOSTENIDA (sin pausas)
    let velocidadSostenida = ppm;
    if (tiemposSinPausa.length > 0) {
        const promedioEntreTeclas = tiemposSinPausa.reduce((a, b) => a + b, 0) / tiemposSinPausa.length;
        const charsPerSecond = 1000 / promedioEntreTeclas;
        const wordsPerSecond = charsPerSecond / 5;
        velocidadSostenida = Math.round(wordsPerSecond * 60);
    }
    
    console.log('📊 Resultados finales:');
    console.log('  - PPM:', ppm);
    console.log('  - Precisión:', accuracy.toFixed(2) + '%');
    console.log('  - Puntaje:', score.toFixed(2));
    console.log('  - Errores:', errors);
    console.log('  - Tiempo 1er char:', firstCharTime, 'ms');
    console.log('  - Pausas largas:', pausasLargas);
    console.log('  - Velocidad sostenida:', velocidadSostenida);
    console.log('  - Correcciones:', correcciones);
    
    window.lastTestResults = {
        time: elapsed,
        ppm: ppm,
        accuracy: accuracy,
        score: score,
        firstCharTime: firstCharTime || 0,
        pausasLargas: pausasLargas,
        velocidadSostenida: velocidadSostenida,
        correcciones: correcciones
    };
    
    // GUARDADO AUTOMÁTICO
    mostrarLoading('Guardando resultados automáticamente...');
    guardarAutomaticamente();
}

// ============================================
// 💾 GUARDADO AUTOMÁTICO (SIN BOTÓN)
// ============================================

function guardarAutomaticamente() {
    const results = window.lastTestResults;
    
    const data = {
        timestamp: new Date().toISOString(),
        id_empleado: currentUser.id,
        nombre: currentUser.name,
        lider: currentUser.lider,
        turno: currentUser.turno,
        nivel: currentLevel,
        tiempo_segundos: Math.round(results.time),
        ppm: results.ppm,
        precision: parseFloat(results.accuracy.toFixed(2)),
        errores: errors,
        puntaje: parseFloat(results.score.toFixed(2)),
        texto_palabras: currentText.split(' ').length,
        tiempo_primer_caracter: results.firstCharTime,
        pausas_largas: results.pausasLargas,
        velocidad_sostenida: results.velocidadSostenida,
        correcciones: results.correcciones
    };
    
    console.log('💾 Guardando automáticamente:', data);
    
    // Crear formulario oculto
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = GOOGLE_SCRIPT_URL;
    form.target = 'hidden_iframe';
    form.style.display = 'none';
    
    Object.keys(data).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = data[key];
        form.appendChild(input);
    });
    
    let iframe = document.getElementById('hidden_iframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.name = 'hidden_iframe';
        iframe.id = 'hidden_iframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }
    
    iframe.onload = function() {
        setTimeout(() => {
            ocultarLoading();
            displayResultsAfterSave(results.time, results.ppm, results.accuracy, results.score);
            mostrarAlerta('✅ Resultados guardados automáticamente!', 'success');
            
            if (document.body.contains(form)) {
                document.body.removeChild(form);
            }
        }, 2000);
    };
    
    document.body.appendChild(form);
    form.submit();
    
    console.log('📤 Datos enviados automáticamente');
}

function displayResultsAfterSave(time, ppm, accuracy, score) {
    const target = LEVEL_TARGETS[currentLevel];
    const quartile = calculateQuartile(score, currentLevel);
    const results = window.lastTestResults;
    
    const resultsDiv = document.getElementById('results');
    
    const metPPM = ppm >= target.ppm;
    const metAccuracy = accuracy >= target.accuracy;
    const metGoal = metPPM && metAccuracy;
    
    resultsDiv.innerHTML = `
        <div class="results-card ${metGoal ? 'success' : 'warning'}">
            <h2>🎯 Resultados del Test</h2>
            
            <div class="results-grid">
                <div class="result-item">
                    <span class="result-label">⏱️ Tiempo Total:</span>
                    <span class="result-value">${time.toFixed(1)}s</span>
                </div>
                
                <div class="result-item">
                    <span class="result-label">⚡ PPM:</span>
                    <span class="result-value ${metPPM ? 'success' : 'warning'}">${ppm}</span>
                    <span class="result-meta">(Meta: ${target.ppm}+)</span>
                </div>
                
                <div class="result-item">
                    <span class="result-label">🎯 Precisión:</span>
                    <span class="result-value ${metAccuracy ? 'success' : 'warning'}">${accuracy.toFixed(1)}%</span>
                    <span class="result-meta">(Meta: ${target.accuracy}%+)</span>
                </div>
                
                <div class="result-item">
                    <span class="result-label">❌ Errores:</span>
                    <span class="result-value">${errors}</span>
                </div>
                
                <div class="result-item">
                    <span class="result-label">📊 Puntaje:</span>
                    <span class="result-value">${score.toFixed(2)}</span>
                </div>
                
                <div class="result-item quartile-item">
                    <span class="result-label">🏆 Cuartil:</span>
                    <span class="quartile-badge ${quartile.class}">${quartile.label}</span>
                    <span class="quartile-description">${quartile.description}</span>
                </div>
            </div>
            
            <!-- MÉTRICAS AVANZADAS -->
            <div class="advanced-metrics">
                <h3>📈 Métricas Avanzadas</h3>
                <div class="metrics-grid">
                    <div class="metric-item">
                        <span class="metric-icon">⚡</span>
                        <span class="metric-label">Tiempo 1er Carácter:</span>
                        <span class="metric-value">${(results.firstCharTime / 1000).toFixed(2)}s</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-icon">⏸️</span>
                        <span class="metric-label">Pausas Largas:</span>
                        <span class="metric-value">${results.pausasLargas}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-icon">🚀</span>
                        <span class="metric-label">Velocidad Sostenida:</span>
                        <span class="metric-value">${results.velocidadSostenida} PPM</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-icon">⌫</span>
                        <span class="metric-label">Correcciones:</span>
                        <span class="metric-value">${results.correcciones}</span>
                    </div>
                </div>
            </div>
            
            <div class="result-message ${metGoal ? 'success' : 'warning'}">
                ${metGoal ? 
                    '🎉 ¡Felicitaciones! Has cumplido la meta del nivel.' : 
                    '💪 Sigue practicando para alcanzar la meta del nivel.'}
            </div>
            
            <div class="save-confirmation">
                <p>✅ Tus resultados han sido guardados automáticamente</p>
                <small>Los datos están disponibles en Google Sheets para análisis</small>
            </div>
        </div>
    `;
    
    resultsDiv.classList.add('show');
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================
// 🏆 CÁLCULO DE CUARTILES
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
            description: '¡Excelente! Estas en el top 25%' 
        };
    }
    if (score >= range.q2) {
        return { 
            label: 'Q2 - Competente', 
            class: 'q2', 
            description: 'Buen trabajo! Sigue asi.' 
        };
    }
    if (score >= range.q3) {
        return { 
            label: 'Q3 - En Desarrollo', 
            class: 'q3', 
            description: 'Sigue practicando para mejorar.' 
        };
    }
    return { 
        label: 'Q4 - Necesita Mejora', 
        class: 'q4', 
        description: 'Practica mas para alcanzar la meta.' 
    };
}

// ============================================
// 🎨 FUNCIONES DE UI
// ============================================

function mostrarLoading(mensaje = 'Cargando...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = overlay.querySelector('p');
    text.textContent = mensaje;
    overlay.classList.add('show');
}

function ocultarLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.remove('show');
}

function mostrarAlerta(mensaje, tipo = 'info') {
    const alerta = document.createElement('div');
    alerta.className = `alerta alerta-${tipo}`;
    
    const iconos = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    alerta.innerHTML = `
        <span class="alerta-icon">${iconos[tipo]}</span>
        <span class="alerta-text">${mensaje}</span>
    `;
    
    document.body.appendChild(alerta);
    
    setTimeout(() => alerta.classList.add('show'), 10);
    
    setTimeout(() => {
        alerta.classList.remove('show');
        setTimeout(() => alerta.remove(), 300);
    }, 4000);
}

// ============================================
// 🚀 INICIALIZACIÓN
// ============================================

window.onload = function() {
    console.log('✅ Sistema de Mecanografia iniciado - Versión 4.0');
    console.log('🔗 Google Script URL:', GOOGLE_SCRIPT_URL);
    console.log('📋 Niveles disponibles:', Object.keys(LEVEL_TEXTS).length);
    console.log('📊 Métricas avanzadas: ACTIVADAS');
    
    const userIdInput = document.getElementById('userId');
    if (userIdInput) {
        userIdInput.focus();
        
        userIdInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12') {
            e.preventDefault();
            mostrarAlerta('⚠️ Las herramientas de desarrollo estan deshabilitadas.', 'warning');
        }
    });
    
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        mostrarAlerta('⚠️ El menu contextual esta deshabilitado.', 'warning');
    });
};

console.log('📦 app.js cargado - Versión 4.0 (Métricas Avanzadas + Guardado Automático)');
