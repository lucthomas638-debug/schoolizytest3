/* =============================================================================
   SCHOOLIZY — SCRIPT PRINCIPAL
   Réécrit, nettoyé et corrigé. Sommaire :
     0. Config Supabase & données
     1. Utilitaires (toast, loading, thème)
     2. Navigation entre vues
     3. Recherche
     4. Niveaux → classes → matières → modes → chapitres
     5. Leçon & fiche récap
     6. Quiz (normal + survie) & navigation clavier
     7. Flashcards
     8. Exercices
     9. Récitation (MathLive) & défi 1 minute
    10. Outils : trigo, repère, tableau périodique, convertisseur, traceur, masse molaire
    11. Annales (PDF)
    12. Pomodoro & calculatrice flottante
    13. Initialisation (DOMContentLoaded)
   ============================================================================= */

"use strict";

/* =============================================================================
   0. CONFIG SUPABASE & DONNÉES
   ============================================================================= */
const supabaseUrl = 'https://kuuxhzyfnqrdoewfoiyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1dXhoenlmbnFyZG9ld2ZvaXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjA2NzQsImV4cCI6MjA4ODEzNjY3NH0.ar-162v-HZ91M80xpDfE_mavK6xyE1Ciu7bZh-PNhHM';
const STORAGE_ANNALES = 'https://kuuxhzyfnqrdoewfoiyf.supabase.co/storage/v1/object/public/annales/';

// Client Supabase (la lib globale s'appelle "supabase")
const sb = window.supabase.createClient(supabaseUrl, supabaseKey);

// État global de l'application
const state = {
    currentLevel: null,
    currentClassCode: null,
    currentClassLabel: null,
    currentSubject: null,
    currentMode: null,
    currentChapter: null
};

// Structure des niveaux : label affiché + code BDD
const levelsData = {
    primaire: [
        { label: "CP",  code: "cp"  },
        { label: "CE1", code: "ce1" },
        { label: "CE2", code: "ce2" },
        { label: "CM1", code: "cm1" },
        { label: "CM2", code: "cm2" }
    ],
    college: [
        { label: "3ème", code: "3eme" }
    ],
    lycee: [
        { label: "Seconde",   code: "seconde"   },
        { label: "Première",  code: "premiere"  },
        { label: "Terminale", code: "terminale" }
    ]
};

// Matières par code de classe
const subjectsData = {
    seconde:   ["Maths", "Physique-Chimie"],
    premiere:  ["Maths", "Physique-Chimie"],
    terminale: ["Maths", "Physique-Chimie"]
};

const LEVEL_LABELS = { primaire: "Primaire", college: "Collège", lycee: "Lycée" };

// Données du tableau périodique (118 éléments)
const fullElements = [
  {n:1,s:"H",name:"Hydrogène",m:1.008,row:1,col:1,fam:"nonmetal"},
  {n:2,s:"He",name:"Hélium",m:4.003,row:1,col:18,fam:"noble"},
  {n:3,s:"Li",name:"Lithium",m:6.94,row:2,col:1,fam:"alkali"},
  {n:4,s:"Be",name:"Béryllium",m:9.012,row:2,col:2,fam:"alkaline"},
  {n:5,s:"B",name:"Bore",m:10.81,row:2,col:13,fam:"metalloid"},
  {n:6,s:"C",name:"Carbone",m:12.011,row:2,col:14,fam:"nonmetal"},
  {n:7,s:"N",name:"Azote",m:14.007,row:2,col:15,fam:"nonmetal"},
  {n:8,s:"O",name:"Oxygène",m:15.999,row:2,col:16,fam:"nonmetal"},
  {n:9,s:"F",name:"Fluor",m:18.998,row:2,col:17,fam:"halogen"},
  {n:10,s:"Ne",name:"Néon",m:20.18,row:2,col:18,fam:"noble"},
  {n:11,s:"Na",name:"Sodium",m:22.99,row:3,col:1,fam:"alkali"},
  {n:12,s:"Mg",name:"Magnésium",m:24.305,row:3,col:2,fam:"alkaline"},
  {n:13,s:"Al",name:"Aluminium",m:26.982,row:3,col:13,fam:"post-trans"},
  {n:14,s:"Si",name:"Silicium",m:28.085,row:3,col:14,fam:"metalloid"},
  {n:15,s:"P",name:"Phosphore",m:30.974,row:3,col:15,fam:"nonmetal"},
  {n:16,s:"S",name:"Soufre",m:32.06,row:3,col:16,fam:"nonmetal"},
  {n:17,s:"Cl",name:"Chlore",m:35.45,row:3,col:17,fam:"halogen"},
  {n:18,s:"Ar",name:"Argon",m:39.948,row:3,col:18,fam:"noble"},
  {n:19,s:"K",name:"Potassium",m:39.098,row:4,col:1,fam:"alkali"},
  {n:20,s:"Ca",name:"Calcium",m:40.078,row:4,col:2,fam:"alkaline"},
  {n:21,s:"Sc",name:"Scandium",m:44.956,row:4,col:3,fam:"transition"},
  {n:22,s:"Ti",name:"Titane",m:47.867,row:4,col:4,fam:"transition"},
  {n:23,s:"V",name:"Vanadium",m:50.942,row:4,col:5,fam:"transition"},
  {n:24,s:"Cr",name:"Chrome",m:51.996,row:4,col:6,fam:"transition"},
  {n:25,s:"Mn",name:"Manganèse",m:54.938,row:4,col:7,fam:"transition"},
  {n:26,s:"Fe",name:"Fer",m:55.845,row:4,col:8,fam:"transition"},
  {n:27,s:"Co",name:"Cobalt",m:58.933,row:4,col:9,fam:"transition"},
  {n:28,s:"Ni",name:"Nickel",m:58.693,row:4,col:10,fam:"transition"},
  {n:29,s:"Cu",name:"Cuivre",m:63.546,row:4,col:11,fam:"transition"},
  {n:30,s:"Zn",name:"Zinc",m:65.38,row:4,col:12,fam:"transition"},
  {n:31,s:"Ga",name:"Gallium",m:69.723,row:4,col:13,fam:"post-trans"},
  {n:32,s:"Ge",name:"Germanium",m:72.63,row:4,col:14,fam:"metalloid"},
  {n:33,s:"As",name:"Arsenic",m:74.922,row:4,col:15,fam:"metalloid"},
  {n:34,s:"Se",name:"Sélénium",m:78.971,row:4,col:16,fam:"nonmetal"},
  {n:35,s:"Br",name:"Brome",m:79.904,row:4,col:17,fam:"halogen"},
  {n:36,s:"Kr",name:"Krypton",m:83.798,row:4,col:18,fam:"noble"},
  {n:37,s:"Rb",name:"Rubidium",m:85.468,row:5,col:1,fam:"alkali"},
  {n:38,s:"Sr",name:"Strontium",m:87.62,row:5,col:2,fam:"alkaline"},
  {n:39,s:"Y",name:"Yttrium",m:88.906,row:5,col:3,fam:"transition"},
  {n:40,s:"Zr",name:"Zirconium",m:91.224,row:5,col:4,fam:"transition"},
  {n:41,s:"Nb",name:"Niobium",m:92.906,row:5,col:5,fam:"transition"},
  {n:42,s:"Mo",name:"Molybdène",m:95.95,row:5,col:6,fam:"transition"},
  {n:43,s:"Tc",name:"Technétium",m:98,row:5,col:7,fam:"transition"},
  {n:44,s:"Ru",name:"Ruthénium",m:101.07,row:5,col:8,fam:"transition"},
  {n:45,s:"Rh",name:"Rhodium",m:102.906,row:5,col:9,fam:"transition"},
  {n:46,s:"Pd",name:"Palladium",m:106.42,row:5,col:10,fam:"transition"},
  {n:47,s:"Ag",name:"Argent",m:107.868,row:5,col:11,fam:"transition"},
  {n:48,s:"Cd",name:"Cadmium",m:112.414,row:5,col:12,fam:"transition"},
  {n:49,s:"In",name:"Indium",m:114.818,row:5,col:13,fam:"post-trans"},
  {n:50,s:"Sn",name:"Étain",m:118.71,row:5,col:14,fam:"post-trans"},
  {n:51,s:"Sb",name:"Antimoine",m:121.76,row:5,col:15,fam:"metalloid"},
  {n:52,s:"Te",name:"Tellure",m:127.6,row:5,col:16,fam:"metalloid"},
  {n:53,s:"I",name:"Iode",m:126.904,row:5,col:17,fam:"halogen"},
  {n:54,s:"Xe",name:"Xénon",m:131.293,row:5,col:18,fam:"noble"},
  {n:55,s:"Cs",name:"Césium",m:132.905,row:6,col:1,fam:"alkali"},
  {n:56,s:"Ba",name:"Baryum",m:137.327,row:6,col:2,fam:"alkaline"},
  {n:57,s:"La",name:"Lanthane",m:138.905,row:8,col:3,fam:"lanthanide"},
  {n:58,s:"Ce",name:"Cérium",m:140.116,row:8,col:4,fam:"lanthanide"},
  {n:59,s:"Pr",name:"Praséodyme",m:140.908,row:8,col:5,fam:"lanthanide"},
  {n:60,s:"Nd",name:"Néodyme",m:144.242,row:8,col:6,fam:"lanthanide"},
  {n:61,s:"Pm",name:"Prométhium",m:145,row:8,col:7,fam:"lanthanide"},
  {n:62,s:"Sm",name:"Samarium",m:150.36,row:8,col:8,fam:"lanthanide"},
  {n:63,s:"Eu",name:"Europium",m:151.964,row:8,col:9,fam:"lanthanide"},
  {n:64,s:"Gd",name:"Gadolinium",m:157.25,row:8,col:10,fam:"lanthanide"},
  {n:65,s:"Tb",name:"Terbium",m:158.925,row:8,col:11,fam:"lanthanide"},
  {n:66,s:"Dy",name:"Dysprosium",m:162.5,row:8,col:12,fam:"lanthanide"},
  {n:67,s:"Ho",name:"Holmium",m:164.93,row:8,col:13,fam:"lanthanide"},
  {n:68,s:"Er",name:"Erbium",m:167.259,row:8,col:14,fam:"lanthanide"},
  {n:69,s:"Tm",name:"Thulium",m:168.934,row:8,col:15,fam:"lanthanide"},
  {n:70,s:"Yb",name:"Ytterbium",m:173.045,row:8,col:16,fam:"lanthanide"},
  {n:71,s:"Lu",name:"Lutécium",m:174.967,row:8,col:17,fam:"lanthanide"},
  {n:72,s:"Hf",name:"Hafnium",m:178.49,row:6,col:4,fam:"transition"},
  {n:73,s:"Ta",name:"Tantale",m:180.948,row:6,col:5,fam:"transition"},
  {n:74,s:"W",name:"Tungstène",m:183.84,row:6,col:6,fam:"transition"},
  {n:75,s:"Re",name:"Rhénium",m:186.207,row:6,col:7,fam:"transition"},
  {n:76,s:"Os",name:"Osmium",m:190.23,row:6,col:8,fam:"transition"},
  {n:77,s:"Ir",name:"Iridium",m:192.217,row:6,col:9,fam:"transition"},
  {n:78,s:"Pt",name:"Platine",m:195.084,row:6,col:10,fam:"transition"},
  {n:79,s:"Au",name:"Or",m:196.967,row:6,col:11,fam:"transition"},
  {n:80,s:"Hg",name:"Mercure",m:200.592,row:6,col:12,fam:"transition"},
  {n:81,s:"Tl",name:"Thallium",m:204.38,row:6,col:13,fam:"post-trans"},
  {n:82,s:"Pb",name:"Plomb",m:207.2,row:6,col:14,fam:"post-trans"},
  {n:83,s:"Bi",name:"Bismuth",m:208.98,row:6,col:15,fam:"post-trans"},
  {n:84,s:"Po",name:"Polonium",m:209,row:6,col:16,fam:"post-trans"},
  {n:85,s:"At",name:"Astate",m:210,row:6,col:17,fam:"halogen"},
  {n:86,s:"Rn",name:"Radon",m:222,row:6,col:18,fam:"noble"},
  {n:87,s:"Fr",name:"Francium",m:223,row:7,col:1,fam:"alkali"},
  {n:88,s:"Ra",name:"Radium",m:226,row:7,col:2,fam:"alkaline"},
  {n:89,s:"Ac",name:"Actinium",m:227,row:9,col:3,fam:"actinide"},
  {n:90,s:"Th",name:"Thorium",m:232.038,row:9,col:4,fam:"actinide"},
  {n:91,s:"Pa",name:"Protactinium",m:231.036,row:9,col:5,fam:"actinide"},
  {n:92,s:"U",name:"Uranium",m:238.029,row:9,col:6,fam:"actinide"},
  {n:93,s:"Np",name:"Neptunium",m:237,row:9,col:7,fam:"actinide"},
  {n:94,s:"Pu",name:"Plutonium",m:244,row:9,col:8,fam:"actinide"},
  {n:95,s:"Am",name:"Américium",m:243,row:9,col:9,fam:"actinide"},
  {n:96,s:"Cm",name:"Curium",m:247,row:9,col:10,fam:"actinide"},
  {n:97,s:"Bk",name:"Berkélium",m:247,row:9,col:11,fam:"actinide"},
  {n:98,s:"Cf",name:"Californium",m:251,row:9,col:12,fam:"actinide"},
  {n:99,s:"Es",name:"Einsteinium",m:252,row:9,col:13,fam:"actinide"},
  {n:100,s:"Fm",name:"Fermium",m:257,row:9,col:14,fam:"actinide"},
  {n:101,s:"Md",name:"Mendélévium",m:258,row:9,col:15,fam:"actinide"},
  {n:102,s:"No",name:"Nobélium",m:259,row:9,col:16,fam:"actinide"},
  {n:103,s:"Lr",name:"Lawrencium",m:262,row:9,col:17,fam:"actinide"},
  {n:104,s:"Rf",name:"Rutherfordium",m:267,row:7,col:4,fam:"transition"},
  {n:105,s:"Db",name:"Dubnium",m:270,row:7,col:5,fam:"transition"},
  {n:106,s:"Sg",name:"Seaborgium",m:271,row:7,col:6,fam:"transition"},
  {n:107,s:"Bh",name:"Bohrium",m:270,row:7,col:7,fam:"transition"},
  {n:108,s:"Hs",name:"Hassium",m:277,row:7,col:8,fam:"transition"},
  {n:109,s:"Mt",name:"Meitnerium",m:276,row:7,col:9,fam:"transition"},
  {n:110,s:"Ds",name:"Darmstadtium",m:281,row:7,col:10,fam:"transition"},
  {n:111,s:"Rg",name:"Roentgenium",m:282,row:7,col:11,fam:"transition"},
  {n:112,s:"Cn",name:"Copernicium",m:285,row:7,col:12,fam:"transition"},
  {n:113,s:"Nh",name:"Nihonium",m:286,row:7,col:13,fam:"post-trans"},
  {n:114,s:"Fl",name:"Flérovium",m:289,row:7,col:14,fam:"post-trans"},
  {n:115,s:"Mc",name:"Moscovium",m:290,row:7,col:15,fam:"post-trans"},
  {n:116,s:"Lv",name:"Livermorium",m:293,row:7,col:16,fam:"post-trans"},
  {n:117,s:"Ts",name:"Tennesse",m:294,row:7,col:17,fam:"halogen"},
  {n:118,s:"Og",name:"Oganesson",m:294,row:7,col:18,fam:"noble"}
];

