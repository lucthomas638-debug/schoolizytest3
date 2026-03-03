/* --- DONNÉES DE BASE --- */
const levelsData = {
    lycee: [
        { name: "Seconde", code: "seconde" },
        { name: "Première", code: "premiere" },
        { name: "Terminale", code: "terminale" }
    ],
    college: [{ name: "3ème", code: "3eme" }]
};

const subjectsData = {
    seconde: ["Maths", "Physique-Chimie"],
    premiere: ["Maths", "Physique-Chimie"],
    terminale: ["Maths", "Physique-Chimie"]
};

let state = { currentLevelGroup: '', currentClassCode: '', currentSubject: '', currentMode: 'lesson' };
let currentCourseData = null;

/* --- LES FONCTIONS QUI FONT TOUT TOURNER --- */

function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(viewId);
    if(target) target.classList.add('active');
}

function openLevelPage(levelKey) {
    state.currentLevelGroup = levelKey;
    const grid = document.getElementById('classes-grid');
    grid.innerHTML = '';
    levelsData[levelKey].forEach(cls => {
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
    const grid = document.getElementById('subjects-grid');
    grid.innerHTML = '';
    const subjects = subjectsData[classCode] || [];
    subjects.forEach(subj => {
        const card = document.createElement('div');
        card.className = 'subject-card';
        card.innerHTML = `<h3>${subj}</h3>`;
        card.onclick = () => checkContentAndNavigate(subj);
        grid.appendChild(card);
    });
    navigateTo('view-subjects');
}

async function checkContentAndNavigate(subject) {
    state.currentSubject = subject;
    // On va chercher le fichier dans le dossier /data/
    const fileName = `${subject.toLowerCase()}_${state.currentClassCode.toLowerCase()}`;
    try {
        const response = await fetch(`./data/${fileName}.json`);
        currentCourseData = await response.json();
        openChaptersPage();
    } catch (e) {
        alert("Contenu non disponible pour " + subject);
    }
}

function openChaptersPage() {
    const grid = document.getElementById('chapters-grid');
    grid.innerHTML = '';
    currentCourseData.chapters.forEach(chap => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${chap.title}</h3>`;
        card.onclick = () => displayLesson(chap.id);
        grid.appendChild(card);
    });
    navigateTo('view-chapters');
}

function displayLesson(id) {
    const content = currentCourseData.lessons[id];
    document.getElementById('lesson-container').innerHTML = content;
    if(window.MathJax) MathJax.typesetPromise();
    navigateTo('view-lesson');
}
/* --- FONCTIONS DE RETOUR --- */

function goBackToClasses() {
    // Utilise le groupe enregistré (lycee ou college) pour réafficher les classes
    openLevelPage(state.currentLevelGroup);
}

function goBackToSubjects() {
    // Utilise le code classe enregistré (seconde, premiere...) pour réafficher les matières
    // On trouve le nom propre dans levelsData pour le titre
    const levels = levelsData[state.currentLevelGroup];
    const currentClass = levels.find(c => c.code === state.currentClassCode);
    openSubjectsPage(state.currentClassCode, currentClass ? currentClass.name : "");
}
