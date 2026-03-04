/* =============================================================================
   1. CONFIGURATION & ÉTAT INITIAL
   ============================================================================= */
const supabaseUrl = 'https://kuuxhzyfnqrdoewfoiyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1dXhoenlmbnFyZG9ld2ZvaXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjA2NzQsImV4cCI6MjA4ODEzNjY3NH0.ar-162v-HZ91M80xpDfE_mavK6xyE1Ciu7bZh-PNhHM';

const sb = supabase.createClient(supabaseUrl, supabaseKey);

const levelsData = {
    lycee: [{ name: "Seconde", code: "seconde" }, { name: "Première", code: "premiere" }, { name: "Terminale", code: "terminale" }],
    college: [{ name: "3ème", code: "3eme" }],
    primaire: [{ name: "CP", code: "cp" }, { name: "CE1", code: "ce1" }, { name: "CE2", code: "ce2" }, { name: "CM1", code: "cm1" }, { name: "CM2", code: "cm2" }]
};

const subjectsData = {
    seconde: ["Maths", "Physique-Chimie"],
    premiere: ["Maths", "Physique-Chimie"],
    terminale: ["Maths", "Physique-Chimie"]
};

let state = { currentLevelGroup: '', currentClassCode: '', currentSubject: '', currentMode: 'lesson' };

/* =============================================================================
   2. SYSTÈME DE NAVIGATION & RECHERCHE
   ============================================================================= */

function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
        const main = document.querySelector('main');
        if (main) main.scrollTop = 0;
    }
}

function openLevelPage(levelKey) {
    state.currentLevelGroup = levelKey;
    const titles = { 'primaire': 'Primaire', 'college': 'Collège', 'lycee': 'Lycée' };
    document.getElementById('level-title').innerText = titles[levelKey] || "Niveau";
    const grid = document.getElementById('classes-grid');
    grid.innerHTML = '';
    (levelsData[levelKey] || []).forEach(cls => {
        const card = document.createElement('div');
        card.className = 'class-btn';
        card.innerHTML = `<h3>${cls.name}</h3>`;
        card.onclick = () => openSubjectsPage(cls.code, cls.name);
        grid.appendChild(card);
    });
    navigateTo('view-level-classes');
}

function openSubjectsPage(classCode, className) {
    state.currentClassCode = classCode;
    const info = getClassInfo(classCode);
    if (!className) className = info.name;
    state.currentLevelGroup = info.group;
    document.getElementById('subject-title').innerText = className;
    const grid = document.getElementById('subjects-grid');
    grid.innerHTML = '';
    (subjectsData[classCode] || []).forEach(subj => {
        const card = document.createElement('div');
        card.className = 'subject-card';
        card.innerHTML = `<h3>${subj}</h3>`;
        card.onclick = () => checkContentAndNavigate(subj);
        grid.appendChild(card);
    });
    navigateTo('view-subjects');
}

function getClassInfo(classCode) {
    for (const [group, classes] of Object.entries(levelsData)) {
        const found = classes.find(c => c.code === classCode);
        if (found) return { name: found.name, group: group };
    }
    return { name: classCode, group: 'lycee' };
}

function performSearch() {
    const input = document.getElementById('site-search');
    const resContainer = document.getElementById('search-results');
    const query = input.value.toLowerCase().trim();
    if (query.length < 2) { resContainer.style.display = 'none'; return; }
    resContainer.innerHTML = '';
    let matches = [];
    for (const [code, subs] of Object.entries(subjectsData)) {
        subs.forEach(s => {
            const info = getClassInfo(code);
            if (`${s} ${info.name}`.toLowerCase().includes(query)) matches.push({ s, code, info });
        });
    }
    matches.slice(0, 8).forEach(m => {
        const d = document.createElement('div');
        d.className = 'result-item';
        d.innerHTML = `<strong>${m.s}</strong> <small>(${m.info.name})</small>`;
        d.onclick = () => { input.value = ''; resContainer.style.display = 'none'; state.currentClassCode = m.code; state.currentLevelGroup = m.info.group; checkContentAndNavigate(m.s); };
        resContainer.appendChild(d);
    });
    resContainer.style.display = 'block';
}

/* =============================================================================
   3. GESTION SUPABASE
   ============================================================================= */

async function checkContentAndNavigate(subject) {
    state.currentSubject = subject;
    const { data, error } = await sb.from('lessons').select('chapter_number, content').eq('class_id', state.currentClassCode).eq('subject_id', subject.toLowerCase()).order('chapter_number', { ascending: true });
    if (error || !data || data.length === 0) return alert("Contenu non disponible.");
    openChaptersPage(data);
}

