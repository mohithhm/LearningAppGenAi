document.addEventListener('DOMContentLoaded', function() {
    const navigationDiv = document.querySelector('.navigation');
    const skillId = window.location.pathname.split('/')[2];
    const currentStepIndex = parseInt(window.location.pathname.split('/')[3]);
    
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
    fetch(`/check-step/${skillId}/${currentStepIndex + 1}`)
        .then(response => response.json())
        .then(data => {
            if (data.exists) {
                const nextBtn = document.createElement('a');
                nextBtn.href = `/step/${skillId}/${currentStepIndex + 1}`;
                nextBtn.className = 'button next-button';
                nextBtn.textContent = 'Next Step';
                navigationDiv.appendChild(nextBtn);
            }
        });
});

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
            // Redirect to next step or update UI
            const currentUrl = window.location.pathname;
            const nextStepUrl = `/step/${skillId}/${parseInt(stepIndex) + 1}`;
            
            // Check if next step exists
            fetch(`/check-step/${skillId}/${parseInt(stepIndex) + 1}`)
                .then(response => response.json())
                .then(data => {
                    if (data.exists) {
                        window.location.href = nextStepUrl;
                    } else {
                        window.location.href = `/skill/${skillId}`;
                    }
                });
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}