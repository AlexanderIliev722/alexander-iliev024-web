document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('.section');
    const navBtns = document.querySelectorAll('.nav-btn');
    const contactForm = document.getElementById('contact');
    const successMsg = document.getElementById('success-message');

    function switchTab(tabId, clickedBtn, isUserClick = true) {
        sections.forEach(s => s.classList.remove('active-section'));
        navBtns.forEach(b => b.classList.remove('active'));

        const targetSection = document.getElementById(tabId);
        if (targetSection) targetSection.classList.add('active-section');
        if (clickedBtn) clickedBtn.classList.add('active');

        // Reset contact form visibility when returning to Cover Letter
        if (tabId === 'cover-letter' && contactForm && successMsg) {
            contactForm.style.display = 'block';
            successMsg.style.display = 'none';
        }

        localStorage.setItem('activeTab', tabId);
        if (isUserClick) window.scrollTo(0, 0);
    }

    // Contact form submission → Firestore + Formspree
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('field-name').value;
            const email = document.getElementById('field-email').value;
            const message = document.getElementById('field-message').value;

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

                await Promise.all([
                    addDoc(collection(db, 'messages'), {
                        name, email, message,
                        timestamp: serverTimestamp()
                    }),
                    fetch('https://formspree.io/f/xgonrgrw', {
                        method: 'POST',
                        body: new FormData(contactForm),
                        headers: { 'Accept': 'application/json' }
                    })
                ]);

                contactForm.style.display = 'none';
                successMsg.style.display = 'block';
                contactForm.reset();

            } catch (error) {
                console.error('Грешка:', error);
                alert('Имаше проблем с изпращането. Моля, опитайте пак.');
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
});