// Valeurs trigonométriques remarquables (clé = degrés)
const remarkableValues = {
    0:   { rad: "0",            cos: "1",            sin: "0",            tan: "0" },
    30:  { rad: "π/6",          cos: "√3/2",         sin: "1/2",          tan: "√3/3" },
    45:  { rad: "π/4",          cos: "√2/2",         sin: "√2/2",         tan: "1" },
    60:  { rad: "π/3",          cos: "1/2",          sin: "√3/2",         tan: "√3" },
    90:  { rad: "π/2",          cos: "0",            sin: "1",            tan: "∞" },
    120: { rad: "2π/3",         cos: "-1/2",         sin: "√3/2",         tan: "-√3" },
    135: { rad: "3π/4",         cos: "-√2/2",        sin: "√2/2",         tan: "-1" },
    150: { rad: "5π/6",         cos: "-√3/2",        sin: "1/2",          tan: "-√3/3" },
    180: { rad: "π",            cos: "-1",           sin: "0",            tan: "0" },
    210: { rad: "7π/6",         cos: "-√3/2",        sin: "-1/2",         tan: "√3/3" },
    225: { rad: "5π/4",         cos: "-√2/2",        sin: "-√2/2",        tan: "1" },
    240: { rad: "4π/3",         cos: "-1/2",         sin: "-√3/2",        tan: "√3" },
    270: { rad: "3π/2",         cos: "0",            sin: "-1",           tan: "∞" },
    300: { rad: "5π/3",         cos: "1/2",          sin: "-√3/2",        tan: "-√3" },
    315: { rad: "7π/4",         cos: "√2/2",         sin: "-√2/2",        tan: "-1" },
    330: { rad: "11π/6",        cos: "√3/2",         sin: "-1/2",         tan: "-√3/3" }
};

// Masses molaires atomiques (g/mol) pour le calculateur
const atomMasses = {
    H: 1.008, He: 4.003, Li: 6.94, Be: 9.012, B: 10.81, C: 12.011, N: 14.007,
    O: 15.999, F: 18.998, Ne: 20.180, Na: 22.990, Mg: 24.305, Al: 26.982,
    Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.948, K: 39.098,
    Ca: 40.078, Fe: 55.845, Cu: 63.546, Zn: 65.38, Ag: 107.868, I: 126.904,
    Ba: 137.327, Au: 196.967, Hg: 200.592, Pb: 207.2
};

// Table de conversion : facteur vers l'unité de base de chaque catégorie
const convData = {
    length: {
        label: "Longueur",
        base: "m",
        units: { km: 1000, m: 1, dm: 0.1, cm: 0.01, mm: 0.001, "µm": 1e-6, mi: 1609.34, yd: 0.9144, ft: 0.3048, in: 0.0254 }
    },
    mass: {
        label: "Masse",
        base: "g",
        units: { t: 1e6, kg: 1000, g: 1, mg: 0.001, "µg": 1e-6, lb: 453.592, oz: 28.3495 }
    },
    time: {
        label: "Temps",
        base: "s",
        units: { j: 86400, h: 3600, min: 60, s: 1, ms: 0.001 }
    },
    speed: {
        label: "Vitesse",
        base: "m/s",
        units: { "km/h": 0.277778, "m/s": 1, "mph": 0.44704, "kn": 0.514444 }
    },
    volume: {
        label: "Volume",
        base: "L",
        units: { "m³": 1000, hL: 100, L: 1, dL: 0.1, cL: 0.01, mL: 0.001, "cm³": 0.001 }
    },
    data: {
        label: "Données",
        base: "o",
        units: { To: 1e12, Go: 1e9, Mo: 1e6, ko: 1000, o: 1, bit: 0.125 }
    }
};

/* =============================================================================
   1. UTILITAIRES (toast, loading, thème)
   ============================================================================= */
// Notification non bloquante (remplace les alert())
function showToast(msg, type = "info", duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) { console.log(msg); return; }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Affiche un état de chargement dans un conteneur
function showLoading(containerId, message = "Chargement...") {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = `<div class="loading-state"><div class="spinner">⏳</div><p>${message}</p></div>`;
}

// Bascule clair / sombre, persistée dans localStorage
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('schoolizy-theme', isDark ? 'dark' : 'light');
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

// Applique le thème enregistré au chargement
function applySavedTheme() {
    const saved = localStorage.getItem('schoolizy-theme');
    const btn = document.getElementById('theme-toggle');
    if (saved === 'dark') {
        document.body.classList.add('dark-mode');
        if (btn) btn.textContent = '☀️';
    } else {
        if (btn) btn.textContent = '🌙';
    }
}

// Recompose les formules MathJax présentes dans le DOM
function typesetMath() {
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise().catch(() => {});
    }
}

/* =============================================================================
   2. NAVIGATION ENTRE VUES
   ============================================================================= */
