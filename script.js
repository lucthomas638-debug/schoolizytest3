/* --- CONFIGURATION SUPABASE --- */
const supabaseUrl = 'https://kuuxhzyfnqrdoewfoiyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1dXhoenlmbnFyZG9ld2ZvaXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjA2NzQsImV4cCI6MjA4ODEzNjY3NH0.ar-162v-HZ91M80xpDfE_mavK6xyE1Ciu7bZh-PNhHM';

// On utilise 'sb' pour éviter le conflit avec la bibliothèque 'supabase'
const sb = supabase.createClient(supabaseUrl, supabaseKey);

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

/* --- LES FONCTIONS DE NAVIGATION --- */

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

/* --- RÉCUPÉRATION DES DONNÉES SUPABASE --- */

async function checkContentAndNavigate(subject) {
    state.currentSubject = subject;
    
    // On appelle la table 'lessons' via notre client 'sb'
    const { data, error } = await sb
        .from('lessons')
        .select('chapter_number, content')
        .eq('class_id', state.currentClassCode)
        .eq('subject_id', subject.toLowerCase())
        .order('chapter_number', { ascending: true });

    // --- AJOUTE LES LIGNES ICI (Ligne 75 environ) ---
    console.log("DEBUG - Sujet cherché :", subject.toLowerCase());
    console.log("DEBUG - Classe cherchée :", state.currentClassCode);
    console.log("DEBUG - Réponse Supabase :", data);
    console.log("DEBUG - Erreur éventuelle :", error);
    // ------------------------------------------------

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
        // On extrait le titre du <h1> contenu dans le HTML pour l'affichage du bouton
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = lesson.content;
        const chapterTitle = tempDiv.querySelector('h1') ? tempDiv.querySelector('h1').innerText : "Chapitre " + lesson.chapter_number;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${chapterTitle}</h3>`;
        card.onclick = () => displayLesson(lesson.chapter_number); 
        grid.appendChild(card);
    });
    navigateTo('view-chapters');
}

async function displayLesson(chapterNum) {
    const { data, error } = await sb
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

    // Injection du HTML de Supabase dans le container
    document.getElementById('lesson-container').innerHTML = data.content;
    
    window.scrollTo(0,0);
    
    // Relance le rendu des formules MathJax
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
