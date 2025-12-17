document.addEventListener("DOMContentLoaded", function () {
    // Wait for .main-content to exist before running logic
    const mainContentCheck = setInterval(() => {
        const mainContent = document.querySelector(".main-content");
        if (mainContent) {
            clearInterval(mainContentCheck);
            initQuizPage();
        }
    }, 100);
});

function initQuizPage() {
    // Auth check logic
    const token = localStorage.getItem("token");
    const usernameSpan = document.getElementById("username");
    
    if (!token) {
        alert("Please log in to access this page.");
        window.location.href = "home.html";
        return;
    }
    
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const now = Date.now() / 1000;
        if (payload.exp && payload.exp < now) {
            localStorage.removeItem("token");
            alert("Session expired. Please log in again.");
            window.location.href = "home.html";
            return;
        }

        const name = payload.name || payload.email?.split("@")[0] || "Student";
        if (usernameSpan) {
            usernameSpan.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        }
    } catch (err) {
        console.warn("Invalid token:", err);
        localStorage.removeItem("token");
        window.location.href = "home.html";
        return;
    }

    // Initialize Back Button
    const backBtn = document.getElementById("back-to-quizzes-btn");
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to leave? Your progress will be lost.")) {
                window.location.href = "quizzes.html";
            }
        });
    }

    // Load Quiz Data
    const quizDataString = localStorage.getItem("generatedQuiz");
    if (!quizDataString) {
        alert("No quiz found. Please generate one first.");
        window.location.href = "quizzes.html";
        return;
    }
    
    let quizData;
    try {
        quizData = JSON.parse(quizDataString);
    } catch (e) {
        console.error("Error parsing quiz data", e);
        alert("Error loading quiz data.");
        return;
    }

    if (!Array.isArray(quizData) || quizData.length === 0) {
        alert("Invalid quiz data found.");
        return;
    }

    // Quiz State
    let currentQuestionIndex = 0;
    let score = 0;
    let selectedOptionIndex = null;
    let isAnswered = false;

    const displayArea = document.getElementById("quiz-display-area");

    function renderQuestion() {
        const question = quizData[currentQuestionIndex];
        selectedOptionIndex = null;
        isAnswered = false;

        displayArea.innerHTML = `
            <div class="quiz-card">
                <div class="quiz-header">
                    <span class="question-number">Question ${currentQuestionIndex + 1}</span>
                    <span class="quiz-progress">${currentQuestionIndex + 1} / ${quizData.length}</span>
                </div>
                
                <p class="question-text">${question.question}</p>
                
                <div class="options-list">
                    ${question.options.map((option, index) => `
                        <div class="option-item" data-index="${index}">
                            <div class="option-marker">${String.fromCharCode(65 + index)}</div>
                            <div class="option-text">${option}</div>
                        </div>
                    `).join('')}
                </div>

                <div class="quiz-controls">
                    <button id="next-question-btn" class="next-btn" disabled>
                        Submit Answer
                    </button>
                </div>
            </div>
        `;

        // Add event listeners to options
        const options = displayArea.querySelectorAll(".option-item");
        const nextBtn = document.getElementById("next-question-btn");

        options.forEach(option => {
            option.addEventListener("click", () => {
                if (isAnswered) return; // Prevent changing answer after submission

                // Remove selected class from all
                options.forEach(opt => opt.classList.remove("selected"));
                
                // Select clicked
                option.classList.add("selected");
                selectedOptionIndex = parseInt(option.dataset.index);
                
                // Enable submit button
                nextBtn.disabled = false;
            });
        });

        nextBtn.addEventListener("click", () => {
            if (isAnswered) {
                // If already answered, go to next question
                currentQuestionIndex++;
                if (currentQuestionIndex < quizData.length) {
                    renderQuestion();
                } else {
                    showScore();
                }
            } else {
                // Submit answer logic
                isAnswered = true;
                checkAnswer(question, options, nextBtn);
            }
        });
    }

    function checkAnswer(question, optionsElements, nextBtn) {
        const selectedOptionText = question.options[selectedOptionIndex];
        const isCorrect = selectedOptionText === question.correctAnswer;

        if (isCorrect) {
            score++;
            optionsElements[selectedOptionIndex].classList.add("correct");
        } else {
            optionsElements[selectedOptionIndex].classList.add("incorrect");
            
            // Highlight the correct answer
            const correctIndex = question.options.findIndex(opt => opt === question.correctAnswer);
            if (correctIndex !== -1) {
                optionsElements[correctIndex].classList.add("correct");
            }
        }

        // Change button text to "Next Question" or "Finish Quiz"
        if (currentQuestionIndex < quizData.length - 1) {
            nextBtn.innerHTML = 'Next Question <i class="fas fa-arrow-right"></i>';
        } else {
            nextBtn.innerHTML = 'See Results <i class="fas fa-flag-checkered"></i>';
        }
    }

    function showScore() {
        const percentage = Math.round((score / quizData.length) * 100);
        let message = "";
        
        if (percentage >= 80) message = "Excellent work! 🌟";
        else if (percentage >= 60) message = "Good job! 👍";
        else message = "Keep practicing! 💪";

        displayArea.innerHTML = `
            <div class="quiz-card score-container">
                <div class="score-circle">
                    <span class="score-number">${percentage}%</span>
                    <span class="score-label">${score} / ${quizData.length} Correct</span>
                </div>
                
                <h3 class="score-message">${message}</h3>
                
                <div class="action-buttons">
                    <button id="retake-quiz-btn" class="btn-secondary">
                        <i class="fas fa-redo"></i> Retake Quiz
                    </button>
                    <button id="return-to-quizzes-btn" class="next-btn">
                        <i class="fas fa-list"></i> Back to Quizzes
                    </button>
                </div>
            </div>
        `;
        
        // Hide the top back button in score view to avoid redundancy
        const topBackBtn = document.getElementById("back-to-quizzes-btn");
        if(topBackBtn) topBackBtn.style.display = "none";

        // Add event listeners to the new buttons
        const retakeBtn = document.getElementById("retake-quiz-btn");
        const returnBtn = document.getElementById("return-to-quizzes-btn");

        if (retakeBtn) {
            retakeBtn.addEventListener("click", () => {
                window.location.reload();
            });
        }

        if (returnBtn) {
            returnBtn.addEventListener("click", () => {
                window.location.href = "quizzes.html";
            });
        }
    }

    // Start the quiz
    renderQuestion();
}
