document.addEventListener('DOMContentLoaded', function() {
    const navigationDiv = document.querySelector('.navigation');
    
    if (navigationDiv) {
        const skillId = getSkillIdFromUrl();
        const currentStepIndex = getStepIndexFromUrl();
        
        if (!navigationDiv.querySelector('.back-button')) {
            const backToSkillBtn = document.createElement('a');
            backToSkillBtn.href = `/skill/${skillId}`;
            backToSkillBtn.className = 'back-button';
            backToSkillBtn.textContent = 'Back to Skill Overview';
            navigationDiv.appendChild(backToSkillBtn);
        }
        
        if (!navigationDiv.querySelector('.complete-button')) {
            const completeBtn = document.createElement('button');
            completeBtn.className = 'button complete-button';
            completeBtn.textContent = 'Mark as Complete';
            completeBtn.onclick = function() {
                updateStepStatus(skillId, currentStepIndex, null, 'completed');
            };
            navigationDiv.appendChild(completeBtn);
        }
        
        addNavigationButtons(skillId, currentStepIndex, navigationDiv);
        
        loadMCQs(skillId, currentStepIndex);
    }
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

function addNavigationButtons(skillId, currentStepIndex, navigationDiv) {
    if (currentStepIndex > 0 && !navigationDiv.querySelector('.prev-button')) {
        const prevBtn = document.createElement('a');
        prevBtn.href = `/step/${skillId}/${currentStepIndex - 1}`;
        prevBtn.className = 'button prev-button';
        prevBtn.textContent = 'Previous Step';
        navigationDiv.insertBefore(prevBtn, navigationDiv.firstChild);
    }

    fetch(`/check-step/${skillId}/${parseInt(currentStepIndex) + 1}`)
        .then(response => response.json())
        .then(data => {
            if (data.exists && !navigationDiv.querySelector('.next-button')) {
                const nextBtn = document.createElement('a');
                nextBtn.href = `/step/${skillId}/${parseInt(currentStepIndex) + 1}`;
                nextBtn.className = 'button next-button';
                nextBtn.textContent = 'Next Step';
                navigationDiv.appendChild(nextBtn);
            } else if (!data.exists) {
                const completeBtn = navigationDiv.querySelector('.complete-button');
                if (completeBtn) {
                    completeBtn.textContent = 'Complete Skill';
                    completeBtn.onclick = function() {
                        updateStepStatus(skillId, currentStepIndex, null, 'completed');
                    };
                }
            }
        });
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
                .then(nextStepData => {
                    if (nextStepData.exists) {
                        // If there's a next step, go to it
                        window.location.href = `/step/${skillId}/${parseInt(stepIndex) + 1}`;
                    } else {
                        // If this is the last step, go to the congratulations page
                        window.location.href = `/congratulations/${skillId}`;
                    }
                });
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}


function updateProgressUI(data) {
    if (data.overall_progress !== undefined) {
        const overallProgressBar = document.querySelector('.skill-overview .progress-bar .progress');
        const overallProgressText = document.querySelector('.skill-overview .progress-text');
        if (overallProgressBar) {
            overallProgressBar.style.width = `${data.overall_progress}%`;
        }
        if (overallProgressText) {
            overallProgressText.textContent = `${data.overall_progress}%`;
        }
    }
    
    if (data.step_progress !== undefined) {
        const stepProgressBar = document.querySelector('.step-detail .progress-bar .progress');
        const stepProgressText = document.querySelector('.step-detail .progress-text');
        if (stepProgressBar) {
            stepProgressBar.style.width = `${data.step_progress}%`;
        }
        if (stepProgressText) {
            stepProgressText.textContent = `${data.step_progress}%`;
        }
    }
}

function showCongratulation(isFinal, callback) {
    console.log('Creating congratulation modal, isFinal:', isFinal);
    
    // Remove any existing modals first
    const existingModals = document.querySelectorAll('.congratulation-modal');
    existingModals.forEach(modal => {
        document.body.removeChild(modal);
    });
    
    const modal = document.createElement('div');
    modal.className = 'congratulation-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '5px';
    modalContent.style.textAlign = 'center';
    modalContent.style.maxWidth = '500px';
    
    const message = document.createElement('h3');
    message.textContent = isFinal
        ? 'Congratulations! You have completed the entire skill!'
        : 'Great job! You have completed this step!';
    
    const continueBtn = document.createElement('button');
    continueBtn.className = 'button';
    continueBtn.style.marginTop = '15px';
    continueBtn.style.padding = '10px 20px';
    continueBtn.style.backgroundColor = '#4CAF50';
    continueBtn.style.color = 'white';
    continueBtn.style.border = 'none';
    continueBtn.style.borderRadius = '4px';
    continueBtn.style.cursor = 'pointer';
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
    
    console.log('Modal created and appended to body');
}


function loadMCQs(skillId, stepIndex) {
    if (document.querySelector('.mcq-section')) {
        return;
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
    const mcqSection = document.createElement('div');
    mcqSection.className = 'mcq-section';
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
    const modal = document.createElement('div');
    modal.className = 'quiz-modal';
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    const heading = document.createElement('h3');
    heading.textContent = 'Quiz for this Step';
    modalContent.appendChild(heading);
    
    let currentQuestionIndex = 0;
    let score = 0;
    
    const questionContainer = document.createElement('div');
    questionContainer.className = 'question-container';
    modalContent.appendChild(questionContainer);
    
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
    
    function checkAnswer(selected, correct) {
        const isCorrect = selected === correct;
        if (isCorrect) {
            score++;
        }
        
        const feedback = document.createElement('div');
        feedback.className = isCorrect ? 'feedback correct' : 'feedback incorrect';
        feedback.textContent = isCorrect
            ? 'Correct! Well done.'
            : `Incorrect. The correct answer is: ${questions[currentQuestionIndex].options[correct]}`;
        
        questionContainer.innerHTML = '';
        questionContainer.appendChild(feedback);
        
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
    
    displayQuestion(currentQuestionIndex);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}