function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    // La calculatrice flottante n'apparaît que dans les vues de travail
    const calcBtn = document.getElementById('floating-calc-btn');
    if (calcBtn) {
        const showCalc = ['view-lesson', 'view-quiz', 'view-final-exercises', 'view-fiche', 'view-recite'];
        calcBtn.style.display = showCalc.includes(viewId) ? 'flex' : 'none';
    }

    // Remonte en haut du conteneur principal
    const main = document.getElementById('app-container');
    if (main) main.scrollTop = 0;
}

/* =============================================================================
   3. RECHERCHE
   ============================================================================= */
function performSearch() {
    const input = document.getElementById('site-search');
    const box = document.getElementById('search-results');
    if (!input || !box) return;

    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { box.style.display = 'none'; box.innerHTML = ''; return; }

    // Construit l'index de recherche à partir des niveaux/classes/matières
    const results = [];
    for (const level in levelsData) {
        if (LEVEL_LABELS[level].toLowerCase().includes(q)) {
            results.push({ label: `${LEVEL_LABELS[level]} (niveau)`, action: () => openLevelPage(level) });
        }
        levelsData[level].forEach(cls => {
            if (cls.label.toLowerCase().includes(q)) {
                results.push({ label: `${cls.label} — ${LEVEL_LABELS[level]}`, action: () => openClass(level, cls) });
            }
            (subjectsData[cls.code] || []).forEach(subj => {
                if (subj.toLowerCase().includes(q) || cls.label.toLowerCase().includes(q)) {
                    results.push({
                        label: `${subj} — ${cls.label}`,
                        action: () => { openClass(level, cls); setTimeout(() => openSubject(subj), 50); }
                    });
                }
            });
        });
    }

    if (results.length === 0) {
        box.innerHTML = `<div class="result-item" style="color:#999; cursor:default;">Aucun résultat pour « ${q} »</div>`;
        box.style.display = 'block';
        return;
    }

    box.innerHTML = '';
    results.slice(0, 8).forEach(r => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.textContent = r.label;
        div.onclick = () => {
            box.style.display = 'none';
            input.value = '';
            r.action();
        };
        box.appendChild(div);
    });
    box.style.display = 'block';
}

/* =============================================================================
   4. NIVEAUX → CLASSES → MATIÈRES → MODES → CHAPITRES
   ============================================================================= */
function openLevelPage(level) {
    state.currentLevel = level;
    document.getElementById('level-title').textContent = LEVEL_LABELS[level] || "Classes";

    const grid = document.getElementById('classes-grid');
    grid.innerHTML = '';
    (levelsData[level] || []).forEach(cls => {
        const card = document.createElement('div');
        card.className = 'class-btn';
        card.innerHTML = `<span>🎒</span><h3>${cls.label}</h3>`;
        card.onclick = () => openClass(level, cls);
        grid.appendChild(card);
    });

    navigateTo('view-level-classes');
}

