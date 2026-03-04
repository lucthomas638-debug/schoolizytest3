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
   CALCUL MASSE MOLAIRE
   ============================================================================= */
let currentMolString = ""; 

function addMolChar(char) {
    const display = document.getElementById('mol-display');
    currentMolString += char;
    display.innerText = currentMolString;
}

function deleteMolChar() {
    currentMolString = "";
    document.getElementById('mol-display').innerText = "";
    document.getElementById('mol-result-box').style.display = 'none';
}

function calculateComplexMass() {
    const atomMasses = { H:1.008, C:12.01, O:16.00, N:14.01, Na:22.99, Cl:35.45, S:32.06, Fe:55.85, Cu:63.55, Ca:40.08 };
    let formula = currentMolString;
    const regex = /([A-Z][a-z]?)(\d*)|(\()|(\))(\d*)/g;
    let stack = [{}];
    let match;

    while ((match = regex.exec(formula)) !== null) {
        if (match[3]) stack.push({});
        else if (match[4]) {
            let mult = parseInt(match[5] || 1);
            let top = stack.pop();
            let parent = stack[stack.length - 1];
            for (let a in top) parent[a] = (parent[a] || 0) + top[a] * mult;
        } else if (match[1]) {
            let parent = stack[stack.length - 1];
            parent[match[1]] = (parent[match[1]] || 0) + parseInt(match[2] || 1);
        }
    }

    let total = 0;
    let res = stack[0];
    for (let a in res) {
        if (atomMasses[a]) total += res[a] * atomMasses[a];
    }

    const box = document.getElementById('mol-result-box');
    box.innerHTML = `M = <strong>${total.toFixed(3)}</strong> g/mol`;
    box.style.display = 'block';
}

/* =============================================================================
   CERCLE TRIGO
   ============================================================================= */
function initTrigo() {
    const canvas = document.getElementById('trigoCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    function draw(angle) {
        ctx.clearRect(0, 0, 400, 400);
        // Axes
        ctx.strokeStyle = '#ccc';
        ctx.beginPath(); ctx.moveTo(0, 200); ctx.lineTo(400, 200); ctx.moveTo(200, 0); ctx.lineTo(200, 400); ctx.stroke();
        // Cercle
        ctx.strokeStyle = '#333';
        ctx.beginPath(); ctx.arc(200, 200, 150, 0, Math.PI * 2); ctx.stroke();
        
        let x = 200 + 150 * Math.cos(angle);
        let y = 200 - 150 * Math.sin(angle);
        
        // Rayon
        ctx.strokeStyle = 'purple';
        ctx.beginPath(); ctx.moveTo(200, 200); ctx.lineTo(x, y); ctx.stroke();
        
        document.getElementById('val-cos').innerText = Math.cos(angle).toFixed(3);
        document.getElementById('val-sin').innerText = Math.sin(angle).toFixed(3);
    }

    canvas.onmousedown = (e) => {
        let rect = canvas.getBoundingClientRect();
        let angle = Math.atan2(-(e.clientY - rect.top - 200), e.clientX - rect.left - 200);
        draw(angle);
    };
    draw(0);
}

