document.addEventListener('DOMContentLoaded', function() {
    const navigationDiv = document.querySelector('.navigation');
    const skillId = getSkillIdFromUrl();
    const currentStepIndex = getStepIndexFromUrl();

    // Add back to skill overview button
    const backToSkillBtn = document.createElement('a');
    backToSkillBtn.href = `/skill/${skillId}`;
    backToSkillBtn.className = 'back-button';
    backToSkillBtn.textContent = 'Back to Skill Overview';
    navigationDiv.appendChild(backToSkillBtn);

    // Add step completion button
    const completeBtn = document.createElement('button');
    completeBtn.className = 'button complete-button';
    completeBtn.textContent = 'Mark as Complete';
    completeBtn.onclick = function() {
        updateStepStatus(skillId, currentStepIndex, null, 'completed');
    };
    navigationDiv.appendChild(completeBtn);

    // Add previous step button if not the first step
    if (currentStepIndex > 0) {
        const prevBtn = document.createElement('a');
        prevBtn.href = `/step/${skillId}/${currentStepIndex - 1}`;
        prevBtn.className = 'button prev-button';
        prevBtn.textContent = 'Previous Step';
        navigationDiv.insertBefore(prevBtn, navigationDiv.firstChild);
    }

    // Add next step button if not the last step
    fetch(`/check-step/${skillId}/${parseInt(currentStepIndex) + 1}`)
        .then(response => response.json())
        .then(data => {
            if (data.exists) {
                const nextBtn = document.createElement('a');
                nextBtn.href = `/step/${skillId}/${parseInt(currentStepIndex) + 1}`;
                nextBtn.className = 'button next-button';
                nextBtn.textContent = 'Next Step';
                navigationDiv.appendChild(nextBtn);
            }
        });

    // Load MCQs if available
    loadMCQs(skillId, currentStepIndex);
});

function getSkillIdFromUrl() {
    const urlParts = window.location.pathname.split('/');
    for (let i = 0; i < urlParts.length; i++) {
        if (urlParts[i] === 'skill' || urlParts[i] === 'step') {
            return urlParts[i + 1];
        }
    }
    return null;
}

function getStepIndexFromUrl() {
    const urlParts = window.location.pathname.split('/');
    for (let i = 0; i < urlParts.length; i++) {
        if (urlParts[i] === 'step' && i + 2 < urlParts.length) {
            return parseInt(urlParts[i + 2]);
        }
    }
    return null;
}