function openClass(level, cls) {
    state.currentLevel = level;
    state.currentClassCode = cls.code;
    state.currentClassLabel = cls.label;
    localStorage.setItem('schoolizy-last-class', JSON.stringify({ level, cls }));

    document.getElementById('subject-title').textContent = `Matières — ${cls.label}`;

    const grid = document.getElementById('subjects-grid');
    grid.innerHTML = '';
    const subjects = subjectsData[cls.code] || [];

    if (subjects.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#888;">
            Les matières pour cette classe arrivent bientôt ! 📚</p>`;
    } else {
        const icons = { "Maths": "🔢", "Physique-Chimie": "⚗️", "SVT": "🧬", "Français": "📖", "Histoire-Géo": "🌍" };
        subjects.forEach(subj => {
            const card = document.createElement('div');
            card.className = 'subject-card';
            card.innerHTML = `<span>${icons[subj] || "📘"}</span><h3>${subj}</h3>`;
            card.onclick = () => openSubject(subj);
            grid.appendChild(card);
        });
    }

    navigateTo('view-subjects');
}

function openSubject(subject) {
    state.currentSubject = subject;
    navigateTo('view-mode');
}

// Choix d'une activité ; déclenche le chargement adapté
function chooseMode(mode) {
    state.currentMode = mode;

    if (mode === 'recite') {
        // La récitation n'a pas de sélection de chapitre : on démarre directement
        loadReciteQuestions();
        return;
    }

    document.getElementById('chapters-title').textContent =
        `${state.currentSubject} — Choisis un chapitre`;

    // La barre d'options multi n'apparaît que pour le quiz
    const optionsBar = document.getElementById('quiz-options-bar');
    if (optionsBar) optionsBar.style.display = (mode === 'quiz') ? 'block' : 'none';

    navigateTo('view-chapters');
    loadChapters();
}

function backFromChapters() {
    navigateTo('view-mode');
}

// Charge la liste des chapitres disponibles pour la matière/mode courant
async function loadChapters() {
    showLoading('chapters-grid', 'Recherche des chapitres...');

    // La table source dépend du mode choisi
    const tableByMode = {
        lesson:    'lessons',
        quiz:      'quizzes',
        fiche:     'lessons',
        exercise:  'exercises',
        flashcard: 'flashcards'
    };
    const table = tableByMode[state.currentMode] || 'lessons';

    const { data, error } = await sb
        .from(table)
        .select('chapter_number')
        .eq('class_id', state.currentClassCode)
        .eq('subject_id', state.currentSubject.toLowerCase())
        .order('chapter_number', { ascending: true });

    if (error || !data || data.length === 0) {
        document.getElementById('chapters-grid').innerHTML =
            `<p style="grid-column:1/-1; text-align:center; color:#888; padding:2rem;">
                Contenu bientôt disponible pour cette matière ! 🚧</p>`;
        return; // l'utilisateur reste sur view-chapters, sans blocage
    }

    // Chapitres uniques
    const chapters = [...new Set(data.map(d => d.chapter_number))].sort((a, b) => a - b);
    renderChaptersGrid(chapters);
}

function renderChaptersGrid(chapters) {
    const grid = document.getElementById('chapters-grid');
    grid.innerHTML = '';

    chapters.forEach(num => {
        const card = document.createElement('div');
        card.className = 'chapter-card-interactive';
        card.dataset.chapter = num;
        card.innerHTML = `
            <div class="chapter-badge-selection"></div>
            <span style="font-size:2.5rem;">📂</span>
            <h3 style="margin-top:10px;">Chapitre ${num}</h3>`;
        card.onclick = () => onChapterClick(card, num);
        grid.appendChild(card);
    });
}

// Clic sur un chapitre : comportement selon le mode (et la sélection multiple)
function onChapterClick(card, num) {
    if (state.currentMode === 'quiz' && multiSelectMode) {
        card.classList.toggle('selected');
        return;
    }

    state.currentChapter = num;
    switch (state.currentMode) {
        case 'lesson':    openLesson(num); break;
        case 'quiz':      openQuiz(num); break;
        case 'fiche':     openFiche(num); break;
        case 'exercise':  openExercises(num); break;
        case 'flashcard': openFlashcards(num); break;
        default:          openLesson(num);
    }
}

/* =============================================================================
   5. LEÇON & FICHE RÉCAP
   ============================================================================= */
async function openLesson(chapterNum) {
    navigateTo('view-lesson');
    showLoading('lesson-container', 'Chargement de la leçon...');

    const { data, error } = await sb
        .from('lessons')
        .select('content')
        .eq('class_id', state.currentClassCode)
        .eq('subject_id', state.currentSubject.toLowerCase())
        .eq('chapter_number', chapterNum)
        .maybeSingle();

    const container = document.getElementById('lesson-container');
    if (error || !data || !data.content) {
        container.innerHTML = `<p style="text-align:center; color:#888;">Leçon indisponible pour ce chapitre.</p>`;
        return;
    }

    // Contenu issu de la BDD (contrôlée). Voir note sécurité dans le README.
    container.innerHTML = data.content;
    typesetMath();
}

async function openFiche(chapterNum) {
    navigateTo('view-fiche');
    showLoading('fiche-content', 'Chargement de la fiche...');
    document.getElementById('fiche-header').innerHTML = '';

    const { data, error } = await sb
        .from('lessons')
        .select('recap, content')
        .eq('class_id', state.currentClassCode)
        .eq('subject_id', state.currentSubject.toLowerCase())
        .eq('chapter_number', chapterNum)
        .maybeSingle();

    const header = document.getElementById('fiche-header');
    const content = document.getElementById('fiche-content');

    if (error || !data || !data.recap) {
        header.innerHTML = `<h2 style="-webkit-text-stroke:0; color:var(--brand-school);">Chapitre ${chapterNum}</h2>`;
        content.innerHTML = `<p style="text-align:center; color:#888;">Fiche récap bientôt disponible. 📝</p>`;
        return;
    }

    header.innerHTML = `<h2 style="-webkit-text-stroke:0; color:var(--brand-school); margin:0;">
        📝 Fiche récap — Chapitre ${chapterNum}</h2>
        <p style="color:var(--text-muted); margin-top:0.5rem;">${state.currentSubject} · ${state.currentClassLabel}</p>`;
    content.innerHTML = data.recap;
    typesetMath();
}

/* =============================================================================
   6. QUIZ (normal + survie) & NAVIGATION CLAVIER
   ============================================================================= */
// État du quiz encapsulé pour éviter les conflits avec la récitation
const quizState = {
    data: [],
    backup: [],
    step: 0,
    answers: {},
    isTimeAttack: false,
    timer: null,
    timeLeft: 60,
    reset() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.data = [];
        this.step = 0;
        this.answers = {};
        this.isTimeAttack = false;
        this.timeLeft = 60;
    }
};

let multiSelectMode = false;

function toggleMultiSelectionMode() {
    multiSelectMode = document.getElementById('toggle-multi-mode').checked;
    document.getElementById('multi-validate-area').style.display = multiSelectMode ? 'block' : 'none';
    // Réinitialise les sélections visuelles
    document.querySelectorAll('.chapter-card-interactive.selected').forEach(c => c.classList.remove('selected'));
}

// Lance un quiz multi-chapitres à partir des cartes sélectionnées
function prepareMultiQuiz() {
    const selected = [...document.querySelectorAll('.chapter-card-interactive.selected')]
        .map(c => parseInt(c.dataset.chapter));
    if (selected.length === 0) {
        showToast("Sélectionne au moins un chapitre.", "error");
        return;
    }
    openQuiz(selected);
}

// Récupère les questions d'un (ou plusieurs) chapitre(s)
async function fetchQuizQuestions(chapterNumOrList) {
    let query = sb.from('quizzes')
        .select('question, options, correct_index, chapter_number')
        .eq('class_id', state.currentClassCode)
        .eq('subject_id', state.currentSubject.toLowerCase());

    if (Array.isArray(chapterNumOrList)) {
        query = query.in('chapter_number', chapterNumOrList);
    } else {
        query = query.eq('chapter_number', chapterNumOrList);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data;
}

async function openQuiz(chapterNumOrList) {
    navigateTo('view-quiz');
    showLoading('quiz-container', 'Préparation des questions...');
    quizState.reset();

    const questions = await fetchQuizQuestions(chapterNumOrList);
    if (questions.length === 0) {
        document.getElementById('quiz-container').innerHTML =
            `<p style="text-align:center; color:#888; padding:3rem;">Aucune question pour ce chapitre. 🚧</p>`;
        return;
    }

    // Mélange les questions
    quizState.data = [...questions].sort(() => Math.random() - 0.5);
    quizState.backup = [...quizState.data];
    quizState.step = 0;
    quizState.isTimeAttack = false;

    document.getElementById('quiz-page-title').textContent = "Quiz";
    // Rebuild conteneur (showLoading l'a vidé)
    rebuildQuizContainer();
    renderQuizSlide();
}

// Reconstruit le squelette du conteneur de quiz (overlay décompte inclus)
function rebuildQuizContainer() {
    const container = document.getElementById('quiz-container');
    container.classList.remove('survival-mode');
    container.innerHTML = `<div id="countdown-overlay"></div>
        <div id="quiz-slide"></div>`;
}

// Affiche la question courante
function renderQuizSlide() {
    const slide = document.getElementById('quiz-slide');
    if (!slide) { rebuildQuizContainer(); }
    const target = document.getElementById('quiz-slide');

    const q = quizState.data[quizState.step];
    if (!q) { finishQuiz(); return; }

    const total = quizState.data.length;
    const selectedIdx = quizState.answers[quizState.step];

    let optionsHtml = '';
    (q.options || []).forEach((opt, i) => {
        const cls = (selectedIdx === i) ? 'quiz-option selected' : 'quiz-option';
        optionsHtml += `<div class="${cls}" onclick="selectOption(${i})">${i + 1}. ${opt}</div>`;
    });

    const timerHtml = quizState.isTimeAttack
        ? `<div id="quiz-timer-display" style="display:block; text-align:center; margin-bottom:15px;">
               ⏱️ <span class="${quizState.timeLeft <= 10 ? 'low-time' : ''}">${quizState.timeLeft}</span>s
           </div>`
        : '';

    target.innerHTML = `
        ${timerHtml}
        <div class="quiz-question-card">
            <div style="text-align:center; color:var(--text-muted); font-size:0.85rem; margin-bottom:10px;">
                Question ${quizState.step + 1} / ${total}
            </div>
            <div class="quiz-question-text">${q.question}</div>
            <div id="options-box">${optionsHtml}</div>
        </div>
        <div class="quiz-navigation">
            <button class="btn-nav" onclick="changeSlide(-1)"
                style="${quizState.step === 0 ? 'visibility:hidden;' : ''}">‹ Précédent</button>
            ${quizState.step === total - 1
                ? `<button class="btn-nav" onclick="finishQuiz()">Terminer ✓</button>`
                : `<button class="btn-nav" onclick="changeSlide(1)">Suivant ›</button>`}
        </div>`;

    typesetMath();
}

// Sélection d'une réponse
function selectOption(idx) {
    quizState.answers[quizState.step] = idx;
    const q = quizState.data[quizState.step];

    // Retour visuel immédiat
    const options = document.querySelectorAll('#options-box .quiz-option');
    options.forEach((o, i) => {
        o.classList.remove('selected', 'correct', 'wrong');
        if (i === q.correct_index) o.classList.add('correct');
        if (i === idx && idx !== q.correct_index) o.classList.add('wrong');
    });

    // En mode survie : enchaîne vite et compte les bonnes réponses
    if (quizState.isTimeAttack) {
        setTimeout(() => {
            if (quizState.step < quizState.data.length - 1) {
                quizState.step++;
                renderQuizSlide();
            } else {
                finishQuiz();
            }
        }, 350);
    }
}

function changeSlide(dir) {
    const next = quizState.step + dir;
    if (next < 0 || next >= quizState.data.length) return;
    quizState.step = next;
    renderQuizSlide();
}

function finishQuiz() {
    if (quizState.timer) { clearInterval(quizState.timer); quizState.timer = null; }

    let score = 0;
    quizState.data.forEach((q, i) => {
        if (quizState.answers[i] === q.correct_index) score++;
    });
    const total = quizState.data.length;
    const pct = total ? Math.round((score / total) * 100) : 0;

    let msg = "Continue de t'entraîner ! 💪";
    if (pct === 100) msg = "Parfait ! 🏆";
    else if (pct >= 70) msg = "Très bien ! 🎉";
    else if (pct >= 50) msg = "Pas mal, encore un effort. 👍";

    const container = document.getElementById('quiz-container');
    container.classList.remove('survival-mode');
    container.innerHTML = `
        <div class="quiz-result-box">
            <p style="font-size:1.1rem; color:var(--text-muted);">Ton score</p>
            <div class="quiz-score">${score} / ${total}</div>
            <p style="font-weight:bold; margin-bottom:1rem;">${msg}</p>
            <button class="btn-restart" onclick="openQuiz(state.currentChapter)">↻ Recommencer</button>
            <button class="btn-restart" onclick="navigateTo('view-chapters')"
                style="border-style:solid;">Retour aux chapitres</button>
        </div>`;
}

// --- Mode survie / défi chronométré ---
function launchSurvieLogic(chapterNum) {
    quizState.reset();
    quizState.isTimeAttack = true;
    quizState.timeLeft = 60;
    quizState.step = 0;

    // Réutilise le backup si déjà chargé, sinon il sera (re)chargé par openQuiz
    if (quizState.backup.length > 0) {
        quizState.data = [...quizState.backup].sort(() => Math.random() - 0.5);
    }

    navigateTo('view-quiz');

    // 1. D'abord render la slide (qui crée #quiz-timer-display)
    rebuildQuizContainer();
    renderQuizSlide();

    // 2. PUIS démarrer le timer (l'élément existe désormais)
    const container = document.getElementById('quiz-container');
    if (container) container.classList.add('survival-mode');
    startGlobalTimer(chapterNum);
}

function startGlobalTimer() {
    if (quizState.timer) clearInterval(quizState.timer);
    quizState.timer = setInterval(() => {
        quizState.timeLeft--;
        const disp = document.getElementById('quiz-timer-display');
        if (disp) {
            disp.innerHTML = `⏱️ <span class="${quizState.timeLeft <= 10 ? 'low-time' : ''}">${quizState.timeLeft}</span>s`;
        }
        if (quizState.timeLeft <= 0) {
            clearInterval(quizState.timer);
            quizState.timer = null;
            finishQuiz();
        }
    }, 1000);
}

// Navigation clavier dans le quiz (touches 1-4 + flèches)
function handleQuizKeyboard(e) {
    const quizActive = document.getElementById('view-quiz')?.classList.contains('active');
    if (!quizActive) return;

    if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        const options = document.querySelectorAll('#options-box .quiz-option');
        if (options[idx]) options[idx].click();
    }
    if (e.key === 'ArrowRight') {
        document.querySelector('.btn-nav[onclick*="changeSlide(1"]')?.click();
    }
    if (e.key === 'ArrowLeft') {
        document.querySelector('.btn-nav[onclick*="changeSlide(-1"]')?.click();
    }
}

/* =============================================================================
   7. FLASHCARDS
   ============================================================================= */
async function openFlashcards(chapterNum) {
    navigateTo('view-flashcards');
    showLoading('flashcards-grid-container', 'Chargement des cartes...');
    document.getElementById('flashcards-page-title').textContent = `Flashcards — Chapitre ${chapterNum}`;

    const { data, error } = await sb
        .from('flashcards')
        .select('front, back')
        .eq('class_id', state.currentClassCode)
        .eq('subject_id', state.currentSubject.toLowerCase())
        .eq('chapter_number', chapterNum);

    const container = document.getElementById('flashcards-grid-container');
    if (error || !data || data.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#888; padding:2rem;">
            Pas encore de flashcards pour ce chapitre. 📄</p>`;
        return;
    }

    renderFlashcards(data);
}

function renderFlashcards(cards) {
    const container = document.getElementById('flashcards-grid-container');
    container.innerHTML = '';

    // Regroupe les cartes par rangées de 3
    let row = null;
    cards.forEach((card, i) => {
        if (i % 3 === 0) {
            row = document.createElement('div');
            row.className = 'flashcards-grid-row';
            container.appendChild(row);
        }
        const el = document.createElement('div');
        el.className = 'flashcard';
        el.innerHTML = `
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <span class="flashcard-hint">Question</span>
                    <div class="flash-txt">${card.front}</div>
                </div>
                <div class="flashcard-back">
                    <span class="flashcard-hint">Réponse</span>
                    <div class="flash-txt">${card.back}</div>
                </div>
            </div>`;
        el.onclick = () => el.classList.toggle('flipped');
        row.appendChild(el);
    });

    typesetMath();
}

/* =============================================================================
   8. EXERCICES
   ============================================================================= */
async function openExercises(chapterNum) {
    navigateTo('view-final-exercises');
    showLoading('final-exercise-list', 'Chargement des exercices...');

    const { data, error } = await sb
        .from('exercises')
        .select('enunciated, correction, difficulty, estimated_time')
        .eq('class_id', state.currentClassCode)
        .eq('subject_id', state.currentSubject.toLowerCase())
        .eq('chapter_number', chapterNum);

    const list = document.getElementById('final-exercise-list');
    if (error || !data || data.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:#888; padding:2rem;">
            Pas encore d'exercices pour ce chapitre. 🧠</p>`;
        return;
    }

    renderExercises(data);
}

