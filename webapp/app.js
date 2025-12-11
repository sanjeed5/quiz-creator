/**
 * Quiz App - Simple MCQ Quiz with Scientific Learning Techniques
 * Features: Active recall, immediate feedback, error-focused review, progress tracking
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
    
    // Storage keys
    STORAGE_KEY: 'quizProgress',
    SESSION_KEY: 'quizSession',
    
    // Auto-advance delay for correct answers (ms)
    AUTO_ADVANCE_DELAY: 800,
    
    // Track if answer was selected (to prevent double-submit)
    answerSelected: false,
    
    // Initialize app
    async init() {
        this.loadQuestions();
        this.loadProgress();
        this.renderHome();
        this.renderTopicTags();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Check for saved session
        this.checkForSavedSession();
    },
    
    // Keyboard shortcuts for fast answering
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts on quiz screen
            const quizScreen = document.getElementById('quiz-screen');
            if (!quizScreen.classList.contains('active')) {
                // Escape on any screen goes home
                if (e.key === 'Escape') {
                    this.goHome();
                }
                return;
            }
            
            // Prevent shortcuts when typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            const key = e.key.toUpperCase();
            
            // A/B/C/D or 1/2/3/4 to select answer
            if (!this.answerSelected) {
                const letterMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
                const letter = letterMap[key] || (['A', 'B', 'C', 'D'].includes(key) ? key : null);
                
                if (letter) {
                    // Check if this option exists
                    const optionBtn = document.querySelector(`.option-btn[data-letter="${letter}"]`);
                    if (optionBtn && !optionBtn.disabled) {
                        e.preventDefault();
                        this.selectAnswer(letter);
                    }
                }
            }
            
            // Enter or Space to go to next question (when wrong answer shown)
            if ((e.key === 'Enter' || e.key === ' ') && this.answerSelected) {
                const nextBtn = document.querySelector('#feedback-card .btn-primary');
                if (nextBtn) {
                    e.preventDefault();
                    this.nextQuestion();
                }
            }
            
            // Escape to go back home
            if (e.key === 'Escape') {
                e.preventDefault();
                this.goHome();
            }
        });
    },
    
    // Check if there's a saved session to resume
    checkForSavedSession() {
        try {
            const sessionData = localStorage.getItem(this.SESSION_KEY);
            if (sessionData) {
                const session = JSON.parse(sessionData);
                // Validate session data
                if (session.questionIds && session.currentIndex < session.questionIds.length) {
                    this.showResumePrompt(session);
                }
            }
        } catch (e) {
            console.error('Error checking saved session:', e);
            localStorage.removeItem(this.SESSION_KEY);
        }
    },
    
    showResumePrompt(session) {
        const remaining = session.questionIds.length - session.currentIndex;
        const confirmed = confirm(
            `You have an unfinished session!\n\n` +
            `📝 ${remaining} questions remaining\n` +
            `✓ Score: ${session.sessionCorrect}/${session.sessionTotal}\n\n` +
            `Resume where you left off?`
        );
        
        if (confirmed) {
            this.resumeSession(session);
        } else {
            localStorage.removeItem(this.SESSION_KEY);
        }
    },
    
    resumeSession(session) {
        // Restore session state
        this.filteredQuestions = session.questionIds
            .map(id => this.questions.find(q => q.id === id))
            .filter(Boolean);
        this.currentIndex = session.currentIndex;
        this.sessionCorrect = session.sessionCorrect;
        this.sessionTotal = session.sessionTotal;
        this.isReviewMode = session.isReviewMode || false;
        
        if (this.filteredQuestions.length === 0) {
            localStorage.removeItem(this.SESSION_KEY);
            return;
        }
        
        this.showScreen('quiz-screen');
        this.renderQuestion();
    },
    
    saveSession() {
        try {
            const session = {
                questionIds: this.filteredQuestions.map(q => q.id),
                currentIndex: this.currentIndex,
                sessionCorrect: this.sessionCorrect,
                sessionTotal: this.sessionTotal,
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
    
    // Load questions from embedded data or JSON
    loadQuestions() {
        // Try embedded questions first (from questions-data.js)
        if (typeof QUIZ_QUESTIONS !== 'undefined' && Array.isArray(QUIZ_QUESTIONS)) {
            this.questions = this.validateQuestions(QUIZ_QUESTIONS);
            console.log(`Loaded ${this.questions.length} questions from embedded data`);
            return;
        }
        
        // Fallback: try fetching JSON (only works with a server)
        this.loadQuestionsFromJSON();
    },
    
    async loadQuestionsFromJSON() {
        try {
            const response = await fetch('questions.json');
            if (!response.ok) throw new Error('Failed to load questions');
            const data = await response.json();
            this.questions = this.validateQuestions(data);
            console.log(`Loaded ${this.questions.length} questions from JSON`);
            this.renderTopicTags(); // Re-render after async load
            this.loadProgress();
        } catch (error) {
            console.error('Error loading questions:', error);
            this.questions = [];
            this.showError('Could not load questions. Make sure questions-data.js or questions.json exists!');
        }
    },
    
    // Validate and clean questions
    validateQuestions(questions) {
        return questions.filter(q => {
            // Must have required fields
            if (!q.id || !q.question || !q.correct) {
                console.warn('Skipping invalid question:', q);
                return false;
            }
            // Correct answer must be A, B, C, or D
            const correctLetter = String(q.correct).toUpperCase().trim();
            if (!['A', 'B', 'C', 'D'].includes(correctLetter)) {
                console.warn('Skipping question with invalid correct answer:', q);
                return false;
            }
            // Normalize the correct field
            q.correct = correctLetter;
            // Must have the correct option filled
            if (!q.options || !q.options[correctLetter]) {
                console.warn('Skipping question missing correct option:', q);
                return false;
            }
            return true;
        });
    },
    
    showError(message) {
        const hero = document.querySelector('.hero h1');
        const subtitle = document.querySelector('.subtitle');
        if (hero) hero.textContent = 'Loading Error';
        if (subtitle) subtitle.textContent = message;
    },
    
    // Progress management
    getProgress() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : this.getEmptyProgress();
        } catch (e) {
            console.error('Error reading progress:', e);
            return this.getEmptyProgress();
        }
    },
    
    getEmptyProgress() {
        return {
            attempted: {},  // { questionId: { correct: bool, attempts: number, lastAnswer: string } }
            totalCorrect: 0,
            totalAttempts: 0
        };
    },
    
    saveProgress(progress) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
        } catch (e) {
            console.error('Error saving progress:', e);
        }
    },
    
    loadProgress() {
        const progress = this.getProgress();
        this.updateStatsPreview(progress);
        this.updateMistakesBadge(progress);
    },
    
    recordAnswer(questionId, selectedAnswer, isCorrect) {
        const progress = this.getProgress();
        
        if (!progress.attempted[questionId]) {
            progress.attempted[questionId] = { correct: false, attempts: 0, lastAnswer: '' };
        }
        
        progress.attempted[questionId].attempts++;
        progress.attempted[questionId].lastAnswer = selectedAnswer;
        
        // Update if got it right (can improve from wrong to correct)
        if (isCorrect) {
            if (!progress.attempted[questionId].correct) {
                progress.totalCorrect++;
            }
            progress.attempted[questionId].correct = true;
        }
        
        progress.totalAttempts++;
        this.saveProgress(progress);
    },
    
    getMistakes() {
        const progress = this.getProgress();
        return this.questions.filter(q => {
            const attempt = progress.attempted[q.id];
            return attempt && !attempt.correct;
        });
    },
    
    // UI Updates - using safe DOM methods (no innerHTML with user data)
    updateStatsPreview(progress) {
        const container = document.getElementById('stats-preview');
        const accuracy = progress.totalAttempts > 0 
            ? Math.round((progress.totalCorrect / progress.totalAttempts) * 100) 
            : 0;
        
        // Count remaining questions (not yet correctly answered)
        const remaining = this.questions.filter(q => {
            const attempt = progress.attempted[q.id];
            return !attempt || !attempt.correct;
        }).length;
        
        // Clear and rebuild safely
        container.replaceChildren();
        
        const stats = [
            { number: remaining, label: 'Questions Left' },
            { number: Object.keys(progress.attempted).length, label: 'Attempted' },
            { number: `${accuracy}%`, label: 'Accuracy' }
        ];
        
        stats.forEach(stat => {
            const div = document.createElement('div');
            div.className = 'stat-mini';
            
            const numDiv = document.createElement('div');
            numDiv.className = 'stat-mini-number';
            numDiv.textContent = stat.number;
            
            const labelDiv = document.createElement('div');
            labelDiv.className = 'stat-mini-label';
            labelDiv.textContent = stat.label;
            
            div.appendChild(numDiv);
            div.appendChild(labelDiv);
            container.appendChild(div);
        });
    },
    
    updateMistakesBadge(progress) {
        const mistakes = this.getMistakes();
        const badge = document.getElementById('mistakes-badge');
        badge.textContent = mistakes.length;
        badge.dataset.count = mistakes.length;
        
        // Hide review button if no mistakes
        const reviewBtn = document.getElementById('review-btn');
        reviewBtn.style.display = mistakes.length > 0 ? 'flex' : 'none';
    },
    
    renderTopicTags() {
        const topics = [...new Set(this.questions.map(q => q.topic))].filter(Boolean);
        const container = document.getElementById('topic-tags');
        
        // Clear and rebuild safely
        container.replaceChildren();
        
        // "All Topics" button
        const allBtn = document.createElement('button');
        allBtn.className = 'topic-tag active';
        allBtn.dataset.topic = '';
        allBtn.textContent = 'All Topics';
        allBtn.addEventListener('click', () => this.selectTopic(allBtn, ''));
        container.appendChild(allBtn);
        
        // Topic buttons
        topics.forEach(topic => {
            const btn = document.createElement('button');
            btn.className = 'topic-tag';
            btn.dataset.topic = topic;
            btn.textContent = topic;
            btn.addEventListener('click', () => this.selectTopic(btn, topic));
            container.appendChild(btn);
        });
    },
    
    selectTopic(btn, topic) {
        const container = document.getElementById('topic-tags');
        container.querySelectorAll('.topic-tag').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        this.selectedTopic = topic || null;
    },
    
    // Navigation
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    },
    
    goHome() {
        // Don't clear session here - allow resume on next visit
        this.loadProgress();
        this.showScreen('home-screen');
    },
    
    // Quiz Logic
    startPractice() {
        this.isReviewMode = false;
        const progress = this.getProgress();
        let questions = [...this.questions];
        
        // Filter by topic if selected
        if (this.selectedTopic) {
            questions = questions.filter(q => q.topic === this.selectedTopic);
        }
        
        // IMPORTANT: Skip questions already answered correctly
        const unanswered = questions.filter(q => {
            const attempt = progress.attempted[q.id];
            return !attempt || !attempt.correct;
        });
        
        if (unanswered.length === 0) {
            const topicText = this.selectedTopic ? ` in "${this.selectedTopic}"` : '';
            alert(`🎉 Amazing! You've correctly answered all ${questions.length} questions${topicText}!\n\nTry "Review Mistakes" to practice the ones you got wrong, or reset progress to start fresh.`);
            return;
        }
        
        // Show how many are left
        const alreadyDone = questions.length - unanswered.length;
        if (alreadyDone > 0) {
            console.log(`Skipping ${alreadyDone} already-correct questions. ${unanswered.length} remaining.`);
        }
        
        // Shuffle unanswered questions
        this.filteredQuestions = this.shuffle(unanswered);
        this.currentIndex = 0;
        this.sessionCorrect = 0;
        this.sessionTotal = 0;
        
        // Save session for resume
        this.saveSession();
        
        this.showScreen('quiz-screen');
        this.renderQuestion();
    },
    
    startReview() {
        this.isReviewMode = true;
        const mistakes = this.getMistakes();
        
        if (mistakes.length === 0) {
            alert('No mistakes to review! Great job! 🎉');
            return;
        }
        
        this.filteredQuestions = this.shuffle(mistakes);
        this.currentIndex = 0;
        this.sessionCorrect = 0;
        this.sessionTotal = 0;
        
        // Save session for resume
        this.saveSession();
        
        this.showScreen('quiz-screen');
        this.renderQuestion();
    },
    
    renderQuestion() {
        const question = this.filteredQuestions[this.currentIndex];
        
        // Reset answer state for keyboard shortcuts
        this.answerSelected = false;
        
        // Update progress bar
        const progress = ((this.currentIndex) / this.filteredQuestions.length) * 100;
        document.getElementById('progress-fill').style.width = `${progress}%`;
        document.getElementById('progress-text').textContent = 
            `${this.currentIndex + 1}/${this.filteredQuestions.length}`;
        document.getElementById('correct-count').textContent = this.sessionCorrect;
        
        // Update question (using textContent for safety)
        document.getElementById('question-topic').textContent = question.topic || 'General';
        document.getElementById('question-text').textContent = question.question;
        
        // Render options safely
        const container = document.getElementById('options-container');
        container.replaceChildren();
        
        ['A', 'B', 'C', 'D'].forEach(letter => {
            const optionText = question.options[letter];
            
            // Skip empty options
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
        
        // Show waiting state on right side
        this.showWaitingFeedback();
    },
    
    showWaitingFeedback() {
        const feedbackCard = document.getElementById('feedback-card');
        feedbackCard.className = 'feedback-card waiting';
        feedbackCard.replaceChildren();
        
        const waitingText = document.createElement('p');
        waitingText.className = 'waiting-text';
        waitingText.textContent = '👆 Select an answer';
        feedbackCard.appendChild(waitingText);
    },
    
    selectAnswer(selected) {
        // Prevent double-selection
        if (this.answerSelected) return;
        this.answerSelected = true;
        
        const question = this.filteredQuestions[this.currentIndex];
        const correct = question.correct;
        const isCorrect = selected === correct;
        
        // Record answer
        this.sessionTotal++;
        if (isCorrect) this.sessionCorrect++;
        this.recordAnswer(question.id, selected, isCorrect);
        
        // Update correct count display
        document.getElementById('correct-count').textContent = this.sessionCorrect;
        
        // Disable all options and show correct/wrong
        const options = document.querySelectorAll('.option-btn');
        options.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.letter === correct) {
                btn.classList.add('correct');
            } else if (btn.dataset.letter === selected && !isCorrect) {
                btn.classList.add('wrong');
            }
        });
        
        if (isCorrect) {
            // Correct: show brief flash and auto-advance
            this.showCorrectFeedback();
            setTimeout(() => this.nextQuestion(), this.AUTO_ADVANCE_DELAY);
        } else {
            // Wrong: show explanation on the right, wait for click
            this.showWrongFeedback(question, correct);
        }
    },
    
    showCorrectFeedback() {
        const feedbackCard = document.getElementById('feedback-card');
        feedbackCard.className = 'feedback-card';
        feedbackCard.replaceChildren();
        
        const icon = document.createElement('div');
        icon.className = 'feedback-icon correct';
        icon.textContent = '✓';
        
        const text = document.createElement('p');
        text.className = 'feedback-text correct';
        text.textContent = this.getEncouragement();
        
        feedbackCard.appendChild(icon);
        feedbackCard.appendChild(text);
    },
    
    showWrongFeedback(question, correct) {
        const feedbackCard = document.getElementById('feedback-card');
        feedbackCard.className = 'feedback-card';
        feedbackCard.replaceChildren();
        
        const icon = document.createElement('div');
        icon.className = 'feedback-icon wrong';
        icon.textContent = '✗';
        
        const text = document.createElement('p');
        text.className = 'feedback-text wrong';
        text.textContent = 'Not quite!';
        
        const correctDisplay = document.createElement('div');
        correctDisplay.className = 'correct-answer-display';
        correctDisplay.textContent = `Correct answer: ${correct}) ${question.options[correct]}`;
        
        const explanation = document.createElement('div');
        explanation.className = 'explanation';
        explanation.textContent = question.explanation || 'No explanation available.';
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-primary';
        nextBtn.textContent = 'Next Question →';
        nextBtn.addEventListener('click', () => this.nextQuestion());
        
        feedbackCard.appendChild(icon);
        feedbackCard.appendChild(text);
        feedbackCard.appendChild(correctDisplay);
        feedbackCard.appendChild(explanation);
        feedbackCard.appendChild(nextBtn);
    },
    
    nextQuestion() {
        this.currentIndex++;
        
        // Save session progress
        this.saveSession();
        
        if (this.currentIndex >= this.filteredQuestions.length) {
            this.showComplete();
        } else {
            this.renderQuestion();
        }
    },
    
    showComplete() {
        // Clear saved session - we're done!
        this.clearSession();
        
        const accuracy = this.sessionTotal > 0 
            ? Math.round((this.sessionCorrect / this.sessionTotal) * 100) 
            : 0;
        
        document.getElementById('session-correct').textContent = this.sessionCorrect;
        document.getElementById('session-total').textContent = this.sessionTotal;
        document.getElementById('session-accuracy').textContent = `${accuracy}%`;
        
        // Encouragement based on performance
        const encouragement = document.getElementById('encouragement');
        if (accuracy >= 90) {
            encouragement.textContent = "Amazing! You're totally ready for this exam! 🌟";
        } else if (accuracy >= 70) {
            encouragement.textContent = "Great job! Keep practicing the ones you missed! 💪";
        } else if (accuracy >= 50) {
            encouragement.textContent = "Good effort! Try the Review Mistakes mode to improve! 📚";
        } else {
            encouragement.textContent = "Don't worry! Practice makes perfect. Try again! 🌱";
        }
        
        this.showScreen('complete-screen');
    },
    
    // Stats
    showStats() {
        const progress = this.getProgress();
        
        document.getElementById('stat-total').textContent = progress.totalAttempts;
        document.getElementById('stat-correct').textContent = progress.totalCorrect;
        
        const accuracy = progress.totalAttempts > 0 
            ? Math.round((progress.totalCorrect / progress.totalAttempts) * 100) 
            : 0;
        document.getElementById('stat-accuracy').textContent = `${accuracy}%`;
        
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
        const topics = Object.entries(topicStats).filter(([_, s]) => s.total > 0);
        
        container.replaceChildren();
        
        if (topics.length === 0) {
            const p = document.createElement('p');
            p.style.cssText = 'color: var(--text-light); text-align: center;';
            p.textContent = 'No data yet. Start practicing!';
            container.appendChild(p);
        } else {
            topics.forEach(([topic, stats]) => {
                const percent = Math.round((stats.correct / stats.total) * 100);
                
                const row = document.createElement('div');
                row.className = 'topic-stat-row';
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'topic-stat-name';
                nameSpan.textContent = topic;
                
                const barDiv = document.createElement('div');
                barDiv.className = 'topic-stat-bar';
                const fillDiv = document.createElement('div');
                fillDiv.className = 'topic-stat-fill';
                fillDiv.style.width = `${percent}%`;
                barDiv.appendChild(fillDiv);
                
                const percentSpan = document.createElement('span');
                percentSpan.className = 'topic-stat-percent';
                percentSpan.textContent = `${percent}%`;
                
                row.appendChild(nameSpan);
                row.appendChild(barDiv);
                row.appendChild(percentSpan);
                container.appendChild(row);
            });
        }
        
        this.showScreen('stats-screen');
    },
    
    // Export functionality
    exportProgress() {
        const progress = this.getProgress();
        const exportData = [];
        
        this.questions.forEach(q => {
            const attempt = progress.attempted[q.id];
            if (attempt) {
                exportData.push({
                    id: q.id,
                    topic: q.topic || 'General',
                    question: q.question,
                    correctAnswer: `${q.correct}) ${q.options[q.correct]}`,
                    yourAnswer: attempt.lastAnswer ? `${attempt.lastAnswer}) ${q.options[attempt.lastAnswer] || 'N/A'}` : 'N/A',
                    status: attempt.correct ? 'CORRECT' : 'WRONG',
                    attempts: attempt.attempts
                });
            }
        });
        
        if (exportData.length === 0) {
            alert('No questions answered yet. Start practicing first!');
            return;
        }
        
        // Create CSV
        const headers = ['ID', 'Topic', 'Question', 'Correct Answer', 'Your Answer', 'Status', 'Attempts'];
        const csvRows = [headers.join(',')];
        
        exportData.forEach(row => {
            csvRows.push([
                row.id,
                `"${row.topic.replace(/"/g, '""')}"`,
                `"${row.question.replace(/"/g, '""')}"`,
                `"${row.correctAnswer.replace(/"/g, '""')}"`,
                `"${row.yourAnswer.replace(/"/g, '""')}"`,
                row.status,
                row.attempts
            ].join(','));
        });
        
        const csvContent = csvRows.join('\n');
        
        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `quiz-progress-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        
        // Summary
        const correct = exportData.filter(r => r.status === 'CORRECT').length;
        const wrong = exportData.filter(r => r.status === 'WRONG').length;
        alert(`Exported ${exportData.length} questions!\n\n✓ Correct: ${correct}\n✗ Wrong: ${wrong}`);
    },
    
    resetProgress() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            localStorage.removeItem(this.STORAGE_KEY);
            this.loadProgress();
            alert('Progress reset! Starting fresh. 🌱');
            this.goHome();
        }
    },
    
    // Helpers
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },
    
    getEncouragement() {
        const messages = [
            "Correct! 🎉",
            "You got it! ⭐",
            "Awesome! 💪",
            "Perfect! 🌟",
            "Well done! 🎯",
            "Brilliant! ✨",
            "Excellent! 🏆",
            "Nailed it! 💫"
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    },
    
    renderHome() {
        // Re-render home stats when returning
        const progress = this.getProgress();
        this.updateStatsPreview(progress);
        this.updateMistakesBadge(progress);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => app.init());