function updateStepStatus(skillId, stepIndex, substepIndex, status) {
    fetch('/update-progress', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            skill_id: skillId,
            step_index: stepIndex,
            substep_index: substepIndex,
            status: status
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            fetch(`/check-step/${skillId}/${parseInt(stepIndex) + 1}`)
                .then(response => response.json())
                .then(data => {
                    if (data.exists) {
                        showCongratulation(false, () => {
                            window.location.href = `/step/${skillId}/${parseInt(stepIndex) + 1}`;
                        });
                    } else {
                        showCongratulation(true, () => {
                            window.location.href = `/skill/${skillId}`;
                        });
                    }
                });
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function showCongratulation(isFinal, callback) {
    const modal = document.createElement('div');
    modal.className = 'congratulation-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const message = document.createElement('h3');
    message.textContent = isFinal 
        ? 'Congratulations! You have completed the entire skill!' 
        : 'Great job! You have completed this step!';
    
    const continueBtn = document.createElement('button');
    continueBtn.className = 'button';
    continueBtn.textContent = isFinal 
        ? 'Return to Skill Overview' 
        : 'Continue to Next Step';
    
    continueBtn.onclick = function() {
        document.body.removeChild(modal);
        if (callback) callback();
    };
    
    modalContent.appendChild(message);
    modalContent.appendChild(continueBtn);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

function loadMCQs(skillId, stepIndex) {
    // First check if MCQs already exist on the page
    if (document.querySelector('.mcq-section')) {
        return; // MCQs already loaded, no need to fetch again
    }
    
    fetch(`/get-mcqs/${skillId}/${stepIndex}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.questions && data.questions.length > 0) {
                createMCQPopup(data.questions);
            } else {
                console.log('No MCQ questions available for this step');
            }
        })
        .catch(error => {
            console.error('Error loading MCQs:', error);
        });
}

function createMCQPopup(questions) {
    const stepDetail = document.querySelector('.step-detail');
    
    // Create MCQ section
    const mcqSection = document.createElement('div');
    mcqSection.className = 'mcq-section';
    
    // Create quiz button
    const quizButton = document.createElement('button');
    quizButton.className = 'button quiz-button';
    quizButton.textContent = 'Take Quiz';
    quizButton.onclick = function() {
        showQuizPopup(questions);
    };
    
    mcqSection.appendChild(quizButton);
    stepDetail.appendChild(mcqSection);
}

function showQuizPopup(questions) {
    // Create modal for quiz
    const modal = document.createElement('div');
    modal.className = 'quiz-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const heading = document.createElement('h3');
    heading.textContent = 'Quiz for this Step';
    modalContent.appendChild(heading);
    
    // Current question index
    let currentQuestionIndex = 0;
    let score = 0;
    
    // Create question container
    const questionContainer = document.createElement('div');
    questionContainer.className = 'question-container';
    modalContent.appendChild(questionContainer);
    
    // Function to display a question
    function displayQuestion(index) {
        const question = questions[index];
        questionContainer.innerHTML = '';
        
        const questionText = document.createElement('p');
        questionText.className = 'question-text';
        questionText.textContent = question.question;
        questionContainer.appendChild(questionText);
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-container';
        
        question.options.forEach((option, i) => {
            const optionLabel = document.createElement('label');
            optionLabel.className = 'option-label';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'quiz-option';
            radio.value = i;
            
            const optionText = document.createElement('span');
            optionText.textContent = option;
            
            optionLabel.appendChild(radio);
            optionLabel.appendChild(optionText);
            optionsContainer.appendChild(optionLabel);
        });
        
        questionContainer.appendChild(optionsContainer);
        
        // Submit button
        const submitBtn = document.createElement('button');
        submitBtn.className = 'button submit-answer';
        submitBtn.textContent = 'Submit Answer';
        submitBtn.onclick = function() {
            const selectedOption = document.querySelector('input[name="quiz-option"]:checked');
            if (selectedOption) {
                const selectedValue = parseInt(selectedOption.value);
                checkAnswer(selectedValue, question.correctIndex);
            } else {
                alert('Please select an answer');
            }
        };
        
        questionContainer.appendChild(submitBtn);
    }
    
    // Function to check answer and move to next question
    function checkAnswer(selected, correct) {
        const isCorrect = selected === correct;
        if (isCorrect) {
            score++;
        }
        
        // Show feedback
        const feedback = document.createElement('div');
        feedback.className = isCorrect ? 'feedback correct' : 'feedback incorrect';
        feedback.textContent = isCorrect 
            ? 'Correct! Well done.' 
            : `Incorrect. The correct answer is: ${questions[currentQuestionIndex].options[correct]}`;
        
        questionContainer.innerHTML = '';
        questionContainer.appendChild(feedback);
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'button next-question';
        
        if (currentQuestionIndex < questions.length - 1) {
            nextBtn.textContent = 'Next Question';
            nextBtn.onclick = function() {
                currentQuestionIndex++;
                displayQuestion(currentQuestionIndex);
            };
        } else {
            nextBtn.textContent = 'See Results';
            nextBtn.onclick = function() {
                showResults();
            };
        }
        
        questionContainer.appendChild(nextBtn);
    }
    
    // Function to show final results
    function showResults() {
        questionContainer.innerHTML = '';
        
        const resultsHeading = document.createElement('h3');
        resultsHeading.textContent = 'Quiz Results';
        
        const scoreText = document.createElement('p');
        scoreText.className = 'score-text';
        scoreText.textContent = `You scored ${score} out of ${questions.length}`;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'button close-quiz';
        closeBtn.textContent = 'Close Quiz';
        closeBtn.onclick = function() {
            document.body.removeChild(modal);
        };
        
        questionContainer.appendChild(resultsHeading);
        questionContainer.appendChild(scoreText);
        questionContainer.appendChild(closeBtn);
    }
    
    // Start with first question
    displayQuestion(currentQuestionIndex);
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}