function renderExercises(exercises) {
    const list = document.getElementById('final-exercise-list');
    list.innerHTML = '';

    exercises.forEach((ex, i) => {
        const stars = '★'.repeat(ex.difficulty || 1) + '☆'.repeat(Math.max(0, 3 - (ex.difficulty || 1)));
        const card = document.createElement('div');
        card.className = 'exercise-card';
        card.innerHTML = `
            <div class="exercise-header">
                <span class="exercise-badge">Exercice ${i + 1}</span>
                <div class="exercise-meta">
                    <span class="difficulty-stars">${stars}</span>
                    ${ex.estimated_time ? `<span class="estimated-time">⏱️ ${ex.estimated_time} min</span>` : ''}
                </div>
            </div>
            <div class="exercise-enunciated">${ex.enunciated}</div>
            <button class="btn-reveal" onclick="toggleCorrection(this)">👁️ Voir la correction</button>
            <div class="correction-box" style="display:none;">
                <span class="correction-title">Correction</span>
                <div>${ex.correction || "Correction bientôt disponible."}</div>
            </div>`;
        list.appendChild(card);
    });

    typesetMath();
}

function toggleCorrection(btn) {
    const box = btn.parentElement.querySelector('.correction-box');
    if (!box) return;
    const visible = box.style.display !== 'none';
    box.style.display = visible ? 'none' : 'block';
    btn.innerHTML = visible ? '👁️ Voir la correction' : '🙈 Masquer la correction';
    if (!visible) typesetMath();
}

/* =============================================================================
   9. RÉCITATION (MathLive) & DÉFI 1 MINUTE
   ============================================================================= */
const reciteState = {
    questions: [],
    index: 0,
    score: 0,
    isSpeedRun: false,
    timer: null,
    timeLeft: 60
};

async function loadReciteQuestions() {
    navigateTo('view-recite');
    // Réutilise la table quizzes comme base de formules à réciter
    const { data, error } = await sb
        .from('quizzes')
        .select('question, options, correct_index')
        .eq('class_id', state.currentClassCode)
        .eq('subject_id', state.currentSubject.toLowerCase());

    if (error || !data || data.length === 0) {
        document.getElementById('recite-question').textContent = "Pas encore de questions pour cette matière.";
        return;
    }

    // Transforme en {q, answer}
    reciteState.questions = data
        .filter(d => Array.isArray(d.options) && d.options[d.correct_index] != null)
        .map(d => ({ q: d.question, answer: String(d.options[d.correct_index]) }))
        .sort(() => Math.random() - 0.5);

    reciteState.index = 0;
    reciteState.score = 0;
    reciteState.isSpeedRun = false;

    document.getElementById('recite-results').style.display = 'none';
    document.getElementById('recite-game-zone').style.display = 'block';
    document.getElementById('recite-timer-bar').style.display = 'none';

    showReciteQuestion();
}

function showReciteQuestion() {
    const q = reciteState.questions[reciteState.index];
    if (!q) { showReciteResults(); return; }

    document.getElementById('recite-question').innerHTML = q.q;
    document.getElementById('recite-feedback').style.display = 'none';

    const mf = document.getElementById('math-input');
    if (mf) mf.value = '';

    typesetMath();
}

function checkReciteAnswer() {
    const q = reciteState.questions[reciteState.index];
    if (!q) return;

    const mf = document.getElementById('math-input');
    const userRaw = (mf?.value || '').trim();
    const userAnswer = normalizeMath(userRaw);
    const expected = normalizeMath(q.answer);

    const correct = userAnswer.length > 0 && userAnswer === expected;
    showReciteFeedback(correct, q.answer);

    if (correct) reciteState.score++;
    updateReciteScore();
}

// Normalise une expression mathématique pour comparaison souple
function normalizeMath(str) {
    return String(str)
        .toLowerCase()
        .replace(/\\left|\\right|\\,|\\;|\s+/g, '')
        .replace(/\\cdot|\\times|×/g, '*')
        .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
        .replace(/[{}]/g, '')
        .replace(/\\/g, '')
        .replace(/\^/g, '');
}

function showReciteFeedback(correct, expectedRaw) {
    const fb = document.getElementById('recite-feedback');
    const text = document.getElementById('feedback-text');
    const corr = document.getElementById('correction-area');

    fb.style.display = 'block';
    fb.style.background = correct ? '#e8f8f0' : '#fce8e6';
    text.textContent = correct ? "✓ Correct !" : "✗ Pas tout à fait...";
    text.style.color = correct ? 'var(--accent-green)' : 'var(--accent-red)';
    corr.innerHTML = `Réponse attendue : <strong>${expectedRaw}</strong>`;

    // En speedrun, on enchaîne automatiquement
    if (reciteState.isSpeedRun) {
        setTimeout(() => goToNextQuestion(), 600);
    }
    typesetMath();
}

// Valide manuellement une réponse jugée correcte par l'élève
function forceValidAnswer() {
    reciteState.score++;
    updateReciteScore();
    goToNextQuestion();
}

function goToNextQuestion() {
    reciteState.index++;
    if (reciteState.index >= reciteState.questions.length) {
        if (reciteState.isSpeedRun) {
            // Recommence le pool pour continuer à scorer jusqu'à la fin du temps
            reciteState.index = 0;
            reciteState.questions.sort(() => Math.random() - 0.5);
        } else {
            showReciteResults();
            return;
        }
    }
    showReciteQuestion();
}

function updateReciteScore() {
    const el = document.getElementById('recite-score');
    if (el) el.textContent = reciteState.score;
}

// Défi 1 minute
function startSpeedRun() {
    if (reciteState.questions.length === 0) {
        showToast("Aucune question disponible.", "error");
        return;
    }
    reciteState.isSpeedRun = true;
    reciteState.score = 0;
    reciteState.index = 0;
    reciteState.timeLeft = 60;
    reciteState.questions.sort(() => Math.random() - 0.5);

    document.getElementById('recite-timer-bar').style.display = 'flex';
    document.getElementById('recite-time-left').textContent = '60';
    updateReciteScore();
    showReciteQuestion();

    if (reciteState.timer) clearInterval(reciteState.timer);
    reciteState.timer = setInterval(() => {
        reciteState.timeLeft--;
        const t = document.getElementById('recite-time-left');
        if (t) t.textContent = reciteState.timeLeft;
        if (reciteState.timeLeft <= 0) {
            clearInterval(reciteState.timer);
            reciteState.timer = null;
            showReciteResults();
        }
    }, 1000);
}

function showReciteResults() {
    if (reciteState.timer) { clearInterval(reciteState.timer); reciteState.timer = null; }
    const wasSpeedRun = reciteState.isSpeedRun;
    reciteState.isSpeedRun = false;

    document.getElementById('recite-game-zone').style.display = 'none';
    document.getElementById('recite-results').style.display = 'block';

    const scoreEl = document.getElementById('final-score-big');

    if (wasSpeedRun) {
        // Record persistant par classe + matière
        const key = `record_${state.currentClassCode}_${state.currentSubject}`;
        const oldRecord = parseInt(localStorage.getItem(key) || '0', 10);
        if (reciteState.score > oldRecord) {
            localStorage.setItem(key, reciteState.score);
            scoreEl.innerHTML = `${reciteState.score}
                <small style="font-size:1rem; display:block; color:var(--brand-izy);">🏆 Nouveau record !</small>`;
        } else {
            scoreEl.innerHTML = `${reciteState.score}
                <small style="font-size:1rem; display:block; color:var(--text-muted);">Record : ${oldRecord}</small>`;
        }
    } else {
        scoreEl.textContent = reciteState.score;
    }
}

/* =============================================================================
   10. OUTILS
   ============================================================================= */

/* ---- 10.1 Cercle trigonométrique (version unique, avec valeurs remarquables) ---- */
let trigoAngle = 0; // en degrés

function initTrigo() {
    const canvas = document.getElementById('trigoCanvas');
    if (!canvas) return;

    const setFromEvent = (e) => {
        const rect = canvas.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const clientX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const clientY = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        let ang = Math.atan2(-(clientY - cy), clientX - cx) * 180 / Math.PI;
        if (ang < 0) ang += 360;

        // Aimante vers les angles remarquables si on est proche (±7°)
        const snaps = Object.keys(remarkableValues).map(Number);
        for (const s of snaps) {
            if (Math.abs(ang - s) < 7) { ang = s; break; }
        }
        trigoAngle = Math.round(ang);
        drawTrigo();
    };

    let dragging = false;
    canvas.onmousedown = (e) => { dragging = true; setFromEvent(e); };
    canvas.onmousemove = (e) => { if (dragging) setFromEvent(e); };
    window.addEventListener('mouseup', () => { dragging = false; });
    canvas.ontouchstart = (e) => { dragging = true; setFromEvent(e); e.preventDefault(); };
    canvas.ontouchmove = (e) => { if (dragging) { setFromEvent(e); e.preventDefault(); } };
    canvas.ontouchend = () => { dragging = false; };

    drawTrigo();
}

