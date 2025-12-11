/**
 * Quiz App - Psychologically Optimized for Learning
 * 
 * Key principles:
 * - Tiny wins (5-20 question sessions)
 * - Streak momentum with celebrations
 * - Encouraging language everywhere
 * - Built-in break reminders
 * - No scary numbers
 */

const app = {
    // State
    questions: [],
    filteredQuestions: [],
    currentIndex: 0,
    sessionCorrect: 0,
    sessionTotal: 0,
    selectedTopic: null,
    isReviewMode: false,
    quizLength: 10,
    
    // Streak tracking
    currentStreak: 0,
    bestStreak: 0,
    
    // Break system
    questionsSinceBreak: 0,
    BREAK_INTERVAL: 10, // Suggest break every 10 questions
    
    // Storage keys
    STORAGE_KEY: 'quizProgress',
    SESSION_KEY: 'quizSession',
    
    // Timing
    AUTO_ADVANCE_DELAY: 1200, // Slightly longer to enjoy the win
    
    // Prevent double-submit
    answerSelected: false,
    
    // Break tips
    breakTips: [
        "💡 Stretch your arms above your head!",
        "💡 Take 3 deep breaths - in through nose, out through mouth",
        "💡 Look away from the screen at something far away",
        "💡 Roll your shoulders back a few times",
        "💡 Drink some water! Hydration helps you think",
        "💡 Wiggle your fingers and toes",
        "💡 Close your eyes for 10 seconds",
        "💡 You're doing great - be proud of yourself!"
    ],
    
    // Encouraging messages for correct answers
    correctMessages: [
        "Yes! You got it! 🎉",
        "Perfect! 🌟",
        "Awesome! 💪",
        "You're on fire! 🔥",
        "Brilliant! ⭐",
        "Nailed it! 🎯",
        "Amazing! ✨",
        "So smart! 🧠",
        "Wonderful! 🌈",
        "Exactly right! 💫"
    ],
    
    // Encouraging messages for wrong answers (no shame!)
    wrongMessages: [
        "Good try! Now you know this one 💡",
        "Oops! But now you'll remember it 🧠",
        "That's how we learn! 📚",
        "Almost! You'll get it next time 💪",
        "Learning moment! 🌱",
        "Now this one will stick! ✨"
    ],
    
    // Initialize
    async init() {
        this.loadQuestions();
        this.loadProgress();
        this.renderHome();
        this.renderTopicTags();
        this.setupKeyboardShortcuts();
        this.checkForSavedSession();
    },
    
    // ============ QUESTION LOADING ============
    
    loadQuestions() {
        if (typeof QUIZ_QUESTIONS !== 'undefined' && Array.isArray(QUIZ_QUESTIONS)) {
            this.questions = this.validateQuestions(QUIZ_QUESTIONS);
            console.log(`Loaded ${this.questions.length} questions`);
            return;
        }
        this.loadQuestionsFromJSON();
    },
    
    async loadQuestionsFromJSON() {
        try {
            const response = await fetch('questions.json');
            if (!response.ok) throw new Error('Failed to load');
            const data = await response.json();
            this.questions = this.validateQuestions(data);
            this.renderTopicTags();
            this.loadProgress();
        } catch (error) {
            console.error('Error loading questions:', error);
            this.questions = [];
        }
    },
    
    validateQuestions(questions) {
        return questions.filter(q => {
            if (!q.id || !q.question || !q.correct) return false;
            const correctLetter = String(q.correct).toUpperCase().trim();
            if (!['A', 'B', 'C', 'D'].includes(correctLetter)) return false;
            q.correct = correctLetter;
            if (!q.options || !q.options[correctLetter]) return false;
            return true;
        });
    },
    
    // ============ PROGRESS MANAGEMENT ============
    
    getProgress() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : this.getEmptyProgress();
        } catch (e) {
            return this.getEmptyProgress();
        }
    },
    
    getEmptyProgress() {
        return {
            attempted: {},
            totalCorrect: 0,
            totalAttempts: 0,
            bestStreak: 0,
            todayCount: 0,
            todayDate: new Date().toDateString()
        };
    },
    
    saveProgress(progress) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
        } catch (e) {
            console.error('Error saving:', e);
        }
    },
    
    loadProgress() {
        const progress = this.getProgress();
        
        // Reset today count if new day
        if (progress.todayDate !== new Date().toDateString()) {
            progress.todayCount = 0;
            progress.todayDate = new Date().toDateString();
            this.saveProgress(progress);
        }
        
        this.bestStreak = progress.bestStreak || 0;
        this.updateHomeScreen(progress);
        this.updateMistakesBadge(progress);
    },
    
    recordAnswer(questionId, selectedAnswer, isCorrect) {
        const progress = this.getProgress();
        
        if (!progress.attempted[questionId]) {
            progress.attempted[questionId] = { correct: false, attempts: 0 };
        }
        
        progress.attempted[questionId].attempts++;
        progress.attempted[questionId].lastAnswer = selectedAnswer;
        
        if (isCorrect && !progress.attempted[questionId].correct) {
            progress.totalCorrect++;
            progress.attempted[questionId].correct = true;
        }
        
        progress.totalAttempts++;
        progress.todayCount = (progress.todayCount || 0) + 1;
        progress.todayDate = new Date().toDateString();
        
        // Update best streak
        if (this.currentStreak > (progress.bestStreak || 0)) {
            progress.bestStreak = this.currentStreak;
            this.bestStreak = this.currentStreak;
        }
        
        this.saveProgress(progress);
    },
    
    getMistakes() {
        const progress = this.getProgress();
        return this.questions.filter(q => {
            const attempt = progress.attempted[q.id];
            return attempt && !attempt.correct;
        });
    },
    
    // ============ HOME SCREEN ============
    
    updateHomeScreen(progress) {
        const todayCount = progress.todayCount || 0;
        const correctCount = progress.totalCorrect || 0;
        const encouragement = document.getElementById('home-encouragement');
        const subtitle = document.getElementById('home-subtitle');
        
        // Personalized encouraging message based on progress
        if (todayCount === 0) {
            encouragement.textContent = "Let's start! Pick how many questions you want to try 👇";
            subtitle.textContent = "Every question you try helps you learn! 💪";
        } else if (todayCount < 10) {
            encouragement.textContent = `You've practiced ${todayCount} questions today! Keep going! 🌟`;
            subtitle.textContent = "You're doing great! 💪";
        } else if (todayCount < 30) {
            encouragement.textContent = `Wow! ${todayCount} questions today! You're on a roll! 🔥`;
            subtitle.textContent = "Amazing effort! 🌟";
        } else {
            encouragement.textContent = `${todayCount} questions today?! You're a superstar! ⭐`;
            subtitle.textContent = "Incredible dedication! 🏆";
        }
        
        // Show streak if they have one
        if (this.bestStreak >= 3) {
            subtitle.textContent += ` Best streak: ${this.bestStreak} 🔥`;
        }
    },
    
    updateMistakesBadge(progress) {
        const mistakes = this.getMistakes();
        const badge = document.getElementById('mistakes-badge');
        const reviewBtn = document.getElementById('review-btn');
        
        badge.textContent = mistakes.length;
        badge.dataset.count = mistakes.length;
        reviewBtn.style.display = mistakes.length > 0 ? 'flex' : 'none';
    },
    
    renderTopicTags() {
        const topics = [...new Set(this.questions.map(q => q.topic))].filter(Boolean);
        const container = document.getElementById('topic-tags');
        container.replaceChildren();
        
        // "All" button
        const allBtn = document.createElement('button');
        allBtn.className = 'topic-tag active';
        allBtn.textContent = 'All Topics';
        allBtn.addEventListener('click', () => this.selectTopic(allBtn, ''));
        container.appendChild(allBtn);
        
        topics.forEach(topic => {
            const btn = document.createElement('button');
            btn.className = 'topic-tag';
            btn.textContent = topic;
            btn.addEventListener('click', () => this.selectTopic(btn, topic));
            container.appendChild(btn);
        });
    },
    
    selectTopic(btn, topic) {
        document.querySelectorAll('.topic-tag').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        this.selectedTopic = topic || null;
    },
    
    renderHome() {
        const progress = this.getProgress();
        this.updateHomeScreen(progress);
        this.updateMistakesBadge(progress);
    },
    
    // ============ NAVIGATION ============
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    },
    
    goHome() {
        this.loadProgress();
        this.showScreen('home-screen');
    },
    
    confirmExit() {
        document.getElementById('exit-modal').classList.remove('hidden');
    },
    
    cancelExit() {
        document.getElementById('exit-modal').classList.add('hidden');
    },
    
    confirmExitYes() {
        document.getElementById('exit-modal').classList.add('hidden');
        this.goHome();
    },
    
    // ============ QUIZ LOGIC ============
    
    startQuickQuiz(count) {
        this.isReviewMode = false;
        this.quizLength = count;
        
        const progress = this.getProgress();
        let questions = [...this.questions];
        
        // Filter by topic
        if (this.selectedTopic) {
            questions = questions.filter(q => q.topic === this.selectedTopic);
        }
        
        // Get unanswered questions
        const unanswered = questions.filter(q => {
            const attempt = progress.attempted[q.id];
            return !attempt || !attempt.correct;
        });
        
        if (unanswered.length === 0) {
            // All done! Celebrate!
            this.showAllDoneMessage(questions.length);
            return;
        }
        
        // Shuffle and take only what we need
        this.filteredQuestions = this.shuffle(unanswered).slice(0, count);
        this.currentIndex = 0;
        this.sessionCorrect = 0;
        this.sessionTotal = 0;
        this.currentStreak = 0;
        this.questionsSinceBreak = 0;
        
        this.saveSession();
        this.showScreen('quiz-screen');
        this.renderQuestion();
        this.updateStreakDisplay();
    },
    
    startPractice() {
        // Default to 10 questions
        this.startQuickQuiz(10);
    },
    
    startReview() {
        this.isReviewMode = true;
        const mistakes = this.getMistakes();
        
        if (mistakes.length === 0) {
            alert('No mistakes to review! Amazing! 🎉');
            return;
        }
        
        this.filteredQuestions = this.shuffle(mistakes).slice(0, 20);
        this.currentIndex = 0;
        this.sessionCorrect = 0;
        this.sessionTotal = 0;
        this.currentStreak = 0;
        this.questionsSinceBreak = 0;
        
        this.saveSession();
        this.showScreen('quiz-screen');
        this.renderQuestion();
        this.updateStreakDisplay();
    },
    
    showAllDoneMessage(totalQuestions) {
        const topicText = this.selectedTopic ? ` in ${this.selectedTopic}` : '';
        alert(`🎉 Amazing! You've mastered all ${totalQuestions} questions${topicText}!\n\nYou're totally ready for your exam! 💪`);
    },
    
    // ============ QUESTION RENDERING ============
    
    renderQuestion() {
        const question = this.filteredQuestions[this.currentIndex];
        this.answerSelected = false;
        
        // Update progress
        const progress = ((this.currentIndex) / this.filteredQuestions.length) * 100;
        document.getElementById('progress-fill').style.width = `${progress}%`;
        document.getElementById('progress-text').textContent = 
            `${this.currentIndex + 1}/${this.filteredQuestions.length}`;
        
        // Question content
        document.getElementById('question-topic').textContent = question.topic || 'General';
        document.getElementById('question-text').textContent = question.question;
        
        // Show waiting prompt in feedback area
        const feedbackArea = document.getElementById('feedback-area');
        feedbackArea.innerHTML = '';
        const waitingPrompt = document.createElement('div');
        waitingPrompt.className = 'waiting-prompt';
        waitingPrompt.innerHTML = '<div class="waiting-emoji">👆</div><div class="waiting-text">Pick an answer!</div>';
        feedbackArea.appendChild(waitingPrompt);
        
        // Hide streak banner
        document.getElementById('streak-banner').classList.remove('show');
        
        // Render options
        const container = document.getElementById('options-container');
        container.replaceChildren();
        
        ['A', 'B', 'C', 'D'].forEach(letter => {
            const optionText = question.options[letter];
            if (!optionText || !optionText.trim()) return;
            
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.dataset.letter = letter;
            
            const letterSpan = document.createElement('span');
            letterSpan.className = 'option-letter';
            letterSpan.textContent = letter;
            
            const textSpan = document.createElement('span');
            textSpan.className = 'option-text';
            textSpan.textContent = optionText;
            
            btn.appendChild(letterSpan);
            btn.appendChild(textSpan);
            btn.addEventListener('click', () => this.selectAnswer(letter));
            container.appendChild(btn);
        });
    },
    
    // ============ ANSWER HANDLING ============
    
    selectAnswer(selected) {
        if (this.answerSelected) return;
        this.answerSelected = true;
        
        const question = this.filteredQuestions[this.currentIndex];
        const correct = question.correct;
        const isCorrect = selected === correct;
        
        this.sessionTotal++;
        this.questionsSinceBreak++;
        
        if (isCorrect) {
            this.sessionCorrect++;
            this.currentStreak++;
        } else {
            this.currentStreak = 0;
        }
        
        this.recordAnswer(question.id, selected, isCorrect);
        this.updateStreakDisplay();
        
        // Highlight options
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.letter === correct) {
                btn.classList.add('correct');
            } else if (btn.dataset.letter === selected && !isCorrect) {
                btn.classList.add('wrong');
            }
        });
        
        if (isCorrect) {
            this.showCorrectFeedback();
            this.checkStreakCelebration();
            
            // Mini confetti for correct
            if (this.currentStreak >= 3) {
                this.spawnConfetti(10);
            }
            
            setTimeout(() => this.nextQuestion(), this.AUTO_ADVANCE_DELAY);
        } else {
            this.showWrongFeedback(question, correct);
        }
    },
    
    showCorrectFeedback() {
        const area = document.getElementById('feedback-area');
        area.replaceChildren();
        
        const card = document.createElement('div');
        card.className = 'feedback-card';
        
        const icon = document.createElement('div');
        icon.className = 'feedback-icon';
        icon.textContent = '✨';
        
        const message = document.createElement('div');
        message.className = 'feedback-message correct';
        message.textContent = this.getRandomMessage(this.correctMessages);
        
        card.appendChild(icon);
        card.appendChild(message);
        area.appendChild(card);
    },
    
    showWrongFeedback(question, correct) {
        const area = document.getElementById('feedback-area');
        area.replaceChildren();
        
        const card = document.createElement('div');
        card.className = 'feedback-card';
        
        // Encouraging message (no shame!)
        const message = document.createElement('div');
        message.className = 'feedback-message wrong';
        message.textContent = this.getRandomMessage(this.wrongMessages);
        
        // Correct answer box
        const correctBox = document.createElement('div');
        correctBox.className = 'correct-answer-box';
        
        const correctLabel = document.createElement('div');
        correctLabel.className = 'correct-answer-label';
        correctLabel.textContent = 'The answer is:';
        
        const correctText = document.createElement('div');
        correctText.className = 'correct-answer-text';
        correctText.textContent = `${correct}) ${question.options[correct]}`;
        
        correctBox.appendChild(correctLabel);
        correctBox.appendChild(correctText);
        
        // Explanation
        if (question.explanation) {
            const explainBox = document.createElement('div');
            explainBox.className = 'explanation-box';
            
            const explainLabel = document.createElement('div');
            explainLabel.className = 'explanation-label';
            explainLabel.textContent = '💡 Remember:';
            
            const explainText = document.createElement('div');
            explainText.className = 'explanation-text';
            explainText.textContent = question.explanation;
            
            explainBox.appendChild(explainLabel);
            explainBox.appendChild(explainText);
            card.appendChild(message);
            card.appendChild(correctBox);
            card.appendChild(explainBox);
        } else {
            card.appendChild(message);
            card.appendChild(correctBox);
        }
        
        // Learning tip
        const tip = document.createElement('div');
        tip.className = 'learning-tip';
        tip.textContent = "Now you'll definitely remember this on the exam! 🧠";
        card.appendChild(tip);
        
        // Next button
        const btnContainer = document.createElement('div');
        btnContainer.className = 'next-btn-container';
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-primary';
        nextBtn.textContent = 'Got it! Next →';
        nextBtn.addEventListener('click', () => this.nextQuestion());
        
        btnContainer.appendChild(nextBtn);
        card.appendChild(btnContainer);
        
        area.appendChild(card);
    },
    
    // ============ STREAK SYSTEM ============
    
    updateStreakDisplay() {
        const fire = document.getElementById('streak-fire');
        const count = document.getElementById('streak-count');
        
        count.textContent = this.currentStreak;
        
        if (this.currentStreak >= 2) {
            fire.classList.add('active');
        } else {
            fire.classList.remove('active');
        }
    },
    
    checkStreakCelebration() {
        const banner = document.getElementById('streak-banner');
        const bannerText = document.getElementById('streak-banner-text');
        
        if (this.currentStreak === 3) {
            bannerText.textContent = '🔥 3 in a row! Nice!';
            banner.classList.add('show');
        } else if (this.currentStreak === 5) {
            bannerText.textContent = '🔥🔥 5 streak! You\'re on fire!';
            banner.classList.add('show');
        } else if (this.currentStreak === 10) {
            bannerText.textContent = '🔥🔥🔥 10 STREAK! UNSTOPPABLE!';
            banner.classList.add('show');
        } else if (this.currentStreak > 10 && this.currentStreak % 5 === 0) {
            bannerText.textContent = `🔥 ${this.currentStreak} streak! LEGENDARY!`;
            banner.classList.add('show');
        }
    },
    
    // ============ NEXT QUESTION / BREAKS ============
    
    nextQuestion() {
        this.currentIndex++;
        this.saveSession();
        
        // Check if we should offer a break
        if (this.questionsSinceBreak >= this.BREAK_INTERVAL && 
            this.currentIndex < this.filteredQuestions.length) {
            this.showBreakScreen();
            return;
        }
        
        if (this.currentIndex >= this.filteredQuestions.length) {
            this.showComplete();
        } else {
            this.renderQuestion();
        }
    },
    
    // ============ BREAK SCREEN ============
    
    showBreakScreen() {
        document.getElementById('break-done').textContent = this.sessionTotal;
        document.getElementById('break-correct').textContent = this.sessionCorrect;
        document.getElementById('break-tip').textContent = this.getRandomMessage(this.breakTips);
        
        this.showScreen('break-screen');
        
        // Countdown
        let countdown = 30;
        const countdownEl = document.getElementById('break-countdown');
        
        this.breakTimer = setInterval(() => {
            countdown--;
            countdownEl.textContent = countdown;
            
            if (countdown <= 0) {
                this.skipBreak();
            }
        }, 1000);
    },
    
    skipBreak() {
        if (this.breakTimer) {
            clearInterval(this.breakTimer);
            this.breakTimer = null;
        }
        
        this.questionsSinceBreak = 0;
        
        if (this.currentIndex >= this.filteredQuestions.length) {
            this.showComplete();
        } else {
            this.showScreen('quiz-screen');
            this.renderQuestion();
        }
    },
    
    // ============ COMPLETE SCREEN ============
    
    showComplete() {
        this.clearSession();
        
        const accuracy = this.sessionTotal > 0 
            ? Math.round((this.sessionCorrect / this.sessionTotal) * 100) 
            : 0;
        
        document.getElementById('session-correct').textContent = this.sessionCorrect;
        document.getElementById('session-total').textContent = this.sessionTotal;
        
        // Emoji and title based on performance
        const emoji = document.getElementById('complete-emoji');
        const title = document.getElementById('complete-title');
        const encouragement = document.getElementById('encouragement');
        
        if (accuracy >= 90) {
            emoji.textContent = '🏆';
            title.textContent = 'AMAZING!';
            encouragement.textContent = "You're totally ready for this exam! Go get that A! 🌟";
        } else if (accuracy >= 70) {
            emoji.textContent = '🎉';
            title.textContent = 'Great job!';
            encouragement.textContent = "You're doing awesome! A few more rounds and you'll be perfect! 💪";
        } else if (accuracy >= 50) {
            emoji.textContent = '💪';
            title.textContent = 'Good effort!';
            encouragement.textContent = "You're learning! Each question makes you stronger for the exam! 📚";
        } else {
            emoji.textContent = '🌱';
            title.textContent = 'Keep going!';
            encouragement.textContent = "Every mistake is a lesson! You're doing great by practicing! 🌟";
        }
        
        // Big confetti celebration!
        this.spawnConfetti(50);
        
        this.showScreen('complete-screen');
    },
    
    // ============ STATS SCREEN ============
    
    showStats() {
        const progress = this.getProgress();
        
        document.getElementById('stat-total').textContent = progress.totalAttempts || 0;
        document.getElementById('stat-correct').textContent = progress.totalCorrect || 0;
        document.getElementById('stat-best-streak').textContent = progress.bestStreak || 0;
        
        // Topic breakdown
        const topicStats = {};
        this.questions.forEach(q => {
            const topic = q.topic || 'General';
            if (!topicStats[topic]) {
                topicStats[topic] = { total: 0, correct: 0 };
            }
            const attempt = progress.attempted[q.id];
            if (attempt) {
                topicStats[topic].total++;
                if (attempt.correct) topicStats[topic].correct++;
            }
        });
        
        const container = document.getElementById('topic-stats');
        container.replaceChildren();
        
        const topics = Object.entries(topicStats).filter(([_, s]) => s.total > 0);
        
        if (topics.length === 0) {
            const p = document.createElement('p');
            p.style.cssText = 'color: var(--text-light); text-align: center; padding: 20px;';
            p.textContent = 'Start practicing to see your progress! 🎯';
            container.appendChild(p);
        } else {
            topics.forEach(([topic, stats]) => {
                const percent = Math.round((stats.correct / stats.total) * 100);
                
                const row = document.createElement('div');
                row.className = 'topic-stat-row';
                
                const name = document.createElement('span');
                name.className = 'topic-stat-name';
                name.textContent = topic;
                
                const bar = document.createElement('div');
                bar.className = 'topic-stat-bar';
                const fill = document.createElement('div');
                fill.className = 'topic-stat-fill';
                fill.style.width = `${percent}%`;
                bar.appendChild(fill);
                
                const pct = document.createElement('span');
                pct.className = 'topic-stat-percent';
                pct.textContent = `${percent}%`;
                
                row.appendChild(name);
                row.appendChild(bar);
                row.appendChild(pct);
                container.appendChild(row);
            });
        }
        
        this.showScreen('stats-screen');
    },
    
    resetProgress() {
        if (confirm('Start fresh? All progress will be cleared.\n\n(Don\'t worry - this is just practice data, not your real exam!)')) {
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem(this.SESSION_KEY);
            this.currentStreak = 0;
            this.bestStreak = 0;
            this.loadProgress();
            alert('Fresh start! Let\'s do this! 🌱');
            this.goHome();
        }
    },
    
    // ============ SESSION MANAGEMENT ============
    
    saveSession() {
        try {
            const session = {
                questionIds: this.filteredQuestions.map(q => q.id),
                currentIndex: this.currentIndex,
                sessionCorrect: this.sessionCorrect,
                sessionTotal: this.sessionTotal,
                currentStreak: this.currentStreak,
                isReviewMode: this.isReviewMode
            };
            localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        } catch (e) {
            console.error('Error saving session:', e);
        }
    },
    
    clearSession() {
        localStorage.removeItem(this.SESSION_KEY);
    },
    
    checkForSavedSession() {
        try {
            const sessionData = localStorage.getItem(this.SESSION_KEY);
            if (sessionData) {
                const session = JSON.parse(sessionData);
                if (session.questionIds && session.currentIndex < session.questionIds.length) {
                    this.showResumePrompt(session);
                }
            }
        } catch (e) {
            localStorage.removeItem(this.SESSION_KEY);
        }
    },
    
    showResumePrompt(session) {
        const remaining = session.questionIds.length - session.currentIndex;
        const confirmed = confirm(
            `Welcome back! 😊\n\n` +
            `You have ${remaining} questions left in your last session.\n` +
            `Score so far: ${session.sessionCorrect}/${session.sessionTotal}\n\n` +
            `Continue where you left off?`
        );
        
        if (confirmed) {
            this.resumeSession(session);
        } else {
            localStorage.removeItem(this.SESSION_KEY);
        }
    },
    
    resumeSession(session) {
        this.filteredQuestions = session.questionIds
            .map(id => this.questions.find(q => q.id === id))
            .filter(Boolean);
        this.currentIndex = session.currentIndex;
        this.sessionCorrect = session.sessionCorrect;
        this.sessionTotal = session.sessionTotal;
        this.currentStreak = session.currentStreak || 0;
        this.isReviewMode = session.isReviewMode || false;
        this.questionsSinceBreak = 0;
        
        if (this.filteredQuestions.length === 0) {
            localStorage.removeItem(this.SESSION_KEY);
            return;
        }
        
        this.showScreen('quiz-screen');
        this.renderQuestion();
        this.updateStreakDisplay();
    },
    
    // ============ CONFETTI ============
    
    spawnConfetti(count) {
        const container = document.getElementById('confetti-container');
        const colors = ['#FF69B4', '#9370DB', '#4ADE80', '#FFD700', '#87CEEB', '#FF8C00'];
        
        for (let i = 0; i < count; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
            
            // Random shapes
            if (Math.random() > 0.5) {
                confetti.style.borderRadius = '50%';
            } else {
                confetti.style.width = '8px';
                confetti.style.height = '14px';
            }
            
            container.appendChild(confetti);
            
            // Remove after animation
            setTimeout(() => confetti.remove(), 4000);
        }
    },
    
    // ============ KEYBOARD SHORTCUTS ============
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const quizScreen = document.getElementById('quiz-screen');
            if (!quizScreen.classList.contains('active')) {
                if (e.key === 'Escape') this.goHome();
                return;
            }
            
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            const key = e.key.toUpperCase();
            
            if (!this.answerSelected) {
                const letterMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
                const letter = letterMap[key] || (['A', 'B', 'C', 'D'].includes(key) ? key : null);
                
                if (letter) {
                    const optionBtn = document.querySelector(`.option-btn[data-letter="${letter}"]`);
                    if (optionBtn && !optionBtn.disabled) {
                        e.preventDefault();
                        this.selectAnswer(letter);
                    }
                }
            }
            
            if ((e.key === 'Enter' || e.key === ' ') && this.answerSelected) {
                const nextBtn = document.querySelector('.feedback-card .btn-primary');
                if (nextBtn) {
                    e.preventDefault();
                    this.nextQuestion();
                }
            }
            
            if (e.key === 'Escape') {
                e.preventDefault();
                this.confirmExit();
            }
        });
    },
    
    // ============ HELPERS ============
    
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },
    
    getRandomMessage(messages) {
        return messages[Math.floor(Math.random() * messages.length)];
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => app.init());
