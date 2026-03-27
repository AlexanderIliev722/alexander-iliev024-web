// --- НОВО: 1. Импортваме Transformers.js за локален AI ---
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0';

let aiClassifier = null;

// Асинхронно зареждане на AI модела във фона
(async function loadAI() {
    const statusDiv = document.getElementById('ai-status');
    if (!statusDiv) return;

    try {
        statusDiv.innerText = '[AI Module]: Loading NLP model in browser (Edge AI)...';
        aiClassifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
        statusDiv.innerText = '[AI Module]: Ready. Local inference active. 🟢';
    } catch (err) {
        statusDiv.innerText = '[AI Module]: Failed to load. Operating in standard mode.';
    }
})();
// ---------------------------------------------------------

// ВАЖНО: Премахнахме DOMContentLoaded, кодът се изпълнява директно!

const urlParams = new URLSearchParams(window.location.search);
let companyName = urlParams.get('company');

if (companyName) {
    const formattedCompanyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
    const companySpans = document.querySelectorAll('.dynamic-company');
    companySpans.forEach(span => span.textContent = formattedCompanyName);

    const serverName = companyName.toLowerCase().replace(/\s+/g, '-');
    const serverSpans = document.querySelectorAll('.dynamic-server');
    serverSpans.forEach(span => span.textContent = serverName);
}

// --- НОВО: Логика за предаване на името към 404 страницата ---
const errorLink = document.querySelector('a[href="/error-test"]');
if (errorLink && companyName) {
    // Променяме линка динамично: от "/error-test" става "/error-test?company=Името"
    errorLink.href = `/error-test?company=${encodeURIComponent(companyName)}`;
}
// -----------------------------------------------------------

const sections = document.querySelectorAll('.section');
const navBtns = document.querySelectorAll('.nav-btn');
const contactForm = document.getElementById('contact');
const successMsg = document.getElementById('success-message');
const messageField = document.getElementById('field-message'); // Извличаме полето за съобщение
const aiStatus = document.getElementById('ai-status');         // Извличаме полето за AI статус

// --- НОВО: 2. Локален AI анализ при писане (ОПТИМИЗИРАН С DEBOUNCE) ---
let aiTimeout; // Променлива, която ще пази таймера
if (messageField && aiStatus) {
    messageField.addEventListener('input', async (e) => {
        const text = e.target.value;
        if (!aiClassifier || text.length < 5) {
            if (aiClassifier && text.length < 5) aiStatus.innerText = '[AI Module]: Ready. Local inference active. 🟢';
            return;
        }
        aiStatus.innerText = '[AI Module]: Waiting for typing to pause...';
        clearTimeout(aiTimeout);// Изчистваме стария таймер при всяко ново натискане на клавиш

        aiTimeout = setTimeout(async () => {
            aiStatus.innerText = '[AI Module]: Analyzing...';
            try {
                const result = await aiClassifier(text);
                let label = result[0].label; // Взимаме оригиналния етикет (POSITIVE/NEGATIVE)
                const score = Math.round(result[0].score * 100); // Взимаме процента сигурност

                let color = '';

                // НОВО: Добавяме наша логика за NEUTRAL
                if (score < 75) {
                    label = 'NEUTRAL';
                    color = '#8d8d8d'; // Сив цвят за неутрално
                } else if (label === 'POSITIVE') {
                    color = '#24a148'; // Зелен цвят за позитивно
                } else {
                    color = '#fa4d56'; // Червен цвят за негативно
                }

                aiStatus.innerHTML = `[AI Analysis]: Intent is <span style="color: ${color}">${label} (${score}%)</span>. Local processing.`;
            } catch (err) {
                aiStatus.innerText = '[AI Module]: Analysis error.';
            }
        }, 800); // 800 милисекунди изчакване
    });
}
// ---------------------------------------------

function switchTab(tabId, clickedBtn, isUserClick = true) {
    sections.forEach(s => s.classList.remove('active-section'));
    navBtns.forEach(b => b.classList.remove('active'));

    const targetSection = document.getElementById(tabId);
    if (targetSection) targetSection.classList.add('active-section');
    if (clickedBtn) clickedBtn.classList.add('active');

    if (tabId === 'cover-letter' && contactForm && successMsg) {
        contactForm.style.display = 'block';
        successMsg.style.display = 'none';
    }

    localStorage.setItem('activeTab', tabId);
    if (isUserClick) window.scrollTo(0, 0);
}