function drawTrigo() {
    const canvas = document.getElementById('trigoCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2, R = W * 0.38;

    ctx.clearRect(0, 0, W, H);

    // Axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    // Cercle
    ctx.strokeStyle = '#8459cf';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();

    const rad = trigoAngle * Math.PI / 180;
    const px = cx + R * Math.cos(rad);
    const py = cy - R * Math.sin(rad);

    // Projection cos (rouge) et sin (bleu)
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FF6B6B';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, cy); ctx.stroke();
    ctx.strokeStyle = '#4D96FF';
    ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke();

    // Rayon
    ctx.strokeStyle = '#8459cf';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();

    // Point
    ctx.fillStyle = '#f5bf78';
    ctx.beginPath(); ctx.arc(px, py, 6, 0, 2 * Math.PI); ctx.fill();

    updateTrigoPanel();
}

function updateTrigoPanel() {
    const rad = trigoAngle * Math.PI / 180;
    const rv = remarkableValues[trigoAngle];

    document.getElementById('val-angle-deg').textContent = `${trigoAngle}°`;
    document.getElementById('val-angle-rad').textContent = rv ? rv.rad : (rad).toFixed(2);
    document.getElementById('val-cos').textContent = rv ? rv.cos : Math.cos(rad).toFixed(3);
    document.getElementById('val-sin').textContent = rv ? rv.sin : Math.sin(rad).toFixed(3);

    if (rv) {
        document.getElementById('val-tan').textContent = rv.tan;
    } else {
        const c = Math.cos(rad);
        document.getElementById('val-tan').textContent =
            Math.abs(c) < 1e-6 ? "∞" : (Math.sin(rad) / c).toFixed(3);
    }
}

/* ---- 10.2 Repère interactif (points & vecteurs) ---- */
let rObjects = { points: [], vectors: [] };
let rState = { mode: 'point', vectorStart: null };

function initRepere() {
    const canvas = document.getElementById('repereCanvas');
    if (!canvas) return;

    canvas.onclick = (e) => onRepereClick(e, canvas);
    canvas.onmousemove = (e) => {
        const { x, y } = pixelToCoord(e, canvas);
        const disp = document.getElementById('mouse-coords');
        const tip = document.getElementById('mouse-tooltip');
        if (disp) disp.textContent = `x: ${x}, y: ${y}`;
        if (tip) tip.textContent = `x:${x}, y:${y}`;
    };

    setRepereMode('point');
    drawRepere();
}

function setRepereMode(mode) {
    rState.mode = mode;
    rState.vectorStart = null;
    ['point', 'vector', 'move', 'delete'].forEach(m => {
        const btn = document.getElementById('btn-mode-' + m);
        if (btn) btn.classList.toggle('active', m === mode);
    });
    updateInstructions();
}

function updateInstructions() {
    const el = document.getElementById('repere-instruction');
    if (!el) return;
    const texts = {
        point:  "<strong>Mode Point :</strong> clique sur la grille pour ajouter un point (précision 0,25).",
        vector: "<strong>Mode Vecteur :</strong> clique l'origine, puis l'extrémité.",
        move:   "<strong>Mode Déplacer :</strong> (à venir) repositionne les objets.",
        delete: "<strong>Mode Gomme :</strong> clique près d'un point pour le supprimer."
    };
    el.innerHTML = texts[rState.mode] || '';
}

function pixelToCoord(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    const unit = 40;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    let x = (px - cx) / unit;
    let y = (cy - py) / unit;
    // Précision 0,25
    x = Math.round(x * 4) / 4;
    y = Math.round(y * 4) / 4;
    return { x, y };
}

function onRepereClick(e, canvas) {
    const { x, y } = pixelToCoord(e, canvas);

    if (rState.mode === 'point') {
        rObjects.points.push({ x, y });
    } else if (rState.mode === 'vector') {
        if (!rState.vectorStart) {
            rState.vectorStart = { x, y };
        } else {
            rObjects.vectors.push({ from: rState.vectorStart, to: { x, y } });
            rState.vectorStart = null;
        }
    } else if (rState.mode === 'delete') {
        // Supprime le point le plus proche (< 0.4 unité)
        let best = -1, bestD = 0.4;
        rObjects.points.forEach((p, i) => {
            const d = Math.hypot(p.x - x, p.y - y);
            if (d < bestD) { bestD = d; best = i; }
        });
        if (best >= 0) rObjects.points.splice(best, 1);
    }

    drawRepere();
}

function drawRepere() {
    const canvas = document.getElementById('repereCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2, unit = 40;

    ctx.clearRect(0, 0, W, H);

    // Grille
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    for (let gx = cx % unit; gx < W; gx += unit) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = cy % unit; gy < H; gy += unit) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    // Vecteurs
    rObjects.vectors.forEach(v => {
        const x1 = cx + v.from.x * unit, y1 = cy - v.from.y * unit;
        const x2 = cx + v.to.x * unit, y2 = cy - v.to.y * unit;
        ctx.strokeStyle = '#f5bf78';
        ctx.fillStyle = '#f5bf78';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        // Flèche
        const ang = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - 10 * Math.cos(ang - 0.4), y2 - 10 * Math.sin(ang - 0.4));
        ctx.lineTo(x2 - 10 * Math.cos(ang + 0.4), y2 - 10 * Math.sin(ang + 0.4));
        ctx.closePath(); ctx.fill();
    });

    // Points
    rObjects.points.forEach(p => {
        const x = cx + p.x * unit, y = cy - p.y * unit;
        ctx.fillStyle = '#8459cf';
        ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#333';
        ctx.font = '12px Segoe UI';
        ctx.fillText(`(${p.x} ; ${p.y})`, x + 8, y - 8);
    });
}

function clearRepere() {
    if (rObjects.points.length > 0 || rObjects.vectors.length > 0) {
        if (!confirm("Effacer tous les points et vecteurs ?")) return;
    }
    rObjects = { points: [], vectors: [] };
    rState.vectorStart = null;
    updateInstructions();
    drawRepere();
}

/* ---- 10.3 Tableau périodique ---- */
const famClass = {
    "alkali": "fam-alkali", "alkaline": "fam-alkaline", "transition": "fam-transition",
    "post-trans": "fam-post-trans", "metalloid": "fam-metalloid", "nonmetal": "fam-nonmetal",
    "halogen": "fam-halogen", "noble": "fam-noble", "lanthanide": "fam-lanthanide", "actinide": "fam-actinide"
};
const famLabel = {
    "alkali": "Métal alcalin", "alkaline": "Métal alcalino-terreux", "transition": "Métal de transition",
    "post-trans": "Métal pauvre", "metalloid": "Métalloïde", "nonmetal": "Non-métal",
    "halogen": "Halogène", "noble": "Gaz noble", "lanthanide": "Lanthanide", "actinide": "Actinide"
};

