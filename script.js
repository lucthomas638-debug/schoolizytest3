/* =============================================================================
   1. CONFIGURATION & ÉTAT INITIAL
   ============================================================================= */
const supabaseUrl = 'https://kuuxhzyfnqrdoewfoiyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1dXhoenlmbnFyZG9ld2ZvaXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjA2NzQsImV4cCI6MjA4ODEzNjY3NH0.ar-162v-HZ91M80xpDfE_mavK6xyE1Ciu7bZh-PNhHM';

const sb = supabase.createClient(supabaseUrl, supabaseKey);

const levelsData = {
    lycee: [{ name: "Seconde", code: "seconde" }, { name: "Première", code: "premiere" }, { name: "Terminale", code: "terminale" }],
    college: [{ name: "3ème", code: "3eme" }],
    primaire: [{ name: "CP", code: "cp" }, { name: "CE1", code: "ce1" }, { name: "CchoosE2", code: "ce2" }, { name: "CM1", code: "cm1" }, { name: "CM2", code: "cm2" }]
};

const subjectsData = {
    seconde: ["Maths", "Physique-Chimie"],
    premiere: ["Maths", "Physique-Chimie"],
    terminale: ["Maths", "Physique-Chimie"]
};

let state = { currentLevelGroup: '', currentClassCode: '', currentSubject: '', currentMode: 'lesson' };

// AJOUTE ÇA ICI POUR QUE TOUT LE FICHIER LES VOIE
let quizData = []; 
let currentStep = 0; 
let userAnswers = {};
let isTimeAttack = false;
let quizTimer = null;
let timeLeft = 60;
let allQuestionsBackup = []; // Variable à remplir quand tu charges le chapitre
let currentReciteQuestion = null;
let reciteChapterData = [];
let reciteIndex = 0;
let isSpeedRun = false;
let reciteTimer = null;
let currentScore = 0; // Ajoute celle-ci si elle manque
let speedrunHistory = [];
let currentChapterForReset = null;

/* =============================================================================
   2. SYSTÈME DE NAVIGATION & VISIBILITÉ CALCULATRICE
   ============================================================================= */

function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(viewId);
    
    // LISTE DES VUES QUI DOIVENT CACHER LE BOUTON
    const viewsToHide = ['view-home', 'view-apropos', 'view-outils', 'view-level-classes', 'view-subjects'];
    
    if (viewsToHide.includes(viewId)) {
        state.currentSubject = ''; // On vide le sujet pour forcer la disparition
    }

    if (target) {
        target.classList.add('active');
        const main = document.querySelector('main');
        if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // On lance la vérification du bouton après chaque changement de vue
    updateFloatingCalcVisibility();
}

function updateFloatingCalcVisibility() {
    const btn = document.getElementById('floating-calc-btn');
    const popup = document.getElementById('calc-popup');
    if (!btn) return;
    
    const subjectsWithCalc = ['maths', 'physique-chimie', 'physique'];
    const currentSub = state.currentSubject ? state.currentSubject.toLowerCase().trim() : '';
    
    // Si on est dans une matière scientifique ET qu'on n'est pas sur l'accueil
    if (currentSub && subjectsWithCalc.includes(currentSub)) {
        btn.style.display = 'flex';
    } else {
        btn.style.display = 'none';
        if (popup) popup.style.display = 'none'; 
    }
}

function toggleFloatingCalc() {
    const popup = document.getElementById('calc-popup');
    if (!popup) return;
    popup.style.display = (popup.style.display === 'none' || popup.style.display === '') ? 'flex' : 'none';
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
   3. GESTION SUPABASE & MODES (COURS, QUIZ, EXOS)
   ============================================================================= */

// Étape 1 : Quand on clique sur une matière (ex: Maths)
async function checkContentAndNavigate(subject) {
    state.currentSubject = subject;
    // On affiche d'abord le choix du mode (Cours, Quiz, etc.)
    navigateTo('view-mode');
}

// Étape 2 : Quand on choisit un mode (ex: Quiz)
function chooseMode(mode) {
    if (!currentUser) {
        alert("Veuillez vous connecter pour accéder à ces fonctionnalités.");
        return; // On arrête tout ici, l'utilisateur reste sur la vue actuelle
    }
    state.currentMode = mode;
    loadChapters();
}

// Étape 3 : Charger la liste des chapitres depuis Supabase
async function loadChapters() {
   
    const { data, error } = await sb
        .from('lessons')
        .select('chapter_number, content')
        .eq('class_id', state.currentClassCode)
        .eq('subject_id', state.currentSubject.toLowerCase())
        .order('chapter_number', { ascending: true });

    if (error || !data || data.length === 0) {
        return alert("Contenu bientôt disponible pour cette matière !");
    }
    
    renderChaptersGrid(data);
}

// Étape 4 : Afficher les tuiles des chapitres
function renderChaptersGrid(chaptersList) {
    const grid = document.getElementById('chapters-grid');
    const quizBar = document.getElementById('quiz-options-bar');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (quizBar) {
        quizBar.style.display = (state.currentMode === 'quiz') ? 'block' : 'none';
        const toggleMulti = document.getElementById('toggle-multi-mode');
        if(toggleMulti) toggleMulti.checked = false;
    }

    chaptersList.forEach(l => {
        const temp = document.createElement('div'); 
        temp.innerHTML = l.content;
        const title = temp.querySelector('h1')?.innerText || "Chapitre " + l.chapter_number;
        
        const card = document.createElement('div');
        card.className = 'card chapter-card-interactive';
        card.dataset.chapterId = l.chapter_number;

        card.innerHTML = `
            <div class="chapter-badge-selection"></div>
            <p style="color:#aaa; font-size:0.75rem; font-weight:700; text-transform:uppercase; margin:0 0 8px 0; letter-spacing:1px;">
                Chapitre ${l.chapter_number}
            </p>
            <h3 style="margin:0; font-size:1.1rem; line-height:1.3; color:var(--text-dark);">
                ${title}
            </h3>
        `;
        
        card.onclick = () => {
            const toggleBtn = document.getElementById('toggle-multi-mode');
            const multiActive = toggleBtn ? toggleBtn.checked : false;

            if (multiActive && state.currentMode === 'quiz') {
                card.classList.toggle('selected');
            } else {
                // Lancement selon le mode
                if (state.currentMode === 'quiz') openQuiz(l.chapter_number);
                else if (state.currentMode === 'exercise') openExercises(l.chapter_number);
                else if (state.currentMode === 'flashcard') openFlashcards(l.chapter_number);
                else if (state.currentMode === 'fiche') openFicheRecap(l.chapter_number);
                else if (state.currentMode === 'recite') openRecitation(l.chapter_number); // <--- Appel de la fonction Speedrun
                else displayLesson(l.chapter_number);
            }
        };
        grid.appendChild(card);
    });

    navigateTo('view-chapters');
}

async function prepareMultiQuiz() {
    // 1. On récupère les cartes sélectionnées
    const selectedCards = document.querySelectorAll('.chapter-card-interactive.selected');
    const selectedChapters = Array.from(selectedCards).map(card => parseInt(card.dataset.chapterId));

    // 2. Sécurité : Vérifier qu'il y a au moins DEUX chapitres
    if (selectedChapters.length < 2) {
        return alert("Sélectionne au moins 2 chapitres pour ce mode.");
    }

    // 3. Appel Supabase
    const { data, error } = await sb
        .from('quizzes') 
        .select('*')
        .in('chapter_number', selectedChapters)
        .eq('class_id', state.currentClassCode)
        .eq('subject_id', state.currentSubject.toLowerCase());

    if (error || !data || data.length === 0) {
        return alert("Aucune question trouvée pour ces chapitres.");
    }

    // --- LOGIQUE DE MÉMOIRE POUR LE MODE SURVIE ---
    // On stocke TOUTES les questions récupérées dans le backup
    allQuestionsBackup = data;

    // --- LOGIQUE DE LIMITATION POUR LE MODE NORMAL ---
    // 1. On mélange
    let shuffledData = [...data].sort(() => 0.5 - Math.random());

    // 2. On définit la limite à 10 pour le multi-chapitres
    quizData = shuffledData.slice(0, 10);
    
    // Initialisation
    currentStep = 0;
    userAnswers = {};
    isTimeAttack = false; // Sécurité : on s'assure que le mode survie est OFF au début

    // CORRECTION ICI : Le nom de la fonction était coupé
    renderQuizSlide(selectedChapters[0]); 
    navigateTo('view-quiz');
}

function toggleMultiSelectionMode() {
    const isMulti = document.getElementById('toggle-multi-mode').checked;
    const badges = document.querySelectorAll('.chapter-badge-selection');
    const validateArea = document.getElementById('multi-validate-area');
    const cards = document.querySelectorAll('.chapter-card-interactive');

    // On affiche ou cache les petits badges ronds
    badges.forEach(b => b.style.display = isMulti ? 'flex' : 'none');

    // Si on désactive le mode multi, on enlève le violet de toutes les cartes
    if (!isMulti) {
        cards.forEach(c => {
            c.classList.remove('selected');
        });
    }

    validateArea.style.display = isMulti ? 'block' : 'none';
}

function startSurvivalMode(chapterNum) {
    // 1. On affiche la vue du quiz immédiatement
    navigateTo('view-quiz');

    // 2. On attend un court instant pour que le navigateur "dessine" le container
    setTimeout(() => {
        const container = document.getElementById('quiz-container');
        let overlay = document.getElementById('countdown-overlay');

        // SÉCURITÉ : Si l'overlay n'est vraiment pas là, on le crée
        if (!overlay && container) {
            overlay = document.createElement('div');
            overlay.id = 'countdown-overlay';
            container.appendChild(overlay);
        }

        if (!overlay) return; // Si toujours rien, on arrête

        // 3. On cache les éléments du quiz pour laisser la place au décompte
        Array.from(container.children).forEach(child => {
            if (child.id !== 'countdown-overlay') child.style.display = 'none';
        });

        // 4. Lancement de l'animation
        overlay.style.display = 'flex';
        let count = 3;
        overlay.innerHTML = `<div class="countdown-animate">${count}</div>`;

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                overlay.innerHTML = `<div class="countdown-animate">${count}</div>`;
            } else if (count === 0) {
                overlay.innerHTML = `<div class="countdown-animate go-text">GO !</div>`;
            } else {
                clearInterval(interval);
                overlay.style.display = 'none';
                overlay.innerHTML = '';
                
                // 5. On appelle la logique de survie
                launchSurvieLogic(chapterNum);
            }
        }, 1000);
    }, 100); // 100ms suffisent pour stabiliser le DOM
}