// ... (нагоре кодът е същият) ...

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = contactForm.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerText = '> Executing...'; // Променяме текста за по-добър ефект

        const name = document.getElementById('field-name').value;
        const email = document.getElementById('field-email').value;
        const message = messageField.value;

        // --- 1. ПОКАЗВАМЕ СЪОБЩЕНИЕТО И ПУСКАМЕ ГЛАСА ВЕДНАГА ---
        // Текстът, който ще се покаже на екрана:
        const displayMessage = `Здравейте, ${name}! Съобщението ви е изпратено успешно.`;
        successMsg.querySelector('p').textContent = displayMessage;

        // ВАЖНО: Тези два реда липсваха! Скриват формата и показват зеленото съобщение:
        contactForm.style.display = 'none';
        successMsg.style.display = 'block';

        if ('speechSynthesis' in window) {
            console.log("Гласовият модул е активен. Опит за прочитане на английски...");

            // Спираме предишни гласове
            window.speechSynthesis.cancel();

            // Текстът, който AI-ът ще ИЗГОВОРИ (на английски):
            const spokenMessage = `Hello, ${name}! Message received successfully. My AI assistant is currently generating an automatic response to your email. Talk to you soon!`;

            const utterance = new SpeechSynthesisUtterance(spokenMessage);

            // Слагаме английски език (en-US за американски или en-GB за британски акцент)
            utterance.lang = 'en-GB';

            // Правим го да звучи малко по-естествено (леко по-бавно)
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            window.speechSynthesis.speak(utterance);
        }
        else {
            console.warn("Този браузър не поддържа SpeechSynthesis.");
        }
        // -----------------------------------------------------------

        // --- 2. ПРАЩАМЕ ДАННИТЕ КЪМ СЪРВЪРА ВЪВ ФОНА ---
        try {
            const checkFirebase = () => {
                return new Promise((resolve) => {
                    const interval = setInterval(() => {
                        if (window.firebaseDB) {
                            clearInterval(interval);
                            resolve(window.firebaseDB);
                        }
                    }, 100);
                });
            };

            const { db, collection, addDoc, serverTimestamp } = await checkFirebase();


            const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/s9p18yw8wiqtkryf1s0h04i6akc8wvl3';
            // --- НОВО: Линкът към твоя Google Apps Script ---
            const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbym-decQLHy0OIiiijJe_c-1ArkL2TeOSrqsvp7eHiSTtSwbQY4YsAmxgGo1XnozC5m/exec';

            // Чакаме паралелното изпълнение на ТРИТЕ задачи
            await Promise.all([

                // 1. Запис във Firebase (за историята)
                addDoc(collection(db, 'messages'), {
                    name, email, message,
                    timestamp: serverTimestamp()
                }),

                // 2. Изпращане към Make.com (за да се задейства AI отговорът на HR-а)
                fetch(MAKE_WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        "name": name,
                        "email": email,
                        "message": message
                    })
                }),

                // 3. --- НОВО: Изпращане към Google Apps Script (Безкрайни имейли + Таблица) ---
                fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors', // ВАЖНО: Това предотвратява CORS грешки в браузъра!
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        "name": name,
                        "email": email,
                        "message": message
                    })
                })
            ]);

            contactForm.reset();
            if (aiStatus) aiStatus.innerText = '[AI Module]: Ready. Local inference active. 🟢';
            submitBtn.disabled = false;
            submitBtn.innerText = '> ./send_message.sh';

        } catch (error) {
            console.error('Грешка:', error);
            successMsg.style.display = 'none';
            contactForm.style.display = 'block';
            alert('Имаше проблем с изпращането към сървъра. Моля, опитайте пак.');
            submitBtn.disabled = false;
            submitBtn.innerText = '> ./send_message.sh';
        }
    });
}

navBtns.forEach(btn => {
    btn.addEventListener('click', function () {
        switchTab(this.getAttribute('data-tab'), this, true);
    });
});

window.addEventListener('beforeunload', () => {
    localStorage.setItem('scrollPosition', window.scrollY);
});

const savedTab = localStorage.getItem('activeTab') || 'cover-letter';
const targetBtn = document.querySelector(`.nav-btn[data-tab="${savedTab}"]`);

if (targetBtn) {
    switchTab(savedTab, targetBtn, false);
}

const savedScroll = localStorage.getItem('scrollPosition');
if (savedScroll) {
    setTimeout(() => window.scrollTo(0, parseInt(savedScroll, 10)), 100);
}