function initTableau() {
    const grid = document.getElementById('periodic-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Grille 9 rangées × 18 colonnes ; on place chaque élément à sa position
    const map = {};
    fullElements.forEach(el => { map[`${el.row}-${el.col}`] = el; });

    for (let row = 1; row <= 9; row++) {
        for (let col = 1; col <= 18; col++) {
            const el = map[`${row}-${col}`];
            const cell = document.createElement('div');
            if (el) {
                cell.className = `element-card ${famClass[el.fam] || ''}`;
                cell.innerHTML = `
                    <div class="elem-header"><span class="element-number">${el.n}</span></div>
                    <div class="elem-body"><span class="element-symbol">${el.s}</span></div>
                    <div class="elem-footer"><span class="element-molar">${el.m}</span></div>`;
                cell.onmouseenter = () => showElementDetails(el);
                cell.onclick = () => showElementDetails(el);
            } else {
                cell.className = 'empty-cell';
            }
            grid.appendChild(cell);
        }
    }
}

function showElementDetails(el) {
    const box = document.getElementById('periodic-details');
    if (!box) return;
    box.innerHTML = `<strong style="font-size:1.3rem; color:var(--brand-school);">${el.n} — ${el.s} · ${el.name}</strong>
        <div style="margin-top:5px;">Masse molaire : <strong>${el.m} g/mol</strong> · ${famLabel[el.fam] || ''}</div>`;
}

/* ---- 10.4 Convertisseur d'unités ---- */
let convCategory = 'length';

function initConverter() {
    setConvCategory('length');
}

function setConvCategory(cat) {
    convCategory = cat;
    document.querySelectorAll('.conv-tab').forEach(t => {
        t.classList.toggle('active', t.getAttribute('onclick')?.includes(`'${cat}'`));
    });

    const cfg = convData[cat];
    const sel1 = document.getElementById('conv-unit-1');
    const sel2 = document.getElementById('conv-unit-2');
    sel1.innerHTML = ''; sel2.innerHTML = '';

    const units = Object.keys(cfg.units);
    units.forEach(u => {
        sel1.appendChild(new Option(u, u));
        sel2.appendChild(new Option(u, u));
    });
    // Deux unités différentes par défaut
    sel1.selectedIndex = 0;
    sel2.selectedIndex = Math.min(1, units.length - 1);

    document.getElementById('conv-input-1').value = 1;
    calculateConv(1);
}

function calculateConv(source) {
    const cfg = convData[convCategory];
    const u1 = document.getElementById('conv-unit-1').value;
    const u2 = document.getElementById('conv-unit-2').value;
    const in1 = document.getElementById('conv-input-1');
    const in2 = document.getElementById('conv-input-2');

    if (source === 1) {
        const base = (parseFloat(in1.value) || 0) * cfg.units[u1];
        in2.value = +(base / cfg.units[u2]).toPrecision(6);
    } else {
        const base = (parseFloat(in2.value) || 0) * cfg.units[u2];
        in1.value = +(base / cfg.units[u1]).toPrecision(6);
    }

    const formula = document.getElementById('conv-formula');
    if (formula) {
        const ratio = +(cfg.units[u1] / cfg.units[u2]).toPrecision(6);
        formula.textContent = `1 ${u1} = ${ratio} ${u2}`;
    }
}

/* ---- 10.5 Traceur de fonctions ---- */
let graphZoom = 40;

function initGraph() {
    graphZoom = 40;
    const slider = document.getElementById('zoom-slider');
    if (slider) slider.value = 40;
    drawGraph();
}

function updateZoom(val) {
    graphZoom = parseInt(val, 10);
    document.getElementById('zoom-val').textContent = val;
    drawGraph();
}

// Évalue f(x) de façon sécurisée (sans eval brut)
function makeFunction(expr) {
    let js = expr
        .replace(/\^/g, '**')
        .replace(/(\d)(x)/g, '$1*$2')
        .replace(/\)\(/g, ')*(');
    const allowed = ['sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'exp', 'PI', 'E', 'pow', 'min', 'max'];
    allowed.forEach(fn => {
        js = js.replace(new RegExp('\\b' + fn + '\\b', 'g'), 'Math.' + fn);
    });
    js = js.replace(/Math\.Math\./g, 'Math.');
    try {
        // eslint-disable-next-line no-new-func
        return new Function('x', `return ${js};`);
    } catch (e) {
        return null;
    }
}

function drawGraph() {
    const canvas = document.getElementById('graphCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const unit = graphZoom;

    ctx.clearRect(0, 0, W, H);

    // Grille
    ctx.strokeStyle = '#eee';
    for (let gx = cx % unit; gx < W; gx += unit) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (let gy = cy % unit; gy < H; gy += unit) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

    // Axes
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    const expr = document.getElementById('func-input').value.trim();
    const f = makeFunction(expr);
    if (!f) { showToast("Expression invalide.", "error"); return; }

    ctx.strokeStyle = '#8459cf';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let started = false;
    for (let px = 0; px <= W; px++) {
        const x = (px - cx) / unit;
        let y;
        try { y = f(x); } catch (e) { y = NaN; }
        if (!isFinite(y)) { started = false; continue; }
        const py = cy - y * unit;
        if (py < -H || py > 2 * H) { started = false; continue; }
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
}

/* ---- 10.6 Calculateur de masse molaire ---- */
let currentMolString = "";

function addMolChar(ch) {
    currentMolString += ch;
    refreshMolDisplay();
}

// Vraie suppression du dernier élément (gère les atomes à 2 lettres)
function deleteMolChar() {
    if (currentMolString.length === 0) return;
    const twoCharAtoms = ['Cl', 'Na', 'Ca', 'Cu', 'Fe', 'Mg', 'Al'];
    const lastTwo = currentMolString.slice(-2);
    if (twoCharAtoms.includes(lastTwo)) {
        currentMolString = currentMolString.slice(0, -2);
    } else {
        currentMolString = currentMolString.slice(0, -1);
    }
    refreshMolDisplay();
}

// Tout effacer (bouton séparé)
function clearMolAll() {
    currentMolString = "";
    refreshMolDisplay();
    const box = document.getElementById('mol-result-box');
    if (box) box.style.display = 'none';
}

function refreshMolDisplay() {
    const display = document.getElementById('mol-display');
    const placeholder = document.getElementById('mol-placeholder');
    if (!display) return;
    display.innerHTML = '';

    // Les chiffres qui suivent une lettre ou une parenthèse s'affichent en indice
    let i = 0;
    while (i < currentMolString.length) {
        const c = currentMolString[i];
        if (!isNaN(c) && c !== ' ' && i > 0 && /[A-Za-z\)]/.test(currentMolString[i - 1])) {
            display.innerHTML += `<sub>${c}</sub>`;
        } else {
            display.innerHTML += c;
        }
        i++;
    }
    if (placeholder) placeholder.style.display = currentMolString.length === 0 ? 'block' : 'none';
}

// Parse une formule chimique (avec parenthèses) et calcule la masse molaire
function calculateComplexMass() {
    const box = document.getElementById('mol-result-box');
    if (!box) return;

    if (currentMolString.trim() === "") {
        showToast("Saisis d'abord une molécule.", "error");
        return;
    }

    let counts;
    try {
        counts = parseFormula(currentMolString);
    } catch (e) {
        box.style.display = 'block';
        box.innerHTML = `<p style="color:var(--accent-red);">Formule invalide. Vérifie les parenthèses.</p>`;
        return;
    }

    let total = 0;
    let stepsHtml = '';
    let unknown = [];

    for (const atom in counts) {
        const mass = atomMasses[atom];
        if (mass == null) { unknown.push(atom); continue; }
        const sub = mass * counts[atom];
        total += sub;
        stepsHtml += `<div class="step-line">${atom} : ${mass} × ${counts[atom]} = ${sub.toFixed(3)} g/mol</div>`;
    }

    box.style.display = 'block';
    if (unknown.length > 0) {
        box.innerHTML = `<p style="color:var(--accent-red);">Atome(s) inconnu(s) : ${unknown.join(', ')}.</p>
            <p style="font-size:0.85rem; color:#888;">Atomes gérés : ${Object.keys(atomMasses).join(', ')}.</p>`;
        return;
    }

    box.innerHTML = stepsHtml + `<div class="step-total">M = ${total.toFixed(2)} g/mol</div>`;
}

// Compte les atomes d'une formule, gère les parenthèses imbriquées
function parseFormula(formula) {
    let i = 0;

    function parseGroup() {
        const counts = {};
        while (i < formula.length) {
            const c = formula[i];
            if (c === '(') {
                i++; // saute '('
                const inner = parseGroup();
                if (formula[i] !== ')') throw new Error("Parenthèse non fermée");
                i++; // saute ')'
                const mult = readNumber();
                for (const a in inner) counts[a] = (counts[a] || 0) + inner[a] * mult;
            } else if (c === ')') {
                break;
            } else if (/[A-Z]/.test(c)) {
                let atom = c; i++;
                if (i < formula.length && /[a-z]/.test(formula[i])) { atom += formula[i]; i++; }
                const n = readNumber();
                counts[atom] = (counts[atom] || 0) + n;
            } else {
                i++; // ignore tout caractère inattendu
            }
        }
        return counts;
    }

    function readNumber() {
        let num = '';
        while (i < formula.length && /[0-9]/.test(formula[i])) { num += formula[i]; i++; }
        return num === '' ? 1 : parseInt(num, 10);
    }

    const result = parseGroup();
    if (Object.keys(result).length === 0) throw new Error("Formule vide");
    return result;
}

/* =============================================================================
   OUTIL 10.7 : RÉSOLVEUR D'ÉQUATIONS PAS À PAS
   ============================================================================= */
// Base de données locale pour l'outil (niveau progressif)
const eqDataList = [
    { lhs: { x: 1, c: 7 }, rhs: { x: 0, c: 7 } },        // x + 7 = 7
    { lhs: { x: 1, c: -2 }, rhs: { x: 0, c: 5 } },       // x - 2 = 5
    { lhs: { x: 3, c: -6 }, rhs: { x: 0, c: -18 } },     // 3x - 6 = -18
    { lhs: { x: 2, c: 4 }, rhs: { x: 1, c: -2 } },       // 2x + 4 = x - 2
    { lhs: { x: 5, c: -3 }, rhs: { x: 2, c: 9 } }        // 5x - 3 = 2x + 9
];

let currentEqIndex = 0;
let eqCurrentState = null;
let eqHistory = [];
let eqSelectedOp = null;

function initEquation() {
    currentEqIndex = 0;
    loadEquation(currentEqIndex);
}

function loadEquation(index) {
    if (index >= eqDataList.length) {
        showToast("Bravo, tu as terminé toutes les équations de la série !", "success");
        navigateTo('view-outils');
        return;
    }
    
    // Clonage profond pour ne pas altérer la base de données
    eqCurrentState = JSON.parse(JSON.stringify(eqDataList[index]));
    eqHistory = [];
    eqSelectedOp = null;
    
    document.getElementById('eq-progress').textContent = `${index + 1} / ${eqDataList.length}`;
    document.getElementById('eq-input-val').value = '';
    document.getElementById('eq-error-msg').textContent = '';
    document.querySelectorAll('.eq-op-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById('eq-success-container').style.display = 'none';
    document.getElementById('eq-action-container').style.display = 'block';

    renderEquationUI();
}

function nextEquation() {
    currentEqIndex++;
    loadEquation(currentEqIndex);
}

function setEqOp(op) {
    eqSelectedOp = op;
    document.querySelectorAll('.eq-op-btn').forEach(btn => {
        const text = btn.textContent.trim();
        const isActive = (text === op) || (text === '×' && op === '*') || (text === '÷' && op === '/') || (text === '−' && op === '-');
        btn.classList.toggle('active', isActive);
    });
    document.getElementById('eq-error-msg').textContent = '';
}

// Parseur intelligent pour autoriser les saisies du type "7", "x", "-2x"
function parseEqInput(str) {
    str = str.replace(/\s+/g, '').toLowerCase();
    if (str === '') return null;
    let val = { x: 0, c: 0 };
    
    if (str.includes('x')) {
        let coeff = str.replace('x', '');
        if (coeff === '' || coeff === '+') val.x = 1;
        else if (coeff === '-') val.x = -1;
        else val.x = parseFloat(coeff);
    } else {
        val.c = parseFloat(str);
    }
    
    if (isNaN(val.x) || isNaN(val.c)) return null;
    return val;
}

function applyEqOp() {
    if (!eqSelectedOp) {
        document.getElementById('eq-error-msg').textContent = "Sélectionne d'abord une opération (+, -, ×, ÷).";
        return;
    }
    const rawVal = document.getElementById('eq-input-val').value;
    const val = parseEqInput(rawVal);

    if (!val) {
        document.getElementById('eq-error-msg').textContent = "Saisie invalide. Essaie par exemple '7' ou '2x'.";
        return;
    }

    // Sécurités mathématiques simples
    if ((eqSelectedOp === '*' || eqSelectedOp === '/') && val.x !== 0) {
        document.getElementById('eq-error-msg').textContent = "Pour l'instant, limite-toi à multiplier/diviser par des nombres.";
        return;
    }
    if (eqSelectedOp === '/' && val.c === 0) {
        document.getElementById('eq-error-msg').textContent = "La division par zéro est impossible !";
        return;
    }

    // Sauvegarde de l'état avant transformation
    const beforeState = JSON.parse(JSON.stringify(eqCurrentState));

    // Application de la transformation algébrique
    if (eqSelectedOp === '+') {
        eqCurrentState.lhs.x += val.x; eqCurrentState.lhs.c += val.c;
        eqCurrentState.rhs.x += val.x; eqCurrentState.rhs.c += val.c;
    } else if (eqSelectedOp === '-') {
        eqCurrentState.lhs.x -= val.x; eqCurrentState.lhs.c -= val.c;
        eqCurrentState.rhs.x -= val.x; eqCurrentState.rhs.c -= val.c;
    } else if (eqSelectedOp === '*') {
        eqCurrentState.lhs.x *= val.c; eqCurrentState.lhs.c *= val.c;
        eqCurrentState.rhs.x *= val.c; eqCurrentState.rhs.c *= val.c;
    } else if (eqSelectedOp === '/') {
        eqCurrentState.lhs.x /= val.c; eqCurrentState.lhs.c /= val.c;
        eqCurrentState.rhs.x /= val.c; eqCurrentState.rhs.c /= val.c;
    }

    eqHistory.push({
        before: beforeState,
        op: eqSelectedOp,
        val: val,
        rawVal: rawVal,
        after: JSON.parse(JSON.stringify(eqCurrentState))
    });

    // Reset du panel d'action
    document.getElementById('eq-input-val').value = '';
    eqSelectedOp = null;
    document.querySelectorAll('.eq-op-btn').forEach(b => b.classList.remove('active'));

    renderEquationUI();
}

// Transforme un objet {x, c} en string mathématique lisible
function formatEqSide(term) {
    let s = '';
    if (term.x !== 0) {
        if (term.x === 1) s += 'x';
        else if (term.x === -1) s += '-x';
        else s += term.x + 'x';
    }
    if (term.c !== 0) {
        if (s !== '') {
            s += (term.c > 0) ? ' + ' + term.c : ' - ' + Math.abs(term.c);
        } else {
            s += term.c;
        }
    }
    if (s === '') s = '0';
    return s;
}

// Applique intelligemment des parenthèses comme sur ta maquette (Image 2)
function wrapParen(termStr) {
    if (/^[0-9]+x?$/.test(termStr) || termStr === 'x') {
        return termStr; // Pas de parenthèses pour "3x" ou "5"
    }
    return `\\left(${termStr}\\right)`;
}

// Formate l'opération intermédiaire en LaTeX avec la couleur Schoolizy (rouge/orange)
function formatEqOp(op, rawVal) {
    const color = '#e74c3c';
    let texOp = op;
    if (op === '*') texOp = '\\times';
    if (op === '/') texOp = '\\div';
    return `\\color{${color}}{${texOp} ${rawVal}}`;
}

// Génère la phrase explicative dynamique
function getOpText(op, rawVal) {
    if (op === '+') return `On ajoute ${rawVal} à chaque membre de l'équation et on obtient une équation équivalente.`;
    if (op === '-') return `On soustrait ${rawVal} à chaque membre de l'équation et on obtient une équation équivalente.`;
    if (op === '*') return `On multiplie chaque membre de l'équation par ${rawVal} et on obtient une équation équivalente.`;
    if (op === '/') return `On divise chaque membre de l'équation par ${rawVal} et on obtient une équation équivalente.`;
}

function renderEquationUI() {
    const histContainer = document.getElementById('eq-history-container');
    histContainer.innerHTML = '';

    // 1. Rendu de l'historique (Les étapes successives de l'image 2)
    eqHistory.forEach(step => {
        const div = document.createElement('div');
        div.className = 'eq-history-step';

        const lhsStr = formatEqSide(step.before.lhs);
        const rhsStr = formatEqSide(step.before.rhs);
        const opStr = formatEqOp(step.op, step.rawVal);

        const lhsFmt = wrapParen(lhsStr);
        const rhsFmt = wrapParen(rhsStr);

        const mathStr = `$$ ${lhsFmt} ${opStr} = ${rhsFmt} ${opStr} $$`;

        div.innerHTML = `
            <div class="eq-step-text">${getOpText(step.op, step.rawVal)}</div>
            <div class="eq-step-math">${mathStr}</div>
        `;
        histContainer.appendChild(div);
    });

    // 2. Rendu de l'état courant de l'équation
    const currentMath = `$$ ${formatEqSide(eqCurrentState.lhs)} = ${formatEqSide(eqCurrentState.rhs)} $$`;
    document.getElementById('eq-current-display').innerHTML = currentMath;

    // 3. Vérification de la condition de victoire ( x = Constante )
    if (eqCurrentState.lhs.x === 1 && eqCurrentState.lhs.c === 0 && eqCurrentState.rhs.x === 0) {
        document.getElementById('eq-action-container').style.display = 'none';
        const successBox = document.getElementById('eq-success-container');
        successBox.style.display = 'block';
        document.getElementById('eq-solution-text').innerHTML = `La solution de l'équation est <strong>${eqCurrentState.rhs.c}</strong>.`;
    }

    typesetMath(); // Demande à MathJax de compiler le nouveau LaTeX
}

/* =============================================================================
   11. ANNALES (PDF)
   ============================================================================= */
let allAnnales = [];

async function initBiblio() {
    showLoading('biblio-grid', 'Chargement des annales...');
    const { data, error } = await sb
        .from('annales')
        .select('subject, year, title, chapters, file_sujet, file_corrige')
        .order('year', { ascending: false });

    const grid = document.getElementById('biblio-grid');
    if (error || !data || data.length === 0) {
        grid.innerHTML = '';
        document.getElementById('no-result').style.display = 'block';
        return;
    }
    allAnnales = data;
    renderAnnales(allAnnales);
}

function renderAnnales(list) {
    const grid = document.getElementById('biblio-grid');
    const noResult = document.getElementById('no-result');
    grid.innerHTML = '';

    if (list.length === 0) {
        noResult.style.display = 'block';
        return;
    }
    noResult.style.display = 'none';

    list.forEach(a => {
        const subjClass = (a.subject || '').toLowerCase().includes('phys') ? 'physique'
            : (a.subject || '').toLowerCase().includes('svt') ? 'svt' : 'maths';
        const chapters = Array.isArray(a.chapters) ? a.chapters : [];
        const tagsHtml = chapters.map(c => `<span class="tag">${c}</span>`).join('');

        const card = document.createElement('div');
        card.className = `annale-card ${subjClass}`;
        card.innerHTML = `
            <div class="annale-header">
                <span class="annale-subject">${a.subject || ''}</span>
                <span class="annale-year">${a.year || ''}</span>
            </div>
            <div class="annale-title">${a.title || 'Sujet'}</div>
            <div class="annale-tags">${tagsHtml}</div>
            <div class="annale-actions">
                ${a.file_sujet ? `<button class="btn-pdf btn-sujet" onclick="openPdf('${a.file_sujet}','${(a.title || '').replace(/'/g, "")} — Sujet')">📄 Sujet</button>` : ''}
                ${a.file_corrige ? `<button class="btn-pdf btn-corrige" onclick="openPdf('${a.file_corrige}','${(a.title || '').replace(/'/g, "")} — Corrigé')">✅ Corrigé</button>` : ''}
            </div>`;
        grid.appendChild(card);
    });
}

function filterAnnales() {
    const q = (document.getElementById('biblio-search').value || '').toLowerCase().trim();
    const year = document.getElementById('filter-year').value;
    const subject = document.getElementById('filter-subject').value;

    const filtered = allAnnales.filter(a => {
        const matchYear = (year === 'all') || String(a.year) === year;
        const matchSubject = (subject === 'all') || (a.subject || '').toLowerCase().includes(subject.toLowerCase());
        const haystack = `${a.title || ''} ${(Array.isArray(a.chapters) ? a.chapters.join(' ') : '')} ${a.subject || ''}`.toLowerCase();
        const matchSearch = q === '' || haystack.includes(q);
        return matchYear && matchSubject && matchSearch;
    });

    renderAnnales(filtered);
}

function openPdf(fileName, title) {
    const modal = document.getElementById('pdf-modal');
    const viewer = document.getElementById('pdf-viewer');
    const titleEl = document.getElementById('pdf-title');
    // URL absolue ou nom de fichier dans le bucket Storage
    const url = /^https?:\/\//.test(fileName) ? fileName : (STORAGE_ANNALES + fileName);
    viewer.src = url;
    if (titleEl) titleEl.textContent = title || "Document";
    modal.style.display = 'flex';
}

function closePdfModal() {
    const modal = document.getElementById('pdf-modal');
    const viewer = document.getElementById('pdf-viewer');
    modal.style.display = 'none';
    viewer.src = '';
}

/* =============================================================================
   12. POMODORO & CALCULATRICE FLOTTANTE
   ============================================================================= */
const pomo = {
    duration: 25 * 60,
    remaining: 25 * 60,
    timer: null,
    running: false
};

function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
}

function updatePomoDisplay() {
    const el = document.getElementById('pomo-timer');
    if (el) el.textContent = formatTime(pomo.remaining);
}

function togglePomodoro() {
    const wrapper = document.getElementById('pomo-container');
    const btnIcon = document.querySelector('#pomo-btn svg path, #pomo-btn svg');

    if (pomo.running) {
        // Pause
        clearInterval(pomo.timer);
        pomo.timer = null;
        pomo.running = false;
        wrapper?.classList.remove('running');
    } else {
        pomo.running = true;
        wrapper?.classList.add('running');
        pomo.timer = setInterval(() => {
            pomo.remaining--;
            updatePomoDisplay();
            if (pomo.remaining <= 0) {
                clearInterval(pomo.timer);
                pomo.timer = null;
                pomo.running = false;
                wrapper?.classList.remove('running');
                pomo.remaining = pomo.duration;
                updatePomoDisplay();
                notifyPomoEnd();
            }
        }, 1000);
    }
}

function resetPomodoro() {
    clearInterval(pomo.timer);
    pomo.timer = null;
    pomo.running = false;
    pomo.remaining = pomo.duration;
    document.getElementById('pomo-container')?.classList.remove('running');
    updatePomoDisplay();
}

// Fin de Pomodoro : notification douce (pas d'alert bloquante)
function notifyPomoEnd() {
    try {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("🍅 Schoolizy", { body: "Pause méritée !" });
        }
    } catch (e) { /* ignore */ }
    showToast("🔔 C'est la pause ! Bravo 🍅", "success", 5000);
}

function toggleFloatingCalc() {
    const popup = document.getElementById('calc-popup');
    if (!popup) return;
    popup.style.display = (popup.style.display === 'flex') ? 'none' : 'flex';
}

/* =============================================================================
   13. INITIALISATION
   ============================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    updatePomoDisplay();
    navigateTo('view-home');

    // Navigation clavier du quiz (enregistrée une seule fois)
    document.addEventListener('keydown', handleQuizKeyboard);

    // Échap ferme la modale PDF
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePdfModal();
    });

    // Ferme les résultats de recherche au clic extérieur
    document.addEventListener('click', (e) => {
        const wrapper = document.querySelector('.search-wrapper');
        const box = document.getElementById('search-results');
        if (wrapper && box && !wrapper.contains(e.target)) box.style.display = 'none';
    });

    // Demande (en douceur) l'autorisation de notification pour le Pomodoro
    try {
        if ("Notification" in window && Notification.permission === "default") {
            // ne pas spammer : on demandera au premier lancement de Pomodoro
        }
    } catch (e) { /* ignore */ }
});

/* Exposition globale (les attributs onclick du HTML appellent ces fonctions) */
Object.assign(window, {
    navigateTo, performSearch, toggleTheme,
    openLevelPage, chooseMode, backFromChapters,
    toggleMultiSelectionMode, prepareMultiQuiz,
    selectOption, changeSlide, finishQuiz, openQuiz, launchSurvieLogic,
    toggleCorrection,
    checkReciteAnswer, goToNextQuestion, forceValidAnswer, startSpeedRun,
    initTrigo, initRepere, setRepereMode, clearRepere,
    initTableau, initConverter, setConvCategory, calculateConv,
    initGraph, drawGraph, updateZoom,
    addMolChar, deleteMolChar, clearMolAll, calculateComplexMass,
    initBiblio, filterAnnales, openPdf, closePdfModal,
    togglePomodoro, resetPomodoro, toggleFloatingCalc,
    state
});
