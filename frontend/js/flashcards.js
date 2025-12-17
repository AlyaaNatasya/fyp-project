document.addEventListener("DOMContentLoaded", function () {
    // Wait for .main-content to exist before running logic
    const mainContentCheck = setInterval(() => {
        const mainContent = document.querySelector(".main-content");
        if (mainContent) {
            clearInterval(mainContentCheck);
            initFlashcardsPage();
        }
    }, 100);
});

function initFlashcardsPage() {
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

    const flashcardsData = localStorage.getItem("generatedFlashcards");
    if (!flashcardsData) {
        alert("No flashcards found. Please generate them from a collection.");
        window.location.href = "collection.html";
        return;
    }
    
    let flashcards;
    try {
        flashcards = JSON.parse(flashcardsData);
    } catch (e) {
        console.error("Error parsing flashcards data", e);
        alert("Error loading flashcards data.");
        return;
    }

    if (!Array.isArray(flashcards) || flashcards.length === 0) {
        alert("No valid flashcards found.");
        return;
    }

    let currentIndex = 0;
    let isFlipped = false;
    
    const display = document.getElementById("flashcard-display");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const counter = document.getElementById("card-counter");
    const backBtn = document.getElementById("back-to-quizzes-btn");

    if (backBtn) {
        backBtn.addEventListener("click", () => {
            window.location.href = "quizzes.html";
        });
    }
    
    function renderCard() {
        const card = flashcards[currentIndex];
        isFlipped = false;
        
        display.innerHTML = `
            <div class="flashcard">
                <div class="flashcard-content">
                    <h3>Question</h3>
                    <p>${card.front}</p>
                </div>
                <div class="instruction-hint">Click to flip</div>
            </div>
        `;
        
        // Add click listener to the newly created card
        const cardElement = display.querySelector(".flashcard");
        cardElement.addEventListener("click", () => {
            isFlipped = !isFlipped;
            if (isFlipped) {
                cardElement.classList.add("flipped");
                cardElement.innerHTML = `
                    <div class="flashcard-content">
                        <h3>Answer</h3>
                        <p>${card.back}</p>
                    </div>
                    <div class="instruction-hint">Click to flip back</div>
                `;
            } else {
                cardElement.classList.remove("flipped");
                cardElement.innerHTML = `
                    <div class="flashcard-content">
                        <h3>Question</h3>
                        <p>${card.front}</p>
                    </div>
                    <div class="instruction-hint">Click to flip</div>
                `;
            }
        });
        
        counter.textContent = `${currentIndex + 1} / ${flashcards.length}`;
        
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === flashcards.length - 1;
    }
    
    prevBtn.addEventListener("click", () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderCard();
        }
    });
    
    nextBtn.addEventListener("click", () => {
        if (currentIndex < flashcards.length - 1) {
            currentIndex++;
            renderCard();
        }
    });
    
    renderCard();
}