/* =============================================================================
   4. TABLEAU PÉRIODIQUE (COMPLET)
   ============================================================================= */
        /* 3. TABLEAU PÉRIODIQUE */
        const fullElements = [
        // --- Période 1 ---
        {z:1, s:"H", n:"Hydrogène", a:1.008, x:1, y:1},
        {z:2, s:"He", n:"Hélium", a:4.003, x:18, y:1},

        // --- Période 2 ---
        {z:3, s:"Li", n:"Lithium", a:6.941, x:1, y:2},
        {z:4, s:"Be", n:"Béryllium", a:9.012, x:2, y:2},
        {z:5, s:"B", n:"Bore", a:10.81, x:13, y:2},
        {z:6, s:"C", n:"Carbone", a:12.01, x:14, y:2},
        {z:7, s:"N", n:"Azote", a:14.01, x:15, y:2},
        {z:8, s:"O", n:"Oxygène", a:16.00, x:16, y:2},
        {z:9, s:"F", n:"Fluor", a:19.00, x:17, y:2},
        {z:10, s:"Ne", n:"Néon", a:20.18, x:18, y:2},

        // --- Période 3 ---
        {z:11, s:"Na", n:"Sodium", a:22.99, x:1, y:3},
        {z:12, s:"Mg", n:"Magnésium", a:24.31, x:2, y:3},
        {z:13, s:"Al", n:"Aluminium", a:26.98, x:13, y:3},
        {z:14, s:"Si", n:"Silicium", a:28.09, x:14, y:3},
        {z:15, s:"P", n:"Phosphore", a:30.97, x:15, y:3},
        {z:16, s:"S", n:"Soufre", a:32.06, x:16, y:3},
        {z:17, s:"Cl", n:"Chlore", a:35.45, x:17, y:3},
        {z:18, s:"Ar", n:"Argon", a:39.95, x:18, y:3},

        // --- Période 4 ---
        {z:19, s:"K", n:"Potassium", a:39.10, x:1, y:4},
        {z:20, s:"Ca", n:"Calcium", a:40.08, x:2, y:4},
        {z:21, s:"Sc", n:"Scandium", a:44.96, x:3, y:4},
        {z:22, s:"Ti", n:"Titane", a:47.87, x:4, y:4},
        {z:23, s:"V", n:"Vanadium", a:50.94, x:5, y:4},
        {z:24, s:"Cr", n:"Chrome", a:52.00, x:6, y:4},
        {z:25, s:"Mn", n:"Manganèse", a:54.94, x:7, y:4},
        {z:26, s:"Fe", n:"Fer", a:55.85, x:8, y:4},
        {z:27, s:"Co", n:"Cobalt", a:58.93, x:9, y:4},
        {z:28, s:"Ni", n:"Nickel", a:58.69, x:10, y:4},
        {z:29, s:"Cu", n:"Cuivre", a:63.55, x:11, y:4},
        {z:30, s:"Zn", n:"Zinc", a:65.38, x:12, y:4},
        {z:31, s:"Ga", n:"Gallium", a:69.72, x:13, y:4},
        {z:32, s:"Ge", n:"Germanium", a:72.63, x:14, y:4},
        {z:33, s:"As", n:"Arsenic", a:74.92, x:15, y:4},
        {z:34, s:"Se", n:"Sélénium", a:78.96, x:16, y:4},
        {z:35, s:"Br", n:"Brome", a:79.90, x:17, y:4},
        {z:36, s:"Kr", n:"Krypton", a:83.80, x:18, y:4},

        // --- Période 5 ---
        {z:37, s:"Rb", n:"Rubidium", a:85.47, x:1, y:5},
        {z:38, s:"Sr", n:"Strontium", a:87.62, x:2, y:5},
        {z:39, s:"Y", n:"Yttrium", a:88.91, x:3, y:5},
        {z:40, s:"Zr", n:"Zirconium", a:91.22, x:4, y:5},
        {z:41, s:"Nb", n:"Niobium", a:92.91, x:5, y:5},
        {z:42, s:"Mo", n:"Molybdène", a:95.94, x:6, y:5},
        {z:43, s:"Tc", n:"Technétium", a:98, x:7, y:5},
        {z:44, s:"Ru", n:"Ruthénium", a:101.07, x:8, y:5},
        {z:45, s:"Rh", n:"Rhodium", a:102.91, x:9, y:5},
        {z:46, s:"Pd", n:"Palladium", a:106.42, x:10, y:5},
        {z:47, s:"Ag", n:"Argent", a:107.87, x:11, y:5},
        {z:48, s:"Cd", n:"Cadmium", a:112.41, x:12, y:5},
        {z:49, s:"In", n:"Indium", a:114.82, x:13, y:5},
        {z:50, s:"Sn", n:"Étain", a:118.71, x:14, y:5},
        {z:51, s:"Sb", n:"Antimoine", a:121.76, x:15, y:5},
        {z:52, s:"Te", n:"Tellure", a:127.60, x:16, y:5},
        {z:53, s:"I", n:"Iode", a:126.90, x:17, y:5},
        {z:54, s:"Xe", n:"Xénon", a:131.29, x:18, y:5},

        // --- Période 6 ---
        {z:55, s:"Cs", n:"Césium", a:132.91, x:1, y:6},
        {z:56, s:"Ba", n:"Baryum", a:137.33, x:2, y:6},
        // Lanthanides (voir plus bas)
        {z:72, s:"Hf", n:"Hafnium", a:178.49, x:4, y:6},
        {z:73, s:"Ta", n:"Tantale", a:180.95, x:5, y:6},
        {z:74, s:"W", n:"Tungstène", a:183.84, x:6, y:6},
        {z:75, s:"Re", n:"Rhénium", a:186.21, x:7, y:6},
        {z:76, s:"Os", n:"Osmium", a:190.23, x:8, y:6},
        {z:77, s:"Ir", n:"Iridium", a:192.22, x:9, y:6},
        {z:78, s:"Pt", n:"Platine", a:195.08, x:10, y:6},
        {z:79, s:"Au", n:"Or", a:196.97, x:11, y:6},
        {z:80, s:"Hg", n:"Mercure", a:200.59, x:12, y:6},
        {z:81, s:"Tl", n:"Thallium", a:204.38, x:13, y:6},
        {z:82, s:"Pb", n:"Plomb", a:207.20, x:14, y:6},
        {z:83, s:"Bi", n:"Bismuth", a:208.98, x:15, y:6},
        {z:84, s:"Po", n:"Polonium", a:209, x:16, y:6},
        {z:85, s:"At", n:"Astate", a:210, x:17, y:6},
        {z:86, s:"Rn", n:"Radon", a:222, x:18, y:6},

        // --- Période 7 ---
        {z:87, s:"Fr", n:"Francium", a:223, x:1, y:7},
        {z:88, s:"Ra", n:"Radium", a:226, x:2, y:7},
        // Actinides (voir plus bas)
        {z:104, s:"Rf", n:"Rutherfordium", a:267, x:4, y:7},
        {z:105, s:"Db", n:"Dubnium", a:268, x:5, y:7},
        {z:106, s:"Sg", n:"Seaborgium", a:271, x:6, y:7},
        {z:107, s:"Bh", n:"Bohrium", a:272, x:7, y:7},
        {z:108, s:"Hs", n:"Hassium", a:270, x:8, y:7},
        {z:109, s:"Mt", n:"Meitnerium", a:276, x:9, y:7},
        {z:110, s:"Ds", n:"Darmstadtium", a:281, x:10, y:7},
        {z:111, s:"Rg", n:"Roentgenium", a:280, x:11, y:7},
        {z:112, s:"Cn", n:"Copernicium", a:285, x:12, y:7},
        {z:113, s:"Nh", n:"Nihonium", a:284, x:13, y:7},
        {z:114, s:"Fl", n:"Flérovium", a:289, x:14, y:7},
        {z:115, s:"Mc", n:"Moscovium", a:288, x:15, y:7},
        {z:116, s:"Lv", n:"Livermorium", a:293, x:16, y:7},
        {z:117, s:"Ts", n:"Tennesse", a:294, x:17, y:7},
        {z:118, s:"Og", n:"Oganesson", a:294, x:18, y:7},

        // --- Lanthanides (Affichés en bas, ligne 9 fictive pour CSS) ---
        {z:57, s:"La", n:"Lanthane", a:138.91, x:3, y:9}, // Décalage pour affichage
        {z:58, s:"Ce", n:"Cérium", a:140.12, x:4, y:9},
        {z:59, s:"Pr", n:"Braséodyme", a:140.91, x:5, y:9},
        {z:60, s:"Nd", n:"Néodyme", a:144.24, x:6, y:9},
        {z:61, s:"Pm", n:"Prométhium", a:145, x:7, y:9},
        {z:62, s:"Sm", n:"Samarium", a:150.36, x:8, y:9},
        {z:63, s:"Eu", n:"Europium", a:151.96, x:9, y:9},
        {z:64, s:"Gd", n:"Gadolinium", a:157.25, x:10, y:9},
        {z:65, s:"Tb", n:"Terbium", a:158.93, x:11, y:9},
        {z:66, s:"Dy", n:"Dysprosium", a:162.50, x:12, y:9},
        {z:67, s:"Ho", n:"Holmium", a:164.93, x:13, y:9},
        {z:68, s:"Er", n:"Erbium", a:167.26, x:14, y:9},
        {z:69, s:"Tm", n:"Thulium", a:168.93, x:15, y:9},
        {z:70, s:"Yb", n:"Ytterbium", a:173.04, x:16, y:9},
        {z:71, s:"Lu", n:"Lutécium", a:174.97, x:17, y:9},

        // --- Actinides (Affichés en bas, ligne 10 fictive pour CSS) ---
        {z:89, s:"Ac", n:"Actinium", a:227, x:3, y:10},
        {z:90, s:"Th", n:"Thorium", a:232.04, x:4, y:10},
        {z:91, s:"Pa", n:"Protactinium", a:231.04, x:5, y:10},
        {z:92, s:"U", n:"Uranium", a:238.03, x:6, y:10},
        {z:93, s:"Np", n:"Neptunium", a:237, x:7, y:10},
        {z:94, s:"Pu", n:"Plutonium", a:244, x:8, y:10},
        {z:95, s:"Am", n:"Américium", a:243, x:9, y:10},
        {z:96, s:"Cm", n:"Curium", a:247, x:10, y:10},
        {z:97, s:"Bk", n:"Berkélium", a:247, x:11, y:10},
        {z:98, s:"Cf", n:"Californium", a:251, x:12, y:10},
        {z:99, s:"Es", n:"Einsteinium", a:252, x:13, y:10},
        {z:100, s:"Fm", n:"Fermium", a:257, x:14, y:10},
        {z:101, s:"Md", n:"Mendélévium", a:258, x:15, y:10},
        {z:102, s:"No", n:"Nobélium", a:259, x:16, y:10},
        {z:103, s:"Lr", n:"Lawrencium", a:262, x:17, y:10}
        ];
        