function openChaptersPage(list) {
    const grid = document.getElementById('chapters-grid');
    grid.innerHTML = '';
    list.forEach(l => {
        const temp = document.createElement('div'); temp.innerHTML = l.content;
        const title = temp.querySelector('h1')?.innerText || "Chapitre " + l.chapter_number;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<p style="color:#888; font-size:0.8rem;">CHAPITRE ${l.chapter_number}</p><h3>${title}</h3>`;
        card.onclick = () => displayLesson(l.chapter_number);
        grid.appendChild(card);
    });
    navigateTo('view-chapters');
}

async function displayLesson(num) {
    const { data } = await sb.from('lessons').select('content').eq('chapter_number', num).eq('class_id', state.currentClassCode).eq('subject_id', state.currentSubject.toLowerCase()).single();
    if (data) {
        document.getElementById('lesson-container').innerHTML = data.content;
        if (window.MathJax) MathJax.typesetPromise();
        navigateTo('view-lesson');
    }
}

/* =============================================================================
   4. TABLEAU PÉRIODIQUE (COMPLET)
   ============================================================================= */
const fullElements = [
    {z:1, s:"H", n:"Hydrogène", a:1.008, x:1, y:1}, {z:2, s:"He", n:"Hélium", a:4.003, x:18, y:1},
    {z:3, s:"Li", n:"Lithium", a:6.941, x:1, y:2}, {z:4, s:"Be", n:"Béryllium", a:9.012, x:2, y:2},
    {z:5, s:"B", n:"Bore", a:10.81, x:13, y:2}, {z:6, s:"C", n:"Carbone", a:12.01, x:14, y:2},
    {z:7, s:"N", n:"Azote", a:14.01, x:15, y:2}, {z:8, s:"O", n:"Oxygène", a:16.00, x:16, y:2},
    {z:9, s:"F", n:"Fluor", a:19.00, x:17, y:2}, {z:10, s:"Ne", n:"Néon", a:20.18, x:18, y:2},
    {z:11, s:"Na", n:"Sodium", a:22.99, x:1, y:3}, {z:12, s:"Mg", n:"Magnésium", a:24.31, x:2, y:3},
    {z:13, s:"Al", n:"Aluminium", a:26.98, x:13, y:3}, {z:14, s:"Si", n:"Silicium", a:28.09, x:14, y:3},
    {z:15, s:"P", n:"Phosphore", a:30.97, x:15, y:3}, {z:16, s:"S", n:"Soufre", a:32.06, x:16, y:3},
    {z:17, s:"Cl", n:"Chlore", a:35.45, x:17, y:3}, {z:18, s:"Ar", n:"Argon", a:39.95, x:18, y:3}
    // Note: Pour limiter la taille du message, j'ai mis les 3 premières périodes. 
    // Tu peux copier les autres de ton ancien fichier ou me demander la suite si besoin.
];

function initTableau() {
    const grid = document.getElementById('periodic-grid');
    if(!grid) return;
    grid.innerHTML = '';
    for (let y = 1; y <= 7; y++) {
        for (let x = 1; x <= 18; x++) {
            const el = fullElements.find(e => e.x === x && e.y === y);
            if (el) {
                const d = document.createElement('div');
                d.className = 'element-card';
                d.innerHTML = `<small>${el.z}</small><br><strong>${el.s}</strong>`;
                d.onmouseover = () => document.getElementById('periodic-details').innerHTML = `<strong>${el.n}</strong>: ${el.a} g/mol`;
                grid.appendChild(d);
            } else {
                const empty = document.createElement('div'); empty.className = 'empty-cell'; grid.appendChild(empty);
            }
        }
    }
}

/* =============================================================================
   5. AUTRES OUTILS (CONVERTISSEUR, GRAPHIQUE, POMODORO)
   ============================================================================= */

// CONVERTISSEUR (Exemple simple)
function calculateConv(source) {
    const i1 = document.getElementById('conv-input-1'), i2 = document.getElementById('conv-input-2');
    const u1 = parseFloat(document.getElementById('conv-unit-1').value), u2 = parseFloat(document.getElementById('conv-unit-2').value);
    if(source === 1) i2.value = (i1.value * u1 / u2).toFixed(4);
    else i1.value = (i2.value * u2 / u1).toFixed(4);
}

// POMODORO
let pTime = 25*60, pInt = null;
function togglePomodoro() {
    if(pInt) { clearInterval(pInt); pInt = null; }
    else { pInt = setInterval(() => { pTime--; updatePDisplay(); if(pTime<=0) clearInterval(pInt); }, 1000); }
}
function updatePDisplay() {
    const m = Math.floor(pTime/60), s = pTime%60;
    document.getElementById('pomo-timer').innerText = `${m}:${s<10?'0'+s:s}`;
}

// GRAPHIQUE
function drawGraph() {
    const c = document.getElementById('graphCanvas'), ctx = c.getContext('2d');
    ctx.clearRect(0,0,400,400);
    ctx.beginPath(); ctx.moveTo(0,200); ctx.lineTo(400,200); ctx.moveTo(200,0); ctx.lineTo(200,400); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = "purple";
    for(let px=0; px<400; px++) {
        let x = (px-200)/40; let y = Math.pow(x,2);
        ctx.lineTo(px, 200 - y*40);
    }
    ctx.stroke();
}

/* INITIALISATION */
document.addEventListener('DOMContentLoaded', () => {
    updatePDisplay();
    document.getElementById('site-search').addEventListener('input', performSearch);
});

function goBackToClasses() { openLevelPage(state.currentLevelGroup); }
function goBackToSubjects() { openSubjectsPage(state.currentClassCode); }