function launchSurvieLogic(chapterNum) {
    isTimeAttack = true;
    timeLeft = 60;
    currentStep = 0;
    userAnswers = {};

    // QUESTIONS ILLIMITÉES : On mélange tout le stock du chapitre
    if (allQuestionsBackup.length > 0) {
        quizData = [...allQuestionsBackup].sort(() => Math.random() - 0.5);
    }

    const container = document.getElementById('quiz-container');
    if (container) container.classList.add('survival-mode');
    
    // NAVIGATION : On bascule sur la vue quiz
    navigateTo('view-quiz');
    
    // ON FORCE L'AFFICHAGE DU TIMER
    const timerDisplay = document.getElementById('quiz-timer-display');
    if (timerDisplay) {
        timerDisplay.style.display = 'block';
        timerDisplay.innerText = `⏱️ ${timeLeft}s`;
    }

    startGlobalTimer(chapterNum);
    renderQuizSlide(chapterNum);
}

function startGlobalTimer(chapterNum) {
    if (quizTimer) clearInterval(quizTimer);
    
    quizTimer = setInterval(() => {
        timeLeft--;
        const timerDisplay = document.getElementById('quiz-timer-display');
        
        if (timerDisplay) {
            timerDisplay.innerText = `⏱️ ${timeLeft}s`;
            if (timeLeft <= 10) {
                timerDisplay.classList.add('low-time');
            }
        }

        if (timeLeft <= 0) {
            clearInterval(quizTimer);
            finishQuiz(chapterNum);
        }
    }, 1000);
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

// --- FONCTION POUR MÉLANGER LES RÉPONSES ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- FONCTION POUR CHARGER LE QUIZ DEPUIS SUPABASE ---

async function openQuiz(chapterNum) {
    console.log("DÉMARRAGE DU QUIZ - CHAPITRE UNIQUE :", chapterNum);
    
    // 1. Reset des variables et masquage du timer
    if (quizTimer) clearInterval(quizTimer);
    isTimeAttack = false;
    timeLeft = 60;

    // IMPORTANT : On cache le chrono au démarrage du mode normal
    const timerDisplay = document.getElementById('quiz-timer-display');
    if (timerDisplay) timerDisplay.style.display = 'none';

    const { data, error } = await sb
        .from('quizzes') 
        .select('*')
        .eq('class_id', state.currentClassCode)
        .eq('subject_id', state.currentSubject.toLowerCase())
        .eq('chapter_number', chapterNum);

    if (error || !data || data.length === 0) {
        return alert("Pas de quiz disponible pour ce chapitre.");
    }

    // 2. Stockage du réservoir complet pour le futur "Défi 1 minute"
    allQuestionsBackup = data;

    // 3. MODE NORMAL : Limité à 5 questions
    quizData = [...data].sort(() => 0.5 - Math.random()).slice(0, 5);
    
    currentStep = 0;
    userAnswers = {};

    // 4. Affichage
    renderQuizSlide(chapterNum);
    navigateTo('view-quiz');
}

function renderQuizSlide(chapterNum) {
    const container = document.getElementById('quiz-container');
    const q = quizData[currentStep];
    const isLast = currentStep === quizData.length - 1;

    // On ajoute la classe 'rendering' pour cacher le flash de texte brut
    container.classList.add('rendering');
    
    // On s'assure que le style survie est maintenu si le mode est actif
    if (isTimeAttack) {
        container.classList.add('survival-mode');
    } else {
        container.classList.remove('survival-mode');
    }

    container.innerHTML = `
         <div class="quiz-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background:#f9f9f9; padding:10px; border-radius:12px;">
              <div style="display:flex; align-items:center; gap:12px;">
                  <span id="quiz-timer-display" style="display: ${isTimeAttack ? 'block' : 'none'}; font-weight:bold; font-size:1.1rem; color:var(--brand-school);">
                      ⏱️ ${timeLeft}s
                  </span>
                  
                  ${!isTimeAttack ? `
                      <button class="btn-sablier" onclick="startSurvivalMode(${chapterNum})">
                          <span>⏳</span>
                      </button>
                  ` : ''}
              </div>
              
              <span style="color:#888; font-weight:600;">
                  ${isTimeAttack ? `Question ${currentStep + 1}` : `Question ${currentStep + 1} / ${quizData.length}`}
              </span>
         </div>

         <div class="quiz-question-card">
                  <div class="quiz-question-text" style="font-size:1.15rem; line-height:1.5; margin-bottom:20px;">
                      ${q.question}
                  </div>
                  <div id="options-box"></div>
                  
                  <div class="quiz-navigation" style="margin-top:20px; display:flex; justify-content:space-between;">
                      <button class="btn-nav" onclick="changeSlide(-1, ${chapterNum})" ${currentStep === 0 ? 'style="visibility:hidden"' : ''}>
                          <span>‹</span> Précédent
                      </button>
                      
                      ${isLast ? 
                          `<button class="btn-nav" onclick="finishQuiz(${chapterNum})">Terminer <span>✓</span></button>` : 
                          `<button class="btn-nav" onclick="changeSlide(1, ${chapterNum})">Suivant <span>›</span></button>`
                      }
                  </div>
            </div>
    `;

    const optionsBox = container.querySelector('#options-box');
    q.options.forEach((opt, idx) => {
        const btn = document.createElement('div');
        btn.className = 'quiz-option';
        
        if (userAnswers[currentStep] === idx) {
            btn.classList.add('selected');
        }

        btn.innerHTML = opt;
        btn.onclick = () => {
            userAnswers[currentStep] = idx;

            if (isTimeAttack) {
                const allBtns = optionsBox.querySelectorAll('.quiz-option');
                allBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');

                setTimeout(() => {
                    if (currentStep < quizData.length - 1) {
                        currentStep++;
                        renderQuizSlide(chapterNum);
                    } else {
                        finishQuiz(chapterNum);
                    }
                }, 150); 
            } else {
                const allBtns = optionsBox.querySelectorAll('.quiz-option');
                allBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            }
        };
        optionsBox.appendChild(btn);
    });

    if (window.MathJax) {
        setTimeout(() => {
            MathJax.typesetClear([container]);
            MathJax.typesetPromise([container]).then(() => {
                container.classList.remove('rendering');
            });
        }, 10);
    } else {
        container.classList.remove('rendering');
    }
}

function changeSlide(direction, chapterNum) {
    currentStep += direction;
    renderQuizSlide(chapterNum);
}

function finishQuiz(chapterNum) {
    // 1. ARRÊT DU SYSTÈME DE CHRONO
    if (quizTimer) {
        clearInterval(quizTimer);
        quizTimer = null;
    }
    
    // 2. NETTOYAGE VISUEL
    const container = document.getElementById('quiz-container');
    container.classList.remove('survival-mode'); // Retire la bordure rouge animée
    container.classList.add('rendering');

    // Réinitialisation du style du timer
    const timerDisplay = document.getElementById('quiz-timer-display');
    if (timerDisplay) {
        timerDisplay.classList.remove('low-time');
        timerDisplay.style.color = ""; 
        timerDisplay.style.fontSize = "";
        // On le cache systématiquement à la fin
        timerDisplay.style.display = "none";
    }

    let finalScore = 0;
    let questionsRepondues = 0;

    // 3. CALCUL DU SCORE RÉEL
    quizData.forEach((q, idx) => {
        if (userAnswers[idx] !== undefined) {
            questionsRepondues++;
            if (userAnswers[idx] === q.correct_index) finalScore++;
        }
    });

    // 4. GÉNÉRATION DE LA CORRECTION
    container.innerHTML = '<h2 style="text-align:center; margin-bottom:20px; color:var(--brand-school);">Correction détaillée</h2>';
    
    quizData.forEach((q, idx) => {
        // On n'affiche la correction que pour les questions répondues (important en mode survie)
        // ou pour toutes les questions si on est en mode normal
        if (userAnswers[idx] !== undefined || !isTimeAttack) {
            const card = document.createElement('div');
            card.className = 'quiz-question-card';
            card.style.marginBottom = "20px";
            card.innerHTML = `<div class="quiz-question-text">Question ${idx + 1} : ${q.question}</div>`;
            
            const optionsBox = document.createElement('div');
            q.options.forEach((opt, optIdx) => {
                const btn = document.createElement('div');
                btn.className = 'quiz-option';
                btn.innerHTML = opt;

                if (optIdx === q.correct_index) {
                    btn.classList.add('correct'); 
                    if (userAnswers[idx] === optIdx) btn.innerHTML += " ✅";
                } else if (userAnswers[idx] === optIdx) {
                    btn.classList.add('wrong'); 
                    btn.innerHTML += " ❌";
                }
                optionsBox.appendChild(btn);
            });
            
            card.appendChild(optionsBox);
            container.appendChild(card);
        }
    });

    // --- LOGIQUE DE SCORE DYNAMIQUE ---
    // En mode survie, on note sur le nombre de questions traitées.
    // En mode normal, on note sur le nombre total de questions du quiz.
    const totalQuestionsComptees = isTimeAttack ? questionsRepondues : quizData.length;

    // On affiche le résultat (on passe isTimeAttack pour le label personnalisé)
    showQuizResult(finalScore, totalQuestionsComptees, container, chapterNum);

    // 5. RESET DE L'ÉTAT ET TRAITEMENT FINAL
    isTimeAttack = false; 

    if (window.MathJax) {
        setTimeout(() => {
            MathJax.typesetClear([container]);
            MathJax.typesetPromise([container]).then(() => {
                container.classList.remove('rendering');
            });
        }, 10);
    } else {
        container.classList.remove('rendering');
    }

    setTimeout(() => {
        const resultBox = container.querySelector('.quiz-result-box');
        if(resultBox) resultBox.scrollIntoView({ behavior: 'smooth' });
    }, 300);
}

function showQuizResult(score, total, container, chapterNum) {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'quiz-result-box';
    
    // Détermination du titre et des messages selon le mode
    // Note : On utilise l'état global isTimeAttack qui est encore à true au moment de l'appel dans finishQuiz
    const isSurvie = isTimeAttack; 
    const title = isSurvie ? "🔥 Score de Survie" : "Résultat du Quiz";
    
    let message = "";
    let percentage = total > 0 ? (score / total) * 100 : 0;

    if (isSurvie) {
        if (percentage === 100 && total >= 10) message = "🏆 INCROYABLE ! Vitesse et précision absolues !";
        else if (percentage >= 80) message = "⚡ Quelle rapidité ! Tu maîtrises le sujet sous pression !";
        else if (percentage >= 50) message = "👍 Bien joué ! Essaye d'aller encore plus vite la prochaine fois !";
        else message = "💪 La survie c'est dur, mais tu progresses ! Continue !";
    } else {
        if (percentage === 100) message = "🏆 Excellent ! Un sans faute !";
        else if (percentage >= 80) message = "😎 Très bien joué !";
        else if (percentage >= 50) message = "👍 Pas mal, continue comme ça !";
        else message = "💪 Tu peux faire mieux, réessaie !";
    }

    resultDiv.innerHTML = `
        <h3 style="margin-bottom:10px;">${title}</h3>
        <div class="quiz-score">${score} / ${total}</div>
        
        ${isSurvie ? `<p style="font-size: 0.9rem; color: var(--brand-school); font-weight: bold; margin-bottom: 10px;">Questions répondues : ${total}</p>` : ''}
        
        <p style="margin-bottom:20px;">${message}</p>
        
        <button class="btn-restart" id="btn-restart-quiz">🔄 Recommencer</button>
        
        <div class="quick-nav-footer">
            <button class="btn-nav-quick" onclick="chooseMode('lesson'); displayLesson(${chapterNum})">
                📖 Revoir la Leçon
            </button>
            <button class="btn-nav-quick primary" onclick="alert('Bientôt disponible !')">
                🧠 Faire les Exercices
            </button>
        </div>
    `;

    container.appendChild(resultDiv);

    // Bouton recommencer
    document.getElementById('btn-restart-quiz').onclick = function() {
        document.querySelector('main').scrollTop = 0;
        // On relance le quiz normal ou survie selon le dernier mode joué
        if (isSurvie) {
            startSurvivalMode(chapterNum);
        } else {
            openQuiz(chapterNum);
        }
    };

    setTimeout(() => {
        resultDiv.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// Flashcards 

async function openFlashcards(chapterNum) {
    const container = document.getElementById('flashcards-grid-container');
    if (!container) return;

    // On ne vide pas le container avec un message texte pour éviter l'effet de "saut"
    const { data, error } = await sb
        .from('flashcards')
        .select('*')
        .eq('class_id', state.currentClassCode.trim())
        .eq('subject_id', state.currentSubject.toLowerCase().trim())
        .eq('chapter_number', chapterNum);

    if (error || !data || data.length === 0) return alert("Pas de flashcards.");

    let shuffled = [...data].sort(() => 0.5 - Math.random());
    const cardsToShow = shuffled.slice(0, 3);

    container.innerHTML = ''; // On ne vide qu'ici, juste avant d'injecter
    const gridRow = document.createElement('div');
    gridRow.className = 'flashcards-grid-row';

    cardsToShow.forEach((cardData) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'flashcard';
        cardEl.onclick = function() { this.classList.toggle('flipped'); };
        cardEl.innerHTML = `
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <span class="flashcard-hint">Question</span>
                    <div class="flash-txt">${cardData.front}</div>
                </div>
                <div class="flashcard-back">
                    <span class="flashcard-hint">Réponse</span>
                    <div class="flash-txt">${cardData.back}</div>
                </div>
            </div>
        `;
        gridRow.appendChild(cardEl);
    });
    container.appendChild(gridRow);

    const flashView = document.getElementById('view-flashcards');
    const oldToolbar = flashView.querySelector('.actions-toolbar');
    if (oldToolbar) oldToolbar.remove();

    const toolbar = document.createElement('div');
    toolbar.className = 'actions-toolbar';
    toolbar.innerHTML = `
        <button class="btn-nav-quick btn-piocher" onclick="openFlashcards(${chapterNum})">🎲 Autre tirage</button>
        <div class="separator-v"></div>
        <button class="btn-nav-quick" onclick="displayLesson(${chapterNum})">📖 Cours</button>
        <button class="btn-nav-quick" onclick="openQuiz(${chapterNum})">✍️ Quiz</button>
        <button class="btn-nav-quick" onclick="openExercises(${chapterNum})">🧠 Exos</button>
        <button class="btn-nav-quick" onclick="openFicheRecap(${chapterNum})">📝 Fiche</button>
    `;
    flashView.appendChild(toolbar);

    if(window.MathJax) MathJax.typesetPromise([container]);
    navigateTo('view-flashcards');
}

// Exercice

async function openExercises(chapterNum) {
    const container = document.getElementById('final-exercise-list');
    
    // Sécurité anti-null
    if (!container) {
        console.error("❌ L'élément 'final-exercise-list' est introuvable dans le HTML");
        return;
    }

    container.innerHTML = '<p style="text-align:center; padding:20px;">Chargement des exercices...</p>';

    // 1. Récupération Supabase
    const { data, error } = await sb
        .from('exercises')
        .select('*')
        .eq('class_id', state.currentClassCode.trim())
        .eq('subject_id', state.currentSubject.toLowerCase().trim())
        .eq('chapter_number', chapterNum);

    if (error || !data || data.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:20px;">Pas d'exercices disponibles pour le chapitre ${chapterNum}.</p>`;
        return;
    }

    container.innerHTML = ''; // On vide le message de chargement

    // 2. Affichage avec ton design favori
    data.forEach((ex, idx) => {
        const card = document.createElement('div');
        card.className = 'exercise-card';
        
        const corrId = `corr-final-${chapterNum}-${idx}`;
        
        // Calcul des étoiles
        let stars = "";
        for(let i=0; i<5; i++) {
            stars += (i < ex.difficulty) ? "★" : "☆";
        }
        
        card.innerHTML = `
            <div class="exercise-header">
                <span class="exercise-badge">Exercice ${idx + 1}</span>
                <div class="exercise-meta">
                    <span class="difficulty-stars">${stars}</span>
                    <span class="estimated-time">⏱️ ${ex.estimated_time}</span>
                </div>
            </div>

            <div class="exercise-body" style="color: black !important; margin-bottom: 1rem;">
                ${ex.enunciated}
            </div>
            
            <button class="btn-reveal" onclick="toggleCorrection('${corrId}')">
                <span>👁️</span> Voir la correction
            </button>
            
            <div id="${corrId}" class="correction-box" style="display:none">
                <span class="correction-title">✅ Correction détaillée</span>
                <div style="color: #333;">${ex.correction}</div>
            </div>
        `;
        container.appendChild(card);
    });

    // 3. Navigation et Rendu Mathématique
    if (window.MathJax) MathJax.typesetPromise();
    navigateTo('view-final-exercises');
}

// Fonction pour afficher/cacher la correction (avec ton style d'ID)
function toggleCorrection(id) {
    const div = document.getElementById(id);
    const btn = div.previousElementSibling; 
    
    if (div.style.display === 'none') {
        div.style.display = 'block';
        btn.innerHTML = '<span>🙈</span> Cacher la correction';
    } else {
        div.style.display = 'none';
        btn.innerHTML = '<span>👁️</span> Voir la correction';
    }
}

// Fiche Récapitulative 

async function openFicheRecap(chapterNum) {
    const header = document.getElementById('fiche-header');
    const contentBox = document.getElementById('fiche-content');
    
    if (!header || !contentBox) return;

    // Animation de chargement
    contentBox.innerHTML = '<p style="text-align:center; padding:20px;">✨ Préparation de ta fiche...</p>';

    // 1. On demande spécifiquement la colonne 'recap'
    const { data, error } = await sb
        .from('lessons')
        .select('recap') // <-- Changement ici
        .eq('class_id', state.currentClassCode.trim())
        .eq('subject_id', state.currentSubject.toLowerCase().trim())
        .eq('chapter_number', chapterNum)
        .single();

    if (error || !data || !data.recap) {
        console.error("Erreur Supabase:", error);
        contentBox.innerHTML = "<p style='text-align:center;'>Fiche en cours de rédaction pour ce chapitre ! ✍️</p>";
        navigateTo('view-fiche');
        return;
    }

    // 2. Traitement du contenu HTML stocké dans 'recap'
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = data.recap; // Utilisation de data.recap
    
    // Extraction du titre H1 pour le mettre dans le header jaune
    const titleFound = tempDiv.querySelector('h1')?.innerText || "Synthèse";
    if(tempDiv.querySelector('h1')) tempDiv.querySelector('h1').remove();

    // 3. Injection dans les éléments de la page
    header.innerHTML = `
        <p style="color:var(--brand-school); font-weight:800; text-transform:uppercase; font-size:0.8rem; letter-spacing:2px; margin-bottom:10px;">✨ FICHE RÉCAP ✨</p>
        <h1 style="margin:0; font-size:2.2rem; color:var(--text-dark);">${titleFound}</h1>
    `;
    
    contentBox.innerHTML = tempDiv.innerHTML;

    // 4. Navigation et affichage des formules MathJax
    navigateTo('view-fiche');
    
    if (window.MathJax) {
        // On demande à MathJax de transformer les $...$ en vraies formules dans contentBox
        MathJax.typesetPromise([contentBox]).catch((err) => console.log(err));
    }
}

/* =============================================================================
   CALCUL MASSE MOLAIRE
   ============================================================================= */
        /* =================================================================
        OUTIL : CALCULATEUR DE MASSE MOLAIRE (COMPLET)
        Gère : Coefficients (2H2O), Parenthèses (Ca(OH)2), Détails
        ================================================================= */

        // 1. BASE DE DONNÉES DES MASSES ATOMIQUES (g/mol)
        const atomMasses = {
            H: 1.008, He: 4.003, Li: 6.941, Be: 9.012, B: 10.81, C: 12.01, N: 14.01, O: 16.00, F: 19.00, Ne: 20.18,
            Na: 22.99, Mg: 24.31, Al: 26.98, Si: 28.09, P: 30.97, S: 32.06, Cl: 35.45, K: 39.10, Ca: 40.08,
            Ti: 47.87, Fe: 55.85, Cu: 63.55, Zn: 65.38, Br: 79.90, Ag: 107.87, I: 126.90, Au: 196.97, Pb: 207.2
        };

        // Variable pour stocker la formule brute (ex: "Ca(OH)2")
        let currentMolString = ""; 

        // 2. FONCTION POUR AJOUTER UN CARACTÈRE (Liée aux boutons)
                
        function addMolChar(char) {
            const display = document.getElementById('mol-display');
            const placeholder = document.getElementById('mol-placeholder');

            // Gestion visuelle des indices
            if (!isNaN(char)) {
                // Si c'est un chiffre...
                if (currentMolString.length === 0) {
                    // Premier caractère = Coefficient (Grand)
                    display.innerHTML += `<span>${char}</span>`;
                } else {
                    // Caractère suivant = Indice (Petit en bas)
                    // Note : On utilise <sub> qui est stylisé par le CSS
                    display.innerHTML += `<sub>${char}</sub>`;
                }
            } else {
                // Lettre ou parenthèse
                display.innerHTML += char;
            }
            
            currentMolString += char;
            if(placeholder) placeholder.style.display = 'none';
        }

        // 3. FONCTION EFFACER (Liée au bouton rouge)
        function deleteMolChar() {
            currentMolString = "";
            document.getElementById('mol-display').innerHTML = "";
            document.getElementById('mol-placeholder').style.display = 'block';
            document.getElementById('mol-result-box').style.display = 'none';
        }

        // 4. LE CERVEAU : CALCULATEUR AVEC PARENTHÈSES
        function calculateComplexMass() {
            if(!currentMolString) return;

            let formula = currentMolString;
            let multiplier = 1;

            // A. GESTION DU COEFFICIENT STŒCHIOMÉTRIQUE (Le chiffre devant, ex: 2H2O)
            // On regarde si la formule commence par un chiffre
            const startMatch = formula.match(/^(\d+)(.*)/);
            if (startMatch) {
                multiplier = parseInt(startMatch[1]); // On récupère le chiffre (ex: 2)
                formula = startMatch[2]; // On garde le reste (ex: H2O)
            }

            // B. ANALYSE DES PARENTHÈSES (Algorithme de la Pile)
            // Regex qui découpe la formule en : Atome+Chiffre OU ( OU )
            const regex = /([A-Z][a-z]?)(\d*)|(\()|(\))(\d*)/g;
            
            let stack = [ {} ]; // Une pile de "boîtes". On commence avec une boîte vide.
            let match;

            // On lit la formule morceau par morceau
            while ((match = regex.exec(formula)) !== null) {
                
                // Cas 1 : Parenthèse Ouvrante "("
                if (match[3]) {
                    stack.push({}); // On ouvre une nouvelle boîte vide par-dessus la précédente
                } 
                
                // Cas 2 : Parenthèse Fermante ")"
                else if (match[4]) {
                    let closingCount = match[5] === '' ? 1 : parseInt(match[5]); // Chiffre après la parenthèse
                    let currentGroup = stack.pop(); // On récupère la boîte du dessus (celle qui se ferme)
                    let parentGroup = stack[stack.length - 1]; // La boîte d'en dessous (qui reçoit le contenu)

                    // On vide le contenu de la boîte fermée dans la boîte parente en multipliant
                    for (let atom in currentGroup) {
                        if (!parentGroup[atom]) parentGroup[atom] = 0;
                        parentGroup[atom] += currentGroup[atom] * closingCount;
                    }
                } 
                
                // Cas 3 : C'est un Atome (Ex: C6)
                else if (match[1]) {
                    let atom = match[1];
                    let count = match[2] === '' ? 1 : parseInt(match[2]);
                    let currentGroup = stack[stack.length - 1]; // On met ça dans la boîte active

                    if (atomMasses[atom]) {
                        if (!currentGroup[atom]) currentGroup[atom] = 0;
                        currentGroup[atom] += count;
                    } else {
                        alert("Erreur : Atome inconnu (" + atom + ")");
                        return;
                    }
                }
            }

            // À la fin, tous les atomes sont redescendus dans la première boîte (stack[0])
            let finalCounts = stack[0];
            
            // C. GÉNÉRATION DE L'AFFICHAGE HTML
            let totalMass = 0;
            // En-tête du résultat
            let detailsHTML = `<h4 style="margin:0 0 15px 0; color:#333;">Détail du calcul :</h4>`;

            // On boucle sur chaque atome trouvé pour afficher la ligne de calcul
            for (let atom in finalCounts) {
                let count = finalCounts[atom];
                let mass = atomMasses[atom];
                let subTotal = count * mass;
                
                totalMass += subTotal;

                // Ligne de détail (Ex: C : 6 x 12.01 = 72.06)
                detailsHTML += `
                <div class="step-line">
                    <span style="font-weight:bold; width:30px; display:inline-block; color:var(--brand-school);">${atom}</span> : 
                    ${count} <small>atomes</small> &times; ${mass} = <b>${subTotal.toFixed(2)}</b>
                </div>`;
            }

            // Calcul final avec le coefficient multiplicateur
            let grandTotal = totalMass * multiplier;

            // Si on avait un coefficient (ex: 2 molécules), on l'affiche
            if(multiplier > 1) {
                detailsHTML += `<div style="border-top:1px dashed #ccc; margin-top:10px; padding-top:10px; color:#555;">
                    Masse d'une molécule : ${totalMass.toFixed(2)}<br>
                    Multiplicateur (x${multiplier}) : <b>${grandTotal.toFixed(2)}</b>
                </div>`;
            }

            // Total final en gros
            detailsHTML += `<div class="step-total">M = ${grandTotal.toFixed(2)} g/mol</div>`;

            // Affichage dans la boîte de résultat
            const resBox = document.getElementById('mol-result-box');
            if(resBox) {
                resBox.innerHTML = detailsHTML;
                resBox.style.display = 'block';
            }
        }
 
        /* =========================================
            CALCULATRICE GRAPHIQUE (TRACEUR)
           ========================================= */
        let graphCanvas = document.getElementById('graphCanvas');
        let gCtx = graphCanvas ? graphCanvas.getContext('2d') : null;
        let graphScale = 40; // Pixels par unité

        function initGraph() {
            // Initialisation au premier chargement
            drawGraph();
        }

        function updateZoom(val) {
            graphScale = parseInt(val);
            document.getElementById('zoom-val').innerText = val;
            drawGraph();
        }

        function drawGraph() {
            if(!gCtx) return;
            const w = graphCanvas.width;
            const h = graphCanvas.height;
            const cx = w / 2; // Centre X
            const cy = h / 2; // Centre Y

            // 1. Nettoyer
            gCtx.clearRect(0, 0, w, h);

            // 2. Dessiner la grille et les axes
            gCtx.lineWidth = 1;
            
            // Grille légère
            gCtx.beginPath();
            gCtx.strokeStyle = '#eee';
            for(let x = cx % graphScale; x < w; x += graphScale) { gCtx.moveTo(x, 0); gCtx.lineTo(x, h); }
            for(let y = cy % graphScale; y < h; y += graphScale) { gCtx.moveTo(0, y); gCtx.lineTo(w, y); }
            gCtx.stroke();

            // Axes principaux
            gCtx.beginPath();
            gCtx.strokeStyle = '#333';
            gCtx.lineWidth = 2;
            gCtx.moveTo(0, cy); gCtx.lineTo(w, cy); // Axe X
            gCtx.moveTo(cx, 0); gCtx.lineTo(cx, h); // Axe Y
            gCtx.stroke();

            // 3. Récupérer et préparer la fonction
            let expr = document.getElementById('func-input').value.toLowerCase();
            
            // "Traduction" mathématique pour que JS comprenne (ex: x^2 -> x**2, sin -> Math.sin)
            // On remplace d'abord les puissances ^ par **
            expr = expr.replace(/\^/g, '**');
            // On ajoute 'Math.' devant les fonctions usuelles si elles ne l'ont pas déjà
            ['sin', 'cos', 'tan', 'sqrt', 'log', 'exp', 'abs'].forEach(fn => {
                // Regex pour remplacer "sin(" par "Math.sin(" sans casser "Math.sin(" si déjà présent
                let regex = new RegExp(`\\b${fn}\\(`, 'g');
                expr = expr.replace(regex, `Math.${fn}(`);
            });

            // 4. Tracer la courbe pixel par pixel
            gCtx.beginPath();
            gCtx.strokeStyle = '#6C63FF'; // Couleur Schoolizy
            gCtx.lineWidth = 2;

            let firstPoint = true;

            // On parcourt chaque pixel de l'écran en largeur
            for (let px = 0; px <= w; px++) {
                // On convertit le pixel écran en coordonnée mathématique X
                // (pixel - centre) / echelle
                let x = (px - cx) / graphScale;
                
                try {
                    // Évaluation sécurisée de la fonction
                    // On crée une petite fonction temporaire JS qui retourne le résultat
                    let yMath = new Function('x', `try { return ${expr}; } catch(e) { return NaN; }`)(x);
                    
                    if (isNaN(yMath) || !isFinite(yMath)) {
                        firstPoint = true; // Si erreur (ex: racine de négatif), on lève le crayon
                        continue;
                    }

                    // On convertit le Y mathématique en pixel écran
                    // Attention : en canvas, Y descend, donc on inverse (-yMath)
                    let py = cy - (yMath * graphScale);

                    if (firstPoint) {
                        gCtx.moveTo(px, py);
                        firstPoint = false;
                    } else {
                        gCtx.lineTo(px, py);
                    }
                } catch (e) {
                    // Erreur de syntaxe (ex: utilisateur en train de taper)
                    // On ignore silencieusement
                }
            }
            gCtx.stroke();
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

        /* =========================================
           4. CONVERTISSEUR UNIVERSEL
           ========================================= */
        const convData = {
            'length': {
                name: 'Longueur',
                units: {
                    'km': 1000, 'hm': 100, 'dam': 10, 'm': 1, 
                    'dm': 0.1, 'cm': 0.01, 'mm': 0.001, 
                    'mi': 1609.34 // Mile
                }
            },
            'mass': {
                name: 'Masse',
                units: {
                    't': 1000000, 'kg': 1000, 'hg': 100, 'dag': 10, 'g': 1,
                    'dg': 0.1, 'cg': 0.01, 'mg': 0.001
                }
            },
            'time': {
                name: 'Temps',
                units: {
                    'an': 31536000, 'j': 86400, 'h': 3600, 'min': 60, 's': 1, 'ms': 0.001
                }
            },
            'speed': {
                name: 'Vitesse',
                units: {
                    'km/h': 1/3.6, // Base est m/s. 1 km/h = 1/3.6 m/s
                    'm/s': 1,
                    'mph': 0.44704
                }
            },
            'volume': {
                name: 'Volume',
                units: {
                    'm³': 1000, 'dm³': 1, 'cm³': 0.001, // Base est le Litre
                    'L': 1, 'dL': 0.1, 'cL': 0.01, 'mL': 0.001,
                    'hL': 100
                }
            },
            'data': {
                name: 'Données',
                units: {
                    'To': 1000000000000, 'Go': 1000000000, 'Mo': 1000000, 'Ko': 1000, 'o': 1
                }
            }
        };

        let currentCategory = 'length';

        function initConverter() {
            setConvCategory('length');
        }

        function setConvCategory(cat) {
            currentCategory = cat;
            
            // Mise à jour visuelle des onglets
            document.querySelectorAll('.conv-tab').forEach(b => b.classList.remove('active'));
            // Astuce : on trouve le bouton qui a le onclick correspondant
            const tabs = document.querySelectorAll('.conv-tab');
            for(let t of tabs) {
                if(t.getAttribute('onclick').includes(cat)) t.classList.add('active');
            }

            // Remplir les Selects
            const units = convData[cat].units;
            const select1 = document.getElementById('conv-unit-1');
            const select2 = document.getElementById('conv-unit-2');
            
            select1.innerHTML = ''; select2.innerHTML = '';
            
            for (let [u, val] of Object.entries(units)) {
                let opt1 = document.createElement('option'); opt1.value = val; opt1.innerText = u;
                let opt2 = document.createElement('option'); opt2.value = val; opt2.innerText = u;
                select1.appendChild(opt1);
                select2.appendChild(opt2);
            }

            // Sélection par défaut intelligente
            if(cat === 'length') { select1.value = 1000; select2.value = 1; } // km -> m
            if(cat === 'speed') { select1.value = 1/3.6; select2.value = 1; } // km/h -> m/s
            if(cat === 'time') { select1.value = 3600; select2.value = 60; } // h -> min

            calculateConv(1);
        }

        function calculateConv(sourceParams) {
            const input1 = document.getElementById('conv-input-1');
            const input2 = document.getElementById('conv-input-2');
            const unit1 = parseFloat(document.getElementById('conv-unit-1').value);
            const unit2 = parseFloat(document.getElementById('conv-unit-2').value);
            
            // sourceParams = 1 si on écrit dans input 1, 2 si on écrit dans input 2
            let val;

            if(sourceParams === 1) {
                val = parseFloat(input1.value);
                if(isNaN(val)) { input2.value = ''; return; }
                
                // Formule : Val * (Facteur Départ / Facteur Arrivée)
                let res = val * (unit1 / unit2);
                
                // Arrondi propre pour éviter 0.30000000004
                if(res < 0.000001) input2.value = res.toExponential(4);
                else input2.value = parseFloat(res.toPrecision(10)); // Nettoie les décimales folles
            } else {
                val = parseFloat(input2.value);
                if(isNaN(val)) { input1.value = ''; return; }
                let res = val * (unit2 / unit1);
                
                if(res < 0.000001) input1.value = res.toExponential(4);
                else input1.value = parseFloat(res.toPrecision(10));
            }

            // Affichage de la formule pour aider l'élève
            const u1Name = document.getElementById('conv-unit-1').options[document.getElementById('conv-unit-1').selectedIndex].text;
            const u2Name = document.getElementById('conv-unit-2').options[document.getElementById('conv-unit-2').selectedIndex].text;
            
            // Facteur explicatif
            let factor = unit1 / unit2;
            let operator = factor >= 1 ? '×' : '÷';
            let displayFactor = factor >= 1 ? factor : (1/factor);
            
            // Affichage joli
            displayFactor = parseFloat(displayFactor.toPrecision(6)); // Propre
            
            document.getElementById('conv-formula').innerText = 
                `Pour passer de ${u1Name} à ${u2Name}, on multiplie par ${factor < 1 ? (1/factor).toFixed(4) : factor} (ou div par ${factor < 1 ? factor : (1/factor).toFixed(4)})`;
        }

/* LOGIQUE JS */
        let pomoInterval = null;
        let pomoTime = 25 * 60; 
        let isPomoRunning = false;

        function updatePomoDisplay() {
            const minutes = Math.floor(pomoTime / 60);
            const seconds = pomoTime % 60;
            const displayMin = minutes < 10 ? '0' + minutes : minutes;
            const displaySec = seconds < 10 ? '0' + seconds : seconds;
            document.getElementById('pomo-timer').innerText = `${displayMin}:${displaySec}`;
        }

function togglePomodoro() {
            const btn = document.getElementById('pomo-btn');
            const container = document.getElementById('pomo-container');
            
            // Les dessins SVG (Codes bruts)
            const iconPlay = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8 5V19L19 12L8 5Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
            
            const iconPause = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8 5V19" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M16 5V19" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`;
            
            if (isPomoRunning) {
                // --- PAUSE ---
                clearInterval(pomoInterval);
                isPomoRunning = false;
                
                btn.innerHTML = iconPlay; // On remet le dessin Play
                container.classList.remove('running');
                
            } else {
                // --- DÉMARRAGE ---
                isPomoRunning = true;
                
                btn.innerHTML = iconPause; // On met le dessin Pause (barres arrondies)
                container.classList.add('running');
                
                pomoInterval = setInterval(() => {
                    if (pomoTime > 0) {
                        pomoTime--;
                        updatePomoDisplay();
                    } else {
                        clearInterval(pomoInterval);
                        isPomoRunning = false;
                        btn.innerHTML = iconPlay;
                        container.classList.remove('running');
                        alert("🔔 Ding Dong ! C'est la pause !");
                    }
                }, 1000);
            }
        }
        
        // Pensez aussi à mettre à jour le bouton Reset pour qu'il remette l'icone Play
        function resetPomodoro() {
            clearInterval(pomoInterval);
            isPomoRunning = false;
            pomoTime = 25 * 60; 
            updatePomoDisplay();
            
            // On remet l'icône Play
            const iconPlay = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8 5V19L19 12L8 5Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
            document.getElementById('pomo-btn').innerHTML = iconPlay;
            
            document.getElementById('pomo-container').classList.remove('running');
        }

      /* =========================================
       REPÈRE INTERACTIF (Version Clic par Clic - CORRIGÉE)
       ========================================= */
    let repCanvas = document.getElementById('repereCanvas');
    let rCtx = repCanvas ? repCanvas.getContext('2d') : null;
    
    let rObjects = { points: [], vectors: [] };
    let rConfig = { pixelsPerUnit: 20, step: 1, cx: 200, cy: 200, mode: 'point' };
    let rState = { dragging: null, vectorStart: null, currentMouse: {x:0, y:0}, hover: null };

    function initRepere() {
        rObjects = { points: [], vectors: [] };
        if(repCanvas) {
            rConfig.cx = repCanvas.width / 2;
            rConfig.cy = repCanvas.height / 2;
            setRepereMode('point'); 
            drawRepere();
        }
    }

    function setRepereMode(mode) {
        rConfig.mode = mode;
        rState.vectorStart = null; 
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById('btn-mode-' + mode);
        if(btn) btn.classList.add('active');
        updateInstructions(); 
        drawRepere();
    }

    function updateInstructions() {
        const txt = document.getElementById('repere-instruction');
        if(!txt) return;
        if(rConfig.mode === 'point') txt.innerHTML = "<strong>Mode Point :</strong> Cliquez sur la grille pour placer un point (aimanté à 0,25).";
        if(rConfig.mode === 'vector') {
            if(rState.vectorStart) txt.innerHTML = "<strong style='color:var(--brand-school)'>Mode Vecteur :</strong> Cliquez sur le <strong>point d'arrivée</strong>.";
            else txt.innerHTML = "<strong>Mode Vecteur :</strong> Cliquez d'abord sur le <strong>point de départ</strong>.";
        }
        if(rConfig.mode === 'move') txt.innerHTML = "<strong>Mode Déplacer :</strong> Maintenez le clic sur un point pour le bouger.";
        if(rConfig.mode === 'delete') txt.innerHTML = "<strong>Mode Gomme :</strong> Cliquez sur un point ou un vecteur pour le supprimer.";
    }

    function drawRepere() {
        if(!rCtx) return;
        const w = repCanvas.width; const h = repCanvas.height;
        rCtx.clearRect(0, 0, w, h);

        const stepPx = rConfig.pixelsPerUnit * rConfig.step; 
        rCtx.lineWidth = 1;
        for(let x = rConfig.cx; x <= w; x += stepPx) drawGridLine(x, 0, x, h, x);
        for(let x = rConfig.cx; x >= 0; x -= stepPx) drawGridLine(x, 0, x, h, x);
        for(let y = rConfig.cy; y <= h; y += stepPx) drawGridLine(0, y, w, y, y);
        for(let y = rConfig.cy; y >= 0; y -= stepPx) drawGridLine(0, y, w, y, y);

        rCtx.strokeStyle = '#000'; rCtx.lineWidth = 2; rCtx.beginPath();
        rCtx.moveTo(0, rConfig.cy); rCtx.lineTo(w, rConfig.cy);
        rCtx.moveTo(rConfig.cx, 0); rCtx.lineTo(rConfig.cx, h);
        rCtx.stroke();

        rObjects.vectors.forEach(v => {
            const p1 = rObjects.points.find(p => p.id === v.from);
            const p2 = rObjects.points.find(p => p.id === v.to);
            if(p1 && p2) drawArrow(rCtx, p1.x, p1.y, p2.x, p2.y, 'blue');
        });

        rObjects.points.forEach(p => {
            rCtx.beginPath(); rCtx.arc(p.x, p.y, 5, 0, Math.PI*2);
            if(rState.vectorStart === p) rCtx.fillStyle = '#2ecc71'; 
            else if(rState.hover === p) rCtx.fillStyle = '#FFD700'; 
            else rCtx.fillStyle = 'red'; 
            rCtx.fill(); rCtx.strokeStyle = 'black'; rCtx.lineWidth = 1; rCtx.stroke();
            rCtx.fillStyle = '#333'; rCtx.font = "11px Arial"; rCtx.fillText(`${p.name}`, p.x + 8, p.y - 8);
        });

        if(rConfig.mode === 'vector' && rState.vectorStart) {
            rCtx.beginPath(); rCtx.strokeStyle = '#2ecc71'; rCtx.lineWidth = 2; rCtx.setLineDash([5, 3]);
            rCtx.moveTo(rState.vectorStart.x, rState.vectorStart.y);
            rCtx.lineTo(rState.currentMouse.x, rState.currentMouse.y);
            rCtx.stroke(); rCtx.setLineDash([]);
        }
    }

    function drawGridLine(x1, y1, x2, y2, val) {
        rCtx.beginPath();
        let dist = Math.abs(val - (x1 === x2 ? rConfig.cx : rConfig.cy));
        let isUnit = Math.abs(dist % rConfig.pixelsPerUnit) < 1;
        rCtx.strokeStyle = isUnit ? '#ccc' : '#f4f4f4';
        rCtx.moveTo(x1, y1); rCtx.lineTo(x2, y2); rCtx.stroke();
    }

    function getSnappedPos(evt) {
        const rect = repCanvas.getBoundingClientRect();
        const scaleX = repCanvas.width / rect.width;
        const scaleY = repCanvas.height / rect.height;
        const mx = (evt.clientX - rect.left) * scaleX;
        const my = (evt.clientY - rect.top) * scaleY;
        let mathX = (mx - rConfig.cx) / rConfig.pixelsPerUnit;
        let mathY = -(my - rConfig.cy) / rConfig.pixelsPerUnit;
        mathX = Math.round(mathX / rConfig.step) * rConfig.step;
        mathY = Math.round(mathY / rConfig.step) * rConfig.step;
        return { 
            pixelX: rConfig.cx + mathX * rConfig.pixelsPerUnit, 
            pixelY: rConfig.cy - mathY * rConfig.pixelsPerUnit, 
            mathX: mathX, 
            mathY: mathY, 
            rawX: mx, 
            rawY: my 
        };
    }

    function drawArrow(ctx, fromx, fromy, tox, toy, color) {
        const headlen = 10; const dx = tox - fromx; const dy = toy - fromy; const angle = Math.atan2(dy, dx);
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.moveTo(fromx, fromy); ctx.lineTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(tox, toy); ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    }

    function getHoverPoint(mx, my) { return rObjects.points.find(p => Math.hypot(p.x - mx, p.y - my) < 15); }
    function getHoverVector(mx, my) {
        return rObjects.vectors.find(v => {
            const p1 = rObjects.points.find(p => p.id === v.from);
            const p2 = rObjects.points.find(p => p.id === v.to);
            if(!p1 || !p2) return false;
            return Math.hypot((p1.x+p2.x)/2 - mx, (p1.y+p2.y)/2 - my) < 10;
        });
    }

    if(repCanvas) {
        repCanvas.addEventListener('mousedown', (e) => {
            const pos = getSnappedPos(e);
            const targetPoint = getHoverPoint(pos.rawX, pos.rawY);
            const targetVector = getHoverVector(pos.rawX, pos.rawY);

            if(rConfig.mode === 'delete') {
                if(targetPoint) {
                    rObjects.points = rObjects.points.filter(p => p !== targetPoint);
                    rObjects.vectors = rObjects.vectors.filter(v => v.from !== targetPoint.id && v.to !== targetPoint.id);
                    if(rState.vectorStart === targetPoint) rState.vectorStart = null;
                } else if(targetVector) {
                    rObjects.vectors = rObjects.vectors.filter(v => v !== targetVector);
                }
                drawRepere(); return;
            }
            if(rConfig.mode === 'point') {
                if(!targetPoint) {
                    let name = String.fromCharCode(65 + rObjects.points.length);
                    rObjects.points.push({ id: Date.now(), x: pos.pixelX, y: pos.pixelY, name: name });
                    drawRepere();
                }
                return;
            }
            if(rConfig.mode === 'vector') {
                if(targetPoint) {
                    if(!rState.vectorStart) { rState.vectorStart = targetPoint; } 
                    else if(targetPoint !== rState.vectorStart) {
                        const exists = rObjects.vectors.find(v => v.from === rState.vectorStart.id && v.to === targetPoint.id);
                        if(!exists) rObjects.vectors.push({ from: rState.vectorStart.id, to: targetPoint.id });
                        rState.vectorStart = null;
                    }
                    updateInstructions(); drawRepere();
                } else if(rState.vectorStart) { rState.vectorStart = null; updateInstructions(); drawRepere(); }
                return;
            }
            if(rConfig.mode === 'move' && targetPoint) { rState.dragging = targetPoint; }
        });

        repCanvas.addEventListener('mousemove', (e) => {
            const pos = getSnappedPos(e);
            rState.currentMouse = {x: pos.rawX, y: pos.rawY};
            
            // --- MODIFICATION ICI : Mise à jour sécurisée des deux affichages ---
            const coordsText = `x: ${pos.mathX.toFixed(2)}, y: ${pos.mathY.toFixed(2)}`;
            
            // 1. Mise à jour dans le panneau de contrôle
            const panelCoords = document.getElementById('mouse-coords');
            if(panelCoords) panelCoords.innerText = coordsText;

            // 2. Mise à jour de la bulle flottante (si le HTML a été corrigé)
            const tooltip = document.getElementById('mouse-tooltip');
            if(tooltip) tooltip.innerText = coordsText;
            // ------------------------------------------------------------------

            rState.hover = getHoverPoint(pos.rawX, pos.rawY);
            repCanvas.style.cursor = rState.hover ? 'pointer' : 'default';
            if(rState.dragging && rConfig.mode === 'move') { rState.dragging.x = pos.pixelX; rState.dragging.y = pos.pixelY; }
            drawRepere();
        });

        repCanvas.addEventListener('mouseup', () => { if(rConfig.mode === 'move') rState.dragging = null; });
        repCanvas.addEventListener('mouseleave', () => { if(rConfig.mode === 'move') rState.dragging = null; });
    }

    function clearRepere() {
        rObjects = { points: [], vectors: [] }; rState.vectorStart = null; updateInstructions(); drawRepere();
    }

/* --- LOGIQUE DES OUTILS (À coller dans le SCRIPT) --- */

        /* 1. CERCLE TRIGONOMÉTRIQUE (Version Valeurs Remarquables) */
        let trigoCanvas = document.getElementById('trigoCanvas');
        let tCtx = trigoCanvas ? trigoCanvas.getContext('2d') : null;
        let isDraggingTrigo = false;
        let lastRenderedIndex = -1; // Pour éviter de rafraichir MathJax inutilement

        // Base de données des valeurs remarquables
        /* --- DONNÉES CERCLE TRIGO (Format : "Positif ; Négatif") --- */
        const remarkableValues = [
            // 0 et 2pi
            { val: 0, label: "0 \\text{ ; } 2\\pi", cos: "1", sin: "0", tan: "0" },
            
            // --- CADRAN 1 (Haut Droite) ---
            { val: Math.PI/6, label: "\\frac{\\pi}{6}", cos: "\\frac{\\sqrt{3}}{2}", sin: "\\frac{1}{2}", tan: "\\frac{\\sqrt{3}}{3}" },
            { val: Math.PI/4, label: "\\frac{\\pi}{4}", cos: "\\frac{\\sqrt{2}}{2}", sin: "\\frac{\\sqrt{2}}{2}", tan: "1" },
            { val: Math.PI/3, label: "\\frac{\\pi}{3}", cos: "\\frac{1}{2}", sin: "\\frac{\\sqrt{3}}{2}", tan: "\\sqrt{3}" },
            
            // PI/2 (Haut)
            { val: Math.PI/2, label: "\\frac{\\pi}{2}", cos: "0", sin: "1", tan: "\\infty" },
            
            // --- CADRAN 2 (Haut Gauche) ---
            { val: 2*Math.PI/3, label: "\\frac{2\\pi}{3}", cos: "-\\frac{1}{2}", sin: "\\frac{\\sqrt{3}}{2}", tan: "-\\sqrt{3}" },
            { val: 3*Math.PI/4, label: "\\frac{3\\pi}{4}", cos: "-\\frac{\\sqrt{2}}{2}", sin: "\\frac{\\sqrt{2}}{2}", tan: "-1" },
            { val: 5*Math.PI/6, label: "\\frac{5\\pi}{6}", cos: "-\\frac{\\sqrt{3}}{2}", sin: "\\frac{1}{2}", tan: "-\\frac{\\sqrt{3}}{3}" },
            
            // PI (Gauche)
            { val: Math.PI, label: "\\pi \\text{ ; } -\\pi", cos: "-1", sin: "0", tan: "0" },
            
            // --- CADRAN 3 (Bas Gauche) -> Double affichage ---
            { val: 7*Math.PI/6, label: "\\frac{7\\pi}{6} \\text{ ; } -\\frac{5\\pi}{6}", cos: "-\\frac{\\sqrt{3}}{2}", sin: "-\\frac{1}{2}", tan: "\\frac{\\sqrt{3}}{3}" },
            { val: 5*Math.PI/4, label: "\\frac{5\\pi}{4} \\text{ ; } -\\frac{3\\pi}{4}", cos: "-\\frac{\\sqrt{2}}{2}", sin: "-\\frac{\\sqrt{2}}{2}", tan: "1" },
            { val: 4*Math.PI/3, label: "\\frac{4\\pi}{3} \\text{ ; } -\\frac{2\\pi}{3}", cos: "-\\frac{1}{2}", sin: "-\\frac{\\sqrt{3}}{2}", tan: "\\sqrt{3}" },
            
            // 3PI/2 (Bas)
            { val: 3*Math.PI/2, label: "\\frac{3\\pi}{2} \\text{ ; } -\\frac{\\pi}{2}", cos: "0", sin: "-1", tan: "\\infty" },

            // --- CADRAN 4 (Bas Droite) -> Double affichage ---
            { val: 5*Math.PI/3, label: "\\frac{5\\pi}{3} \\text{ ; } -\\frac{\\pi}{3}", cos: "\\frac{1}{2}", sin: "-\\frac{\\sqrt{3}}{2}", tan: "-\\sqrt{3}" },
            { val: 7*Math.PI/4, label: "\\frac{7\\pi}{4} \\text{ ; } -\\frac{\\pi}{4}", cos: "\\frac{\\sqrt{2}}{2}", sin: "-\\frac{\\sqrt{2}}{2}", tan: "-1" },
            { val: 11*Math.PI/6, label: "\\frac{11\\pi}{6} \\text{ ; } -\\frac{\\pi}{6}", cos: "\\frac{\\sqrt{3}}{2}", sin: "-\\frac{1}{2}", tan: "-\\frac{\\sqrt{3}}{3}" },
            
            // Bouclage (360°)
            { val: 2*Math.PI, label: "0 \\text{ ; } 2\\pi", cos: "1", sin: "0", tan: "0" }
        ];

        function initTrigo() { if(tCtx) drawTrigo(0); }

        function drawTrigo(rawAngle) {
            if(!tCtx) return;

            // 1. Normaliser l'angle (de -PI/PI à 0/2PI)
            let normalizedAngle = rawAngle;
            if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;

            // 2. Trouver la valeur remarquable la plus proche
            let closest = remarkableValues.reduce((prev, curr) => {
                return (Math.abs(curr.val - normalizedAngle) < Math.abs(prev.val - normalizedAngle) ? curr : prev);
            });

            // Gérer le cas cyclique (proche de 0 ou 2PI)
            if (Math.abs(normalizedAngle - 0) < 0.2) closest = remarkableValues[0];
            if (Math.abs(normalizedAngle - 2*Math.PI) < 0.2) closest = remarkableValues[0]; // Retour à 0 visuellement

            // 3. Dessiner le Canvas
            const w = trigoCanvas.width; const h = trigoCanvas.height;
            const cx = w / 2; const cy = h / 2; const r = 150;
            const angle = closest.val; // On utilise l'angle "aimanté"

            tCtx.clearRect(0, 0, w, h);

            // Axes
            tCtx.beginPath(); tCtx.strokeStyle = '#ddd';
            tCtx.moveTo(0, cy); tCtx.lineTo(w, cy); tCtx.moveTo(cx, 0); tCtx.lineTo(cx, h); tCtx.stroke();
            // Cercle
            tCtx.beginPath(); tCtx.strokeStyle = '#333'; tCtx.lineWidth = 2;
            tCtx.arc(cx, cy, r, 0, Math.PI * 2); tCtx.stroke();
            
            // Calculs coords
            let px = cx + r * Math.cos(angle); 
            let py = cy - r * Math.sin(angle); // Y inversé en canvas

            // Lignes projection
            tCtx.setLineDash([5, 3]);
            // Cos (rouge)
            tCtx.beginPath(); tCtx.strokeStyle = 'red'; tCtx.lineWidth = 2;
            tCtx.moveTo(px, py); tCtx.lineTo(px, cy); tCtx.moveTo(cx, cy); tCtx.lineTo(px, cy); tCtx.stroke();
            // Sin (bleu)
            tCtx.beginPath(); tCtx.strokeStyle = 'blue';
            tCtx.moveTo(px, py); tCtx.lineTo(cx, py); tCtx.moveTo(cx, cy); tCtx.lineTo(cx, py); tCtx.stroke();
            tCtx.setLineDash([]);

            // Rayon et Point
            tCtx.beginPath(); tCtx.strokeStyle = '#666'; tCtx.lineWidth = 1; 
            tCtx.moveTo(cx, cy); tCtx.lineTo(px, py); tCtx.stroke();
            
            tCtx.beginPath(); tCtx.fillStyle = '#8459cf'; 
            tCtx.arc(px, py, 6, 0, Math.PI * 2); tCtx.fill();

            // Tangente (Vert) - Sauf si pi/2 ou 3pi/2
            if(closest.label !== "\\frac{\\pi}{2}" && closest.label !== "\\frac{3\\pi}{2}") {
                let tanVal = Math.tan(angle);
                let tanLen = tanVal * r;
                // Dessin simple de la tangente à droite (x = r)
                tCtx.beginPath(); tCtx.strokeStyle = 'green';
                tCtx.moveTo(cx + r, cy); 
                tCtx.lineTo(cx + r, cy - tanLen); 
                tCtx.stroke();
            }

            // 4. Mettre à jour le texte (Seulement si l'angle a changé)
            // On utilise l'index dans le tableau comme identifiant unique
            let currentIndex = remarkableValues.indexOf(closest);
            if(currentIndex !== lastRenderedIndex) {
                lastRenderedIndex = currentIndex;
                
                document.getElementById('val-angle-deg').innerText = (angle * 180 / Math.PI).toFixed(0);
                
                // Injection MathJax
                document.getElementById('val-angle-rad').innerHTML = `$${closest.label}$`;
                document.getElementById('val-cos').innerHTML = `$${closest.cos}$`;
                document.getElementById('val-sin').innerHTML = `$${closest.sin}$`;
                document.getElementById('val-tan').innerHTML = `$${closest.tan}$`;

                if(window.MathJax) {
                    MathJax.typesetPromise([
                        document.getElementById('val-angle-rad'),
                        document.getElementById('val-cos'),
                        document.getElementById('val-sin'),
                        document.getElementById('val-tan')
                    ]).catch(err => console.log(err));
                }
            }
        }

        function getTrigoAngle(evt) {
            const rect = trigoCanvas.getBoundingClientRect();
            const scaleX = trigoCanvas.width / rect.width;
            const scaleY = trigoCanvas.height / rect.height;
            const x = (evt.clientX - rect.left) * scaleX;
            const y = (evt.clientY - rect.top) * scaleY;
            return Math.atan2(-(y - trigoCanvas.height/2), x - trigoCanvas.width/2);
        }

        if(trigoCanvas) {
            trigoCanvas.addEventListener('mousedown', (e) => { isDraggingTrigo = true; drawTrigo(getTrigoAngle(e)); });
            trigoCanvas.addEventListener('mousemove', (e) => { if(isDraggingTrigo) drawTrigo(getTrigoAngle(e)); });
            window.addEventListener('mouseup', () => isDraggingTrigo = false);
            // Support tactile basique
            trigoCanvas.addEventListener('touchstart', (e) => { isDraggingTrigo = true; e.preventDefault(); }, {passive: false});
            trigoCanvas.addEventListener('touchmove', (e) => { 
                if(isDraggingTrigo) {
                    let touch = e.touches[0];
                    let mouseEvent = new MouseEvent("mousemove", { clientX: touch.clientX, clientY: touch.clientY });
                    drawTrigo(getTrigoAngle(mouseEvent));
                    e.preventDefault();
                }
            }, {passive: false});
        }

/* =============================================================================
   SECTION RÉCITATION & DÉFI 1 MINUTE
   ============================================================================= */

// 1. Initialisation de la vue Récitation
async function openRecitation(chapterNum) {
    currentChapterForReset = chapterNum;
    speedrunHistory = []; // Reset historique
    currentScore = 0;

    // Reset UI
    document.getElementById('recite-game-zone').style.display = 'block';
    document.getElementById('recite-results').style.display = 'none';
    document.getElementById('btn-start-speedrun').style.display = 'inline-flex';
    document.getElementById('recite-timer-bar').style.display = 'none';
    document.getElementById('btn-check-recite').style.display = 'flex';
    document.getElementById('recite-feedback').style.display = 'none';
    
    const { data, error } = await sb
        .from('flashcards')
        .select('*')
        .eq('class_id', state.currentClassCode)
        .eq('subject_id', state.currentSubject.toLowerCase())
        .eq('chapter_number', chapterNum);

    if (error || !data || data.length === 0) return alert("Pas de questions.");

    reciteChapterData = data.sort(() => 0.5 - Math.random());
    reciteIndex = 0;
    isSpeedRun = false; 
    
    document.getElementById('btn-start-speedrun').onclick = startSpeedRun;

    loadReciteQuestion();
    navigateTo('view-recite');
}

// 2. Charger une question
function loadReciteQuestion() {
    const q = reciteChapterData[reciteIndex];
    currentReciteQuestion = q;
    document.getElementById('recite-question').innerText = q.front;
    
    const mf = document.getElementById('math-input');
    if (mf) {
        mf.value = ""; 
        setTimeout(() => mf.focus(), 50);
    }
}

// 3. Logique du Défi (3, 2, 1... GO)
function startSpeedRun() {
    document.getElementById('recite-feedback').style.display = 'none';
    document.getElementById('btn-check-recite').style.display = 'flex'; 
    
    reciteChapterData = [...reciteChapterData].sort(() => 0.5 - Math.random());
    reciteIndex = 0;
    speedrunHistory = []; // On vide bien l'historique ici
    currentScore = 0;
    loadReciteQuestion();

    const gameZone = document.getElementById('recite-game-zone');
    let overlay = document.getElementById('recite-countdown-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'recite-countdown-overlay';
        overlay.style = "position:absolute; top:0; left:0; width:100%; height:100%; background:rgb(255,255,255); display:flex; align-items:center; justify-content:center; z-index:1000; font-size:8rem; font-weight:900; color:var(--brand-school); border-radius:20px;";
        gameZone.appendChild(overlay);
    }

    overlay.style.display = 'flex';
    let count = 3;
    overlay.innerText = count;

    const timer = setInterval(() => {
        count--;
        if (count > 0) overlay.innerText = count;
        else if (count === 0) { overlay.innerText = "GO !"; overlay.style.color = "var(--accent-green)"; }
        else {
            clearInterval(timer);
            overlay.style.display = 'none';
            initActualSpeedRun();
        }
    }, 1000);
}

// 4. Lancement du Chrono
function initActualSpeedRun() {
    isSpeedRun = true;
    timeLeft = 60;
    
    const timerBar = document.getElementById('recite-timer-bar');
    const timeDisplay = document.getElementById('recite-time-left');
    const scoreContainer = document.getElementById('recite-score-container');

    if(timerBar) timerBar.style.display = 'flex';
    if(scoreContainer) scoreContainer.style.display = 'none'; 
    if(timeDisplay) timeDisplay.innerText = "60";

    document.getElementById('btn-start-speedrun').style.display = 'none';
    document.getElementById('btn-check-recite').style.display = 'flex';

    if(reciteTimer) clearInterval(reciteTimer);
    reciteTimer = setInterval(() => {
        timeLeft--;
        if(timeDisplay) timeDisplay.innerText = timeLeft;
        if (timeLeft <= 0) { clearInterval(reciteTimer); showReciteResults(); }
    }, 1000);
}

// 5. VÉRIFICATION (Correction Enregistrement Historique)
function checkReciteAnswer() {
    if (!currentReciteQuestion) return;

    const mf = document.getElementById('math-input');
    // ON RÉCUPÈRE LE TEXTE AVANT TOUTE AUTRE CHOSE
    const userAnsRaw = mf ? mf.getValue() : ""; 
    
    const userAnsClean = userAnsRaw.toLowerCase().replace(/\\\,/g, '').replace(/\s+/g, '').replace(/\\/g, '').trim();
    const possibleAnswers = currentReciteQuestion.back.split('|');

    const isCorrect = possibleAnswers.some(answer => {
        const cleanPossible = answer.toLowerCase().replace(/\\\,/g, '').replace(/\s+/g, '').replace(/\\/g, '').trim();
        return userAnsClean === cleanPossible;
    });

    if (isSpeedRun) {
        // ON POUSSE DANS L'HISTORIQUE IMMÉDIATEMENT
        speedrunHistory.push({
            q: currentReciteQuestion.front,
            expected: possibleAnswers[0],
            userAns: userAnsRaw.trim() === "" ? "(vide)" : userAnsRaw,
            isCorrect: isCorrect
        });

        if (isCorrect) {
            currentScore++;
            document.getElementById('recite-score').innerText = currentScore;
        }
        
        loadNextOrFinish();
    } else {
        // Mode Normal
        const feedback = document.getElementById('recite-feedback');
        const btnCheck = document.getElementById('btn-check-recite');
        if (isCorrect) {
            btnCheck.style.display = 'none';
            feedback.style.display = 'block';
            feedback.style.backgroundColor = "#e8f8f0";
            document.getElementById('feedback-text').innerHTML = "Bravo ! 🎉";
        } else {
            btnCheck.style.display = 'none';
            feedback.style.display = 'block';
            feedback.style.backgroundColor = "#fce8e6";
            document.getElementById('feedback-text').innerHTML = "Faux... 🤔";
            const corrArea = document.getElementById('correction-area');
            corrArea.style.display = 'block';
            corrArea.innerHTML = `Attendu : $${possibleAnswers[0]}$`;
            if(window.MathJax) MathJax.typesetPromise([corrArea]);
        }
    }
}

function showReciteResults() {
    if(reciteTimer) clearInterval(reciteTimer);
    isSpeedRun = false;
    
    // 1. On cache tout ce qui précède pour ne pas laisser de place vide
    document.getElementById('recite-game-zone').style.display = 'none';
    document.getElementById('recite-timer-bar').style.display = 'none';
    
    // On force le conteneur à ne plus avoir de padding inutile
    const viewRecite = document.getElementById('view-recite');
    viewRecite.style.paddingBottom = "20px"; 

    // 2. Afficher les résultats
    const resDiv = document.getElementById('recite-results');
    resDiv.style.display = 'block';

    // 3. Scroll instantané vers le haut
    const mainContainer = document.querySelector('main');
    if (mainContainer) mainContainer.scrollTo({ top: 0, behavior: 'auto' });

    // 4. Mise à jour du score
    document.getElementById('speedrun-final-score').innerText = currentScore;

    // 5. Remplir la liste (design compact)
    const recapList = document.getElementById('speedrun-recap-list');
    if (recapList) {
        if (speedrunHistory.length === 0) {
            recapList.innerHTML = '<p style="text-align:center; color:#888; margin-top:30px;">Aucune réponse enregistrée.</p>';
        } else {
            let html = '';
            speedrunHistory.forEach((item, i) => {
                const color = item.isCorrect ? '#27ae60' : '#e74c3c';
                const icon = item.isCorrect ? '✅' : '❌';
                const bg = item.isCorrect ? '#f9fffb' : '#fff9f9';
                const cleanAns = item.userAns.replace(/\\/g, '');
                const cleanExp = item.expected.replace(/\\/g, '');

                html += `
                    <div style="background:${bg}; margin-bottom:8px; padding:10px; border-radius:10px; border-left: 4px solid ${color}; border-top: 1px solid #eee; border-right: 1px solid #eee; border-bottom: 1px solid #eee;">
                        <div style="font-weight:700; font-size:0.85rem; color:#333;">${i+1}. ${item.q}</div>
                        <div style="color:${color}; font-size:0.85rem; font-weight:600;">${icon} Toi : ${cleanAns}</div>
                        ${!item.isCorrect ? `<div style="color:#666; font-size:0.75rem; font-style:italic;">Attendu : ${cleanExp}</div>` : ''}
                    </div>`;
            });
            recapList.innerHTML = html;
        }
    }
    if(window.MathJax) MathJax.typesetPromise([recapList]);
}

function loadNextOrFinish() {
    reciteIndex++;
    if (reciteIndex < reciteChapterData.length) {
        loadReciteQuestion();
    } else {
        if (isSpeedRun) {
            reciteChapterData = [...reciteChapterData].sort(() => 0.5 - Math.random());
            reciteIndex = 0;
            loadReciteQuestion();
        } else {
            navigateTo('view-chapters');
        }
    }
}

/* ==========================================
   OUTILS : ANNALES & PDF STORAGE
   ========================================== */

async function initBiblio() {
    // On récupère les données de la table 'annales'
    const { data, error } = await sb
        .from('annales')
        .select('*')
        .order('year', { ascending: false });

    if (error) {
        console.error("Erreur annales:", error.message);
        return;
    }

    // On garde une copie pour le filtrage
    window.allAnnales = data; 
    renderAnnales(data);
}

function renderAnnales(data) {
    const grid = document.getElementById('biblio-grid');
    const noResult = document.getElementById('no-result');
    if(!grid) return;
    
    grid.innerHTML = '';

    if (!data || data.length === 0) {
        if(noResult) noResult.style.display = 'block';
        return;
    } else {
        if(noResult) noResult.style.display = 'none';
    }

    const baseUrl = `https://kuuxhzyfnqrdoewfoiyf.supabase.co/storage/v1/object/public/annales/`;

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = `annale-card ${item.subject.toLowerCase()}`;
        
        let chapters = [];
        try {
            chapters = typeof item.chapters === 'string' ? JSON.parse(item.chapters) : item.chapters;
        } catch(e) { chapters = []; }

        let tagsHtml = (chapters || []).map(chap => `<span class="tag">${chap}</span>`).join('');

        // URLs des fichiers
        const linkSujet = item.file_sujet ? baseUrl + item.file_sujet : "#";
        const linkCorrige = item.file_corrige ? baseUrl + item.file_corrige : "#";

        card.innerHTML = `
            <div class="annale-header">
                <span class="annale-subject">${item.subject}</span>
                <span class="annale-year">${item.year}</span>
            </div>
            <div class="annale-title">${item.title}</div>
            <div class="annale-tags">${tagsHtml}</div>
            
            <div class="annale-actions">
                <button 
                    onclick="openPdfModal('${linkSujet}', 'Sujet : ${item.title.replace(/'/g, "\\'")}')" 
                    class="btn-pdf btn-sujet" 
                    ${linkSujet === "#" ? 'disabled style="opacity:0.5;pointer-events:none"' : ''}>
                    📄 Sujet
                </button>
                
                <button 
                    onclick="openPdfModal('${linkCorrige}', 'Corrigé : ${item.title.replace(/'/g, "\\'")}')" 
                    class="btn-pdf btn-corrige" 
                    ${linkCorrige === "#" ? 'disabled style="opacity:0.5;pointer-events:none"' : ''}>
                    📝 Corrigé
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

/* --- NAVIGATION DE RETOUR CORRIGÉE --- */

// Cette fonction remplace "goBackToSubjects" pour être plus intelligente
function backFromChapters() {
    // Si l'élève est en mode Quiz/Exo/Flashcard, on le renvoie au choix du mode
    // Sinon (mode lesson), on le renvoie à la liste des matières
    if (state.currentMode !== 'lesson') {
        navigateTo('view-mode');
    } else {
        openSubjectsPage(state.currentClassCode);
    }
}

function goBackToClasses() { 
    openLevelPage(state.currentLevelGroup); 
}

// Optionnel : si tu veux garder ce nom pour tes boutons existants
function goBackToSubjects() { 
    openSubjectsPage(state.currentClassCode); 
}

function openPdfModal(pdfUrl, title) {
    const modal = document.getElementById('pdf-modal');
    const viewer = document.getElementById('pdf-viewer');
    const titleSpan = document.getElementById('pdf-title');
    
    titleSpan.innerText = title;
    viewer.src = pdfUrl; // On charge l'URL du PDF
    modal.style.display = 'flex';
}

function closePdfModal() {
    const modal = document.getElementById('pdf-modal');
    const viewer = document.getElementById('pdf-viewer');
    
    modal.style.display = 'none';
    viewer.src = ''; // On vide l'iframe pour stopper le chargement
}

/* =============================================================================
   6. INITIALISATION (CORRIGÉE POLICE & VALIDATION)
   ============================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('site-search');
    if (searchInput) searchInput.addEventListener('input', performSearch);

    const mf = document.getElementById('math-input');
    if (mf) {
        mf.inlineShortcuts = {}; 
        mf.defaultMode = 'text'; 
        mf.style.fontFamily = "system-ui, -apple-system, sans-serif";

        mf.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                checkReciteAnswer();
            }
            if (ev.code === 'Space') {
                ev.preventDefault(); 
                mf.insert('\\,'); 
            }
        });
    }

    updateFloatingCalcVisibility();
});

/* =============================================================================
   SYSTÈME D'AUTHENTIFICATION & PROFILS
   ============================================================================= */

let authMode = 'signup'; 
let currentUser = null;
let userProfile = null;

// 1. Basculer entre Inscription et Connexion
function toggleAuthMode() {
    authMode = (authMode === 'signup') ? 'login' : 'signup';
    const btn = document.getElementById('btn-auth-action');
    const switchTxt = document.getElementById('auth-switch');
    const signupFields = document.getElementById('signup-fields');
    
    if (authMode === 'login') {
        btn.innerText = "Se connecter";
        switchTxt.innerText = "Pas de compte ? S'inscrire";
        signupFields.style.display = 'none';
    } else {
        btn.innerText = "Créer mon compte";
        switchTxt.innerText = "Déjà un compte ? Se connecter";
        signupFields.style.display = 'flex';
    }
}

// 2. Logique principale (SignUp / Login)
async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const msg = document.getElementById('auth-msg');

    if (!email || !password) return showError("Remplit tous les champs !");

    if (authMode === 'signup') {
        const prenom = document.getElementById('reg-prenom').value;
        const nom = document.getElementById('reg-nom').value;
        const phone = document.getElementById('auth-phone').value;

        if (!prenom || !nom || !phone) return showError("Toutes les infos sont requises.");

        // A. Inscription dans le système Auth de Supabase
        const { data: authData, error: authError } = await sb.auth.signUp({ email, password });
        if (authError) return showError(authError.message);

        // B. Création de la fiche dans ta table 'profiles'
        const { error: profError } = await sb.from('profiles').insert([
            { 
                id: authData.user.id, 
                nom: nom, 
                prenom: prenom, 
                phone: phone, 
                selected_chapters: [] 
            }
        ]);

        if (profError) {
            console.error(profError);
            return showError("Erreur profil ou téléphone déjà utilisé.");
        }

        msg.style.display = 'block';
        msg.style.color = 'green';
        msg.innerText = "Inscription réussie ! Bienvenue.";
        setTimeout(() => navigateTo('view-home'), 1500);

    } else {
        // Mode Connexion
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return showError("Email ou mot de passe incorrect.");
        navigateTo('view-home');
    }
}

function showError(text) {
    const msg = document.getElementById('auth-msg');
    msg.style.display = 'block';
    msg.style.color = 'red';
    msg.innerText = text;
}

// 3. Déconnexion
async function handleLogout() {
    await sb.auth.signOut();
    window.location.reload();
}

// 4. Écouteur automatique d'état (Version Sécurisée)
sb.auth.onAuthStateChange(async (event, session) => {
    const navAuth = document.getElementById('nav-auth');
    const navUser = document.getElementById('nav-user');
    const navLogout = document.getElementById('nav-logout');
    const userNameSpan = document.getElementById('user-name');

    if (session) {
        currentUser = session.user;
        
        // On récupère les infos du profil de manière sécurisée
        const { data: profile, error } = await sb
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle(); // maybeSingle est plus robuste que single()

        if (profile) {
            userProfile = profile;
            if(userNameSpan) userNameSpan.innerText = profile.prenom;
        }

        // Mise à jour de l'interface
        if(navAuth) navAuth.style.display = 'none';
        if(navUser) navUser.style.display = 'block';
        if(navLogout) navLogout.style.display = 'block';
        
    } else {
        // Mode Déconnecté
        currentUser = null;
        userProfile = null;
        if(navAuth) navAuth.style.display = 'block';
        if(navUser) navUser.style.display = 'none';
        if(navLogout) navLogout.style.display = 'none';
    }
});