function initTableau() {
            const grid = document.getElementById('periodic-grid');
            if(!grid) return; // Sécurité si l'élément n'est pas trouvé
            
            grid.innerHTML = '';
            // On s'assure que la grille est bien configurée
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(18, 1fr)';
            grid.style.gap = '2px';

            // Création de la map pour positionner les éléments
            const tableMap = {};
            fullElements.forEach(el => {
                tableMap[`${el.x}-${el.y}`] = el;
            });

            // Boucle sur les 10 lignes (7 périodes + vide + 2 familles rares)
            for (let y = 1; y <= 10; y++) {
                
                // Ligne 8 sert d'espace vide
                if(y === 8) {
                    for(let k=0; k<18; k++) createEmpty(grid);
                    continue;
                }
            
                for (let x = 1; x <= 18; x++) {
                    const data = tableMap[`${x}-${y}`];
                    if (data) {
                        createCell(grid, data);
                    } else {
                        createEmpty(grid);
                    }
                }
            }
        }

// Fonction pour déterminer la famille (couleur)
        function getFamilyClass(data) {
            const { x, y, z } = data;

            // Cas spéciaux (Lignes du bas)
            if (y === 9) return 'fam-lanthanide';
            if (y === 10) return 'fam-actinide';
            
            // Hydrogène (Non-métal mais colonne 1)
            if (z === 1) return 'fam-nonmetal';

            // Par Colonne
            if (x === 1) return 'fam-alkali';
            if (x === 2) return 'fam-alkaline';
            if (x >= 3 && x <= 12) return 'fam-transition';
            if (x === 17) return 'fam-halogen';
            if (x === 18) return 'fam-noble';

            // Zone complexe à droite (Escalier Métalloïdes / Métaux pauvres / Non métaux)
            // Simplification pour l'affichage :
            if (x >= 13 && x <= 16) {
                // Al, Ga, In, Sn, Tl, Pb, Bi, Po (Métaux pauvres - approximation visuelle)
                const isPostTransition = [13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116].includes(z);
                // B, Si, Ge, As, Sb, Te, At (Métalloïdes)
                const isMetalloid = [5, 14, 32, 33, 51, 52, 85].includes(z);
                
                if (isMetalloid) return 'fam-metalloid';
                if (isPostTransition) return 'fam-post-trans';
                return 'fam-nonmetal'; // C, N, O, P, S, Se
            }

            return ''; // Défaut
        }

        function createCell(container, data) {
            const div = document.createElement('div');
            // On récupère la classe de couleur
            const colorClass = getFamilyClass(data);
            
            div.className = `element-card ${colorClass}`;
            
            // Nouvelle structure HTML pour éviter le chevauchement
            div.innerHTML = `
                <div class="elem-header">
                    <span class="element-number">${data.z}</span>
                </div>
                <div class="elem-body">
                    <span class="element-symbol">${data.s}</span>
                </div>
                <div class="elem-footer">
                    <span class="element-molar">${data.a}</span>
                </div>
            `;
            
            div.onmouseover = () => {
                const details = document.getElementById('periodic-details');
                if(details) {
                    // On détermine le nom de la famille pour l'affichage
                    let familyName = "Élément";
                    if(colorClass === 'fam-alkali') familyName = "Métal Alcalin";
                    if(colorClass === 'fam-alkaline') familyName = "Métal Alcalino-terreux";
                    if(colorClass === 'fam-transition') familyName = "Métal de Transition";
                    if(colorClass === 'fam-halogen') familyName = "Halogène";
                    if(colorClass === 'fam-noble') familyName = "Gaz Noble";
                    if(colorClass === 'fam-lanthanide') familyName = "Lanthanide";
                    if(colorClass === 'fam-actinide') familyName = "Actinide";
                    if(colorClass === 'fam-nonmetal') familyName = "Non-métaux";
                    if(colorClass === 'fam-metalloid') familyName = "Métalloïde";
                    if(colorClass === 'fam-post-trans') familyName = "Métaux pauvres";
                    
                    details.innerHTML = `
                        <div style="font-size:1.4rem; color:var(--brand-school)"><strong>${data.n} (${data.s})</strong></div>
                        <div style="margin-top:5px;">${familyName}</div>
                        <div style="font-size:0.9rem; color:#666; margin-top:5px;">
                            Numéro atomique (Z) : <strong>${data.z}</strong> &nbsp;|&nbsp; 
                            Masse molaire : <strong>${data.a}</strong> g/mol
                        </div>
                    `;
                }
            };
            container.appendChild(div);
        }

        function createEmpty(container) {
            const div = document.createElement('div'); 
            div.className = 'empty-cell'; 
            container.appendChild(div);
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
