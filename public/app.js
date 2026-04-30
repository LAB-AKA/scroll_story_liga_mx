const canvas = document.getElementById('video-canvas');
const context = canvas.getContext('2d');

// Configuraciones
const frameCount = 329; // TOTAL DE IMÁGENES (Ajusta este número tras extraerlas)
const images = [];
const imagePath = (index) => `./imagenes_scroll/frame_${(index + 1).toString().padStart(4, '0')}.jpg`; // Ruta de las imágenes mejoradas con Real-ESRGAN Anime

// Pre-cargar imágenes de forma asíncrona para no bloquear el hilo principal
const preloadImages = () => {
    // Primero cargar las imágenes iniciales (los primeros 30 frames) para mostrar algo rápido
    const initialLoadCount = Math.min(30, frameCount);
    
    for (let i = 0; i < initialLoadCount; i++) {
        const img = new Image();
        img.src = imagePath(i);
        images.push(img);
    }
    
    // Cargar el resto de las imágenes en segundo plano después de que la página ya es interactiva
    if (frameCount > initialLoadCount) {
        setTimeout(() => {
            let i = initialLoadCount;
            const loadNextBatch = () => {
                const batchSize = 10;
                const end = Math.min(i + batchSize, frameCount);
                
                for (; i < end; i++) {
                    const img = new Image();
                    img.src = imagePath(i);
                    images.push(img);
                }
                
                if (i < frameCount) {
                    // Usar requestIdleCallback si está disponible, o un setTimeout pequeño
                    if ('requestIdleCallback' in window) {
                        requestIdleCallback(loadNextBatch);
                    } else {
                        setTimeout(loadNextBatch, 50);
                    }
                }
            };
            
            loadNextBatch();
        }, 500); // Esperar medio segundo antes de empezar a cargar el resto
    }
};

// Ajustar tamaño del canvas al tamaño de la ventana
const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    renderIndex(Math.floor(currentFrameIndex));
};

window.addEventListener('resize', resizeCanvas);

// Variable para rastrear qué frame mostrar
let currentFrameIndex = 0;

// Dibujar la imagen en el canvas (con object-fit cover effect)
const renderIndex = (index) => {
    if (!images[index] || !images[index].complete) return;
    
    const img = images[index];
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.width / img.height;
    
    let drawWidth, drawHeight, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgRatio;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
    } else {
        drawWidth = canvas.height * imgRatio;
        drawHeight = canvas.height;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
};

// Lógica de Scroll
window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop;
    const maxScrollTop = document.documentElement.scrollHeight - window.innerHeight;
    const scrollFraction = scrollTop / maxScrollTop;
    
    // Ocultar el hint de scroll al empezar a bajar
    const scrollHint = document.getElementById('scroll-hint');
    if (scrollHint) {
        if (scrollTop > 50) {
            scrollHint.classList.add('hidden');
        } else {
            scrollHint.classList.remove('hidden');
        }
    }
    
    // Calcular qué imagen corresponde al scroll actual
    const frameIndex = Math.min(
        frameCount - 1,
        Math.floor(scrollFraction * frameCount)
    );
    
    currentFrameIndex = frameIndex;
    
    // Usar requestAnimationFrame para un pintado más fluido
    requestAnimationFrame(() => renderIndex(frameIndex));

    // Lógica para animar los textos
    animarTextos();
});

