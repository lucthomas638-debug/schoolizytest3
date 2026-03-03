/* --- CONFIGURATION SUPABASE --- */
// Remplace bien par TES vraies infos trouvées dans Supabase (Settings > API)
const supabaseUrl = 'https://kuuxhzyfnqrdoewfoiyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1dXhoenlmbnFyZG9ld2ZvaXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjA2NzQsImV4cCI6MjA4ODEzNjY3NH0.ar-162v-HZ91M80xpDfE_mavK6xyE1Ciu7bZh-PNhHM';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

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

// --- MODIFICATION : On récupère les chapitres depuis Supabase ---
async function checkContentAndNavigate(subject) {
    state.currentSubject = subject;
    
    // On demande à Supabase tous les chapitres pour cette matière et cette classe
    const { data, error } = await supabase
        .from('lessons')
        .select('chapter_number, content') // On prend le numéro et le texte pour extraire le titre
        .eq('class_id', state.currentClassCode)
        .eq('subject_id', subject.toLowerCase())
        .order('chapter_number', { ascending: true });

    if (error || !data || data.length === 0) {
        alert("Contenu non disponible pour " + subject + " en " + state.currentClassCode);
        return;
    }

    openChaptersPage(data);
}

function openChaptersPage(chaptersList) {
    const grid = document.getElementById('chapters-grid');
    grid.innerHTML = '';
    
    chaptersList.forEach(lesson => {
        // Petite astuce pour extraire le titre du <h1> de ton HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = lesson.content;
        const chapterTitle = tempDiv.querySelector('h1') ? tempDiv.querySelector('h1').innerText : "Chapitre " + lesson.chapter_number;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${chapterTitle}</h3>`;
        // On passe le chapter_number à la fonction display
        card.onclick = () => displayLesson(lesson.chapter_number); 
        grid.appendChild(card);
    });
    navigateTo('view-chapters');
}

// --- MODIFICATION : On charge le HTML depuis la colonne 'content' ---
async function displayLesson(chapterNum) {
    const { data, error } = await supabase
        .from('lessons')
        .select('content')
        .eq('chapter_number', chapterNum)
        .eq('class_id', state.currentClassCode)
        .eq('subject_id', state.currentSubject.toLowerCase())
        .single();

    if (error || !data) {
        alert("Erreur lors du chargement de la leçon.");
        return;
    }

    document.getElementById('lesson-container').innerHTML = data.content;
    
    // On remonte en haut de page
    window.scrollTo(0,0);
    
    // On demande à MathJax de retraiter les formules
    if(window.MathJax) MathJax.typesetPromise();
    
    navigateTo('view-lesson');
}

/* --- FONCTIONS DE RETOUR --- */

function goBackToClasses() {
    openLevelPage(state.currentLevelGroup);
}

function goBackToSubjects() {
    const levels = levelsData[state.currentLevelGroup];
    const currentClass = levels.find(c => c.code === state.currentClassCode);
    openSubjectsPage(state.currentClassCode, currentClass ? currentClass.name : "");
}