// Animar entrada de textos
const steps = document.querySelectorAll('.step');
const animarTextos = () => {
    steps.forEach(step => {
        const rect = step.getBoundingClientRect();
        // Si el centro de la sección está visible en pantalla
        if (rect.top < window.innerHeight * 0.75 && rect.bottom > window.innerHeight * 0.25) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
};

// Iniciar
preloadImages();
resizeCanvas();

// Dibujar primera imagen en cuanto cargue
if(images.length > 0) {
    images[0].onload = () => {
        resizeCanvas();
        animarTextos();
    };
}

// ==========================================
// STORYTELLING CHARTS LOGIC
// ==========================================

function createPodium(containerId, data, valueKey, formatValue = (v) => v, titleText = "EL MEJOR", ascending = false, podiumType = "positive") {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Ordenar los datos (ascending = true significa que menos es mejor, ej: tarjetas rojas)
    const sortedData = [...data].sort((a, b) => {
        const valA = typeof valueKey === 'function' ? valueKey(a) : a[valueKey];
        const valB = typeof valueKey === 'function' ? valueKey(b) : b[valueKey];
        return ascending ? valA - valB : valB - valA;
    });

    const top3 = sortedData.slice(0, 3);
    
    // El orden visual del podio es: Plata (Izquierda), Oro (Centro), Bronce (Derecha)
    // Así que reordenamos el array visualmente: [1, 0, 2] (índices del top3)
    const visualOrder = [top3[1], top3[0], top3[2]];
    const visualClasses = ['place-2', 'place-1', 'place-3'];
    const visualLabels = ['2', '1', '3'];

    const valueColor = podiumType === 'negative' ? 'var(--negative-color)' : 'var(--positive-color)';

    let html = '';
    visualOrder.forEach((team, index) => {
        if (!team) return; // Por si hay menos de 3 equipos
        
        const val = typeof valueKey === 'function' ? valueKey(team) : team[valueKey];
        const isFirst = index === 1; // El índice 1 en visualOrder es el Oro (top3[0])
        
        html += `
            <div class="podium-place ${visualClasses[index]}">
                <div class="podium-team-info">
                    ${isFirst ? `<div class="podium-title">${titleText}</div>` : ''}
                    <img src="${getLogoUrl(team.Equipo)}" alt="${team.Equipo}" class="podium-logo" onerror="this.src='https://via.placeholder.com/50'">
                    <div class="podium-value" style="background-color: ${valueColor};">${formatValue(val)}</div>
                </div>
                <div class="podium-base">${visualLabels[index]}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderStoryCharts() {
    // ----------------------------------------------------
    // 1. Hook / Introducción: Puntos Generados
    // ----------------------------------------------------
    // Añadir propiedad 'Puntos' a chartsData temporalmente para el podio
    const chartsDataWithPoints = chartsData.map(d => ({
        ...d,
        Puntos: tablaData.find(t => t.Equipo === d.Equipo)?.Puntos || 0
    }));
    
    createPodium('podium-1', chartsDataWithPoints, 'Puntos', v => `${v} pts`, "MÁS PUNTOS", false, 'positive');

    // ----------------------------------------------------
    // 2. Goles Local vs Visitante
    // ----------------------------------------------------
    createPodium('podium-2', chartsData, (d) => d['Goles Local'] + d['Goles Visitante'], v => `${v} goles`, "MÁS GOLEADOR", false, 'positive');

    // ----------------------------------------------------
    // 3. Posesión del Balón
    // ----------------------------------------------------
    createPodium('podium-3', chartsData, 'Posesion Promedio', v => `${v}%`, "MAYOR POSESIÓN", false, 'positive');

    // ----------------------------------------------------
    // 4. Tiros de Esquina (A Favor vs En Contra)
    // ----------------------------------------------------
    createPodium('podium-4', chartsData, 'Corners A Favor', v => `${v}`, "MÁS CÓRNERS", false, 'positive');

    // ----------------------------------------------------
    // 5. Tarjetas (Rojas y Amarillas vs Rival)
    // ----------------------------------------------------
    // Para el podio de indisciplina, sumamos amarillas y rojas (las rojas valen más)
    createPodium('podium-5', chartsData, (d) => d['Amarillas Cometidas'] + (d['Rojas Cometidas'] * 3), (v) => `Pts Castigo`, "MÁS INDISCIPLINADO", false, 'negative');

    // ----------------------------------------------------
    // 6. Penales
    // ----------------------------------------------------
    createPodium('podium-6', chartsData, 'Penales A Favor', v => `${v}`, "MÁS PENALES", false, 'positive');
}

// ==========================================
// DASHBOARD LOGIC (Light Theme)
// ==========================================

// Finals Matchups
const matchups = [
    { home: "Pumas UNAM", away: "América" },
    { home: "Guadalajara", away: "Tigres UANL" },
    { home: "Cruz Azul", away: "Atlas" },
    { home: "Pachuca", away: "Toluca" }
];

// Helper to get logo path
const getLogoUrl = (team) => `logos/${team}.webp`;

const logosCache = {};

// Helper to get result class
const getResultClass = (result) => {
    if (result === 'G') return 'circle-W';
    if (result === 'E') return 'circle-D';
    if (result === 'P') return 'circle-L';
    return '';
};

// Initialize Dashboard
document.addEventListener("DOMContentLoaded", () => {
    // Preload logos for charts
    chartsData.forEach(d => {
        const img = new Image();
        img.src = getLogoUrl(d.Equipo);
        logosCache[d.Equipo] = img;
    });

    renderStoryCharts(); // Inicializar las gráficas de la historia
    renderBracket();
    renderTable();
    renderCharts();
    renderTelemetry();
});

function renderTelemetry() {
    const grid = document.getElementById("telemetry-grid");
    
    // Sort to find interesting data points
    const maxPossession = [...chartsData].sort((a, b) => b['Posesion Promedio'] - a['Posesion Promedio'])[0];
    const maxSaves = [...chartsData].sort((a, b) => b['Atajadas'] - a['Atajadas'])[0];
    const maxOffensiveCorners = [...chartsData].sort((a, b) => b['Corners A Favor'] - a['Corners A Favor'])[0];
    const mostFouled = [...chartsData].sort((a, b) => b['Faltas Recibidas'] - a['Faltas Recibidas'])[0];
    const mostRedCards = [...chartsData].sort((a, b) => b['Rojas Cometidas'] - a['Rojas Cometidas'])[0];

    const telemetryInsights = [
        { label: "DUEÑOS DEL BALÓN", text: `<strong>${maxPossession.Equipo}</strong> es el equipo que más tiempo controla el juego, promediando un impresionante <strong>${maxPossession['Posesion Promedio']}%</strong> de posesión.` },
        { label: "MURALLA EN LA PORTERÍA", text: `La defensa es clave, y <strong>${maxSaves.Equipo}</strong> destaca bajo los tres palos con <strong>${maxSaves['Atajadas']} atajadas</strong> en los últimos 5 encuentros.` },
        { label: "PELIGRO CONSTANTE", text: `La presión asfixiante de <strong>${maxOffensiveCorners.Equipo}</strong> se refleja en sus <strong>${maxOffensiveCorners['Corners A Favor']} tiros de esquina</strong> generados, hundiendo al rival en su área.` },
        { label: "EL EQUIPO A CAZAR", text: `Los jugadores de <strong>${mostFouled.Equipo}</strong> son una pesadilla para las defensas rivales, habiendo recibido <strong>${mostFouled['Faltas Recibidas']} faltas</strong> en esta ventana.` },
        { label: "AL LÍMITE DEL REGLAMENTO", text: `<strong>${mostRedCards.Equipo}</strong> juega con demasiada intensidad, siendo el equipo más castigado con <strong>${mostRedCards['Rojas Cometidas']} tarjetas rojas</strong>, un factor que podría costarles caro en la Liguilla.` }
    ];

    telemetryInsights.forEach(insight => {
        const div = document.createElement("div");
        div.className = "telemetry-card";
        div.innerHTML = `
            <div class="tel-label">${insight.label}</div>
            <div class="tel-value">${insight.text}</div>
        `;
        grid.appendChild(div);
    });
}

function renderBracket() {
    const container = document.getElementById("bracket-container");
    container.innerHTML = "";

    matchups.forEach(match => {
        const homeData = resultadosData.find(r => r.Equipo.includes(match.home) || match.home.includes(r.Equipo));
        const awayData = resultadosData.find(r => r.Equipo.includes(match.away) || match.away.includes(r.Equipo));

        const createTeamBlock = (teamName, teamData) => {
            if (!teamData) return `<div class="team-block"><p>${teamName}</p></div>`;

            // Form Circles
            let circlesHTML = '';
            for (let i = 1; i <= 5; i++) {
                const res = teamData[`P${i}`];
                const loc = teamData[`Loc${i}`];
                circlesHTML += `<div class="form-circle ${getResultClass(res)}" title="${res === 'G' ? 'Ganó' : res === 'E' ? 'Empató' : 'Perdió'}">${loc}</div>`;
            }

            return `
                <div class="team-block">
                    <div class="team-form">${circlesHTML}</div>
                    <img src="${getLogoUrl(teamName)}" alt="${teamName}" class="team-logo" onerror="this.src='https://via.placeholder.com/60?text=${teamName}'">
                    <span class="team-name">${teamName}</span>
                </div>
            `;
        };

        const matchupCard = document.createElement("div");
        matchupCard.className = "matchup-card";
        matchupCard.innerHTML = `
            ${createTeamBlock(match.home, homeData)}
            <div class="matchup-vs">VS</div>
            ${createTeamBlock(match.away, awayData)}
        `;

        container.appendChild(matchupCard);
    });
}

function renderTable() {
    const tbody = document.getElementById("table-body");
    tbody.innerHTML = "";

    // Sort table by Puntos, then Diferencia_Goles
    const sortedData = [...tablaData].sort((a, b) => {
        if (b.Puntos !== a.Puntos) return b.Puntos - a.Puntos;
        return b.Diferencia_Goles - a.Diferencia_Goles;
    });

    sortedData.forEach((row, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div class="table-team-cell">
                    <img src="${getLogoUrl(row.Equipo)}" class="table-logo" onerror="this.src='https://via.placeholder.com/24'">
                    <span>${row.Equipo}</span>
                </div>
            </td>
            <td style="font-weight: 700; color: #111;">${row.Puntos}</td>
            <td>${row.JG}</td>
            <td>${row.JE}</td>
            <td>${row.JP}</td>
            <td>${row.GF || row['Goles Total']}</td>
            <td>${row.GC || row['Goles En Contra']}</td>
            <td>${row.Diferencia_Goles}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderCharts() {
    Chart.defaults.color = '#555555';
    Chart.defaults.font.family = "'Chakra Petch', sans-serif";

    // Plugin para dibujar logos en lugar de texto en los ejes
    const drawLogosPlugin = {
        id: 'drawLogos',
        afterDraw(chart) {
            const { ctx, chartArea: { bottom, left }, scales: { x, y } } = chart;
            const isHorizontal = chart.config.options.indexAxis === 'y';
            
            chart.data.labels.forEach((teamName, index) => {
                const img = logosCache[teamName];
                if (!img || !img.complete) return;
                
                const size = 24;
                if (isHorizontal) {
                    const yPos = y.getPixelForTick(index);
                    const xPos = left - size - 5;
                    ctx.drawImage(img, xPos, yPos - size / 2, size, size);
                } else {
                    const xPos = x.getPixelForTick(index);
                    const yPos = bottom + 5;
                    ctx.drawImage(img, xPos - size / 2, yPos, size, size);
                }
            });
        }
    };

    // Función para crear patrón diagonal
    const createDiagonalPattern = (color) => {
        const canvas = document.createElement('canvas');
        canvas.width = 8;
        canvas.height = 8;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(255,255,255,0)';
        ctx.fillRect(0, 0, 8, 8);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.lineTo(8, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-4, 4);
        ctx.lineTo(4, -4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(4, 12);
        ctx.lineTo(12, 4);
        ctx.stroke();
        
        return ctx.createPattern(canvas, 'repeat');
    };

    // Helper for sorting data
    const getSortedData = (keyFunction) => {
        return [...chartsData].sort((a, b) => keyFunction(b) - keyFunction(a));
    };

    // Light Theme Palette
    const cGreen = '#00C853';  
    const cRed = '#D32F2F';    
    const cGrey = '#9E9E9E';   
    const cText = '#111111';
    const cYellow = '#FFD600'; 
    const cGrid = '#E0E0E0';

    // Helper for common options
    const getOptions = (title, isStacked = false) => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1500, easing: 'easeOutQuart' },
        layout: {
            padding: { left: 10, bottom: 25 } // Espacio para los logos
        },
        plugins: {
            title: { 
                display: true, 
                text: title, 
                color: cText, 
                font: { family: "'Unbounded', sans-serif", size: 12, weight: 600 },
                align: 'start',
                padding: { bottom: 20 }
            },
            legend: { position: 'bottom', labels: { color: '#555555', boxWidth: 12 } }
        },
        scales: {
            y: { 
                stacked: isStacked, 
                grid: { color: cGrid }, 
                border: { dash: [4, 4] },
                ticks: { color: 'transparent' } // Ocultar texto
            },
            x: { 
                stacked: isStacked, 
                grid: { color: cGrid },
                ticks: { color: 'transparent' } // Ocultar texto
            }
        }
    });

    // 1. Posesión
    const sortedPossession = getSortedData(d => d['Posesion Promedio']);
    new Chart(document.getElementById('chart-possession'), {
        type: 'line',
        data: {
            labels: sortedPossession.map(d => d.Equipo),
            datasets: [{
                label: 'Posesión Promedio (%)',
                data: sortedPossession.map(d => d['Posesion Promedio']),
                borderColor: cGreen,
                backgroundColor: 'rgba(0, 200, 83, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: cGreen,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            ...getOptions('// POSESIÓN DEL BALÓN (%)'),
            scales: {
                ...getOptions('').scales,
                y: { ...getOptions('').scales.y, ticks: { color: '#555555' } } // Mostrar texto en Y
            }
        },
        plugins: [drawLogosPlugin]
    });

    // 2. Goles
    const sortedGoals = getSortedData(d => d['Goles Local'] + d['Goles Visitante']);
    new Chart(document.getElementById('chart-goals'), {
        type: 'bar',
        data: {
            labels: sortedGoals.map(d => d.Equipo),
            datasets: [
                { label: 'Goles de Local', data: sortedGoals.map(d => d['Goles Local']), backgroundColor: cGreen },
                { label: 'Goles de Visitante', data: sortedGoals.map(d => d['Goles Visitante']), backgroundColor: cGrey }
            ]
        },
        options: {
            ...getOptions('// GOLES (LOCAL VS VISITANTE)', true),
            scales: {
                ...getOptions('', true).scales,
                y: { ...getOptions('', true).scales.y, ticks: { color: '#555555' } } // Mostrar texto en Y
            }
        },
        plugins: [drawLogosPlugin]
    });

    // 3. Penales
    const sortedPenalties = getSortedData(d => d['Penales A Favor']);
    new Chart(document.getElementById('chart-penalties'), {
        type: 'bar',
        data: {
            labels: sortedPenalties.map(d => d.Equipo),
            datasets: [
                { label: 'Penales a Nuestro Favor', data: sortedPenalties.map(d => d['Penales A Favor']), backgroundColor: cGreen },
                { label: 'Penales en Contra', data: sortedPenalties.map(d => d['Penales En Contra']), backgroundColor: cRed }
            ]
        },
        options: {
            ...getOptions('// PENALES (A FAVOR VS EN CONTRA)'),
            scales: {
                ...getOptions('').scales,
                y: { ...getOptions('').scales.y, ticks: { color: '#555555' } } // Mostrar texto en Y
            }
        },
        plugins: [drawLogosPlugin]
    });

    // 4. Corners
    const sortedCorners = getSortedData(d => d['Corners A Favor']);
    new Chart(document.getElementById('chart-corners'), {
        type: 'bar',
        data: {
            labels: sortedCorners.map(d => d.Equipo),
            datasets: [
                { label: 'Corners a Nuestro Favor', data: sortedCorners.map(d => d['Corners A Favor']), backgroundColor: cGreen },
                { label: 'Corners en Nuestra Contra', data: sortedCorners.map(d => d['Corners En Contra']), backgroundColor: cRed }
            ]
        },
        options: { 
            ...getOptions('// TIROS DE ESQUINA'), 
            indexAxis: 'y',
            layout: { padding: { left: 25, bottom: 10 } }, // Ajuste para horizontal
            scales: {
                ...getOptions('').scales,
                x: { ...getOptions('').scales.x, ticks: { color: '#555555' } } // Mostrar texto en X
            }
        },
        plugins: [drawLogosPlugin]
    });

    // 5. Atajadas
    const sortedSaves = getSortedData(d => d['Atajadas']);
    new Chart(document.getElementById('chart-saves'), {
        type: 'bar',
        data: {
            labels: sortedSaves.map(d => d.Equipo),
            datasets: [
                { label: 'Atajadas de Nuestro Portero', data: sortedSaves.map(d => d['Atajadas']), backgroundColor: cGreen },
                { label: 'Atajadas del Portero Rival', data: sortedSaves.map(d => d['Atajadas En Contra']), backgroundColor: cRed }
            ]
        },
        options: {
            ...getOptions('// ATAJADAS (NUESTRAS VS RIVAL)'),
            scales: {
                ...getOptions('').scales,
                y: { ...getOptions('').scales.y, ticks: { color: '#555555' } } // Mostrar texto en Y
            }
        },
        plugins: [drawLogosPlugin]
    });

    // 6. Faltas (No ordenamos porque es scatter/bubble)
    const teamColors = [
        '#C2A649', '#FCE116', '#ED1C24', '#FDB913', 
        '#002D62', '#000000', '#004A8B', '#E60000'
    ];

    const foulDatasets = chartsData.map((d, i) => {
        const img = new Image();
        img.src = getLogoUrl(d.Equipo);
        const size = (12 + (d['Rojas Cometidas'] * 5)) * 2;
        img.width = size; img.height = size;
        
        return {
            label: d.Equipo,
            data: [{ x: d['Faltas Cometidas'], y: d['Faltas Recibidas'], r: 12 + (d['Rojas Cometidas'] * 5) }],
            backgroundColor: teamColors[i % teamColors.length],
            borderColor: '#FFFFFF',
            borderWidth: 2,
            pointStyle: img
        };
    });

    new Chart(document.getElementById('chart-fouls'), {
        type: 'bubble',
        data: { datasets: foulDatasets },
        options: {
            ...getOptions('// MATRIZ DE FRICCIÓN (FALTAS VS ROJAS)'),
            plugins: {
                ...getOptions('').plugins,
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const d = context.raw;
                            return `${context.dataset.label}: Cometidas(${d.x}), Sufridas(${d.y})`;
                        }
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Faltas que Cometimos', color: '#555555' }, grid: { color: cGrid }, ticks: { color: '#555555' } },
                y: { title: { display: true, text: 'Faltas que Sufrimos', color: '#555555' }, grid: { color: cGrid }, ticks: { color: '#555555' } }
            }
        }
    });

    // 7. Tarjetas
    const sortedCards = getSortedData(d => d['Amarillas Cometidas'] + (d['Rojas Cometidas'] * 3));
    new Chart(document.getElementById('chart-cards'), {
        type: 'bar',
        data: {
            labels: sortedCards.map(d => d.Equipo),
            datasets: [
                { label: 'Nuestras Amarillas', data: sortedCards.map(d => d['Amarillas Cometidas']), backgroundColor: cYellow, stack: 'Nuestras' },
                { label: 'Nuestras Rojas', data: sortedCards.map(d => d['Rojas Cometidas']), backgroundColor: cRed, stack: 'Nuestras' },
                { label: 'Amarillas del Rival', data: sortedCards.map(d => d['Amarillas Recibidas']), backgroundColor: createDiagonalPattern('#FBC02D'), stack: 'Rival' },
                { label: 'Rojas del Rival', data: sortedCards.map(d => d['Rojas Recibidas']), backgroundColor: createDiagonalPattern('#D32F2F'), stack: 'Rival' }
            ]
        },
        options: {
            ...getOptions('// TARJETAS (NUESTRAS VS RIVAL)', true),
            scales: {
                ...getOptions('', true).scales,
                y: { ...getOptions('', true).scales.y, ticks: { color: '#555555' } } // Mostrar texto en Y
            }
        },
        plugins: [drawLogosPlugin]
    });

    // 8. Offsides
    const sortedOffsides = getSortedData(d => d['Offsides Recibidos']);
    new Chart(document.getElementById('chart-offsides'), {
        type: 'bar',
        data: {
            labels: sortedOffsides.map(d => d.Equipo),
            datasets: [
                {
                    label: 'Offsides que Provocamos',
                    data: sortedOffsides.map(d => d['Offsides Recibidos']),
                    backgroundColor: cGreen
                },
                {
                    label: 'Offsides en que Caímos',
                    data: sortedOffsides.map(d => d['Offsides Cometidos']),
                    backgroundColor: cRed
                }
            ]
        },
        options: {
            ...getOptions('// TRAMPA DEL FUERA DE LUGAR (PROVOCADOS VS COMETIDOS)'),
            indexAxis: 'y', // Barras horizontales para lectura rápida
            layout: { padding: { left: 25, bottom: 10 } }, // Ajuste para horizontal
            plugins: {
                ...getOptions('').plugins,
                legend: { display: true, position: 'bottom' } 
            },
            scales: {
                ...getOptions('').scales,
                x: { ...getOptions('').scales.x, ticks: { color: '#555555' } } // Mostrar texto en X
            }
        },
        plugins: [drawLogosPlugin]
    });
}
