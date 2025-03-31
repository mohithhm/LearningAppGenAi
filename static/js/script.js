document.addEventListener('DOMContentLoaded', function() {
    // Handle step progress updates
    const statusButtons = document.querySelectorAll('.status-button');
    
    statusButtons.forEach(button => {
        button.addEventListener('click', function() {
            const status = this.getAttribute('data-status');
            const skillId = getSkillIdFromUrl();
            const stepIndex = getStepIndexFromUrl();
            const substepIndex = this.getAttribute('data-substep');
            
            updateProgress(skillId, stepIndex, substepIndex, status);
        });
    });
    
    // Highlight active status button based on current status
    highlightActiveStatusButtons();
});

function getSkillIdFromUrl() {
    const urlParts = window.location.pathname.split('/');
    // For paths like /skill/skill-name or /step/skill-name/index
    for (let i = 0; i < urlParts.length; i++) {
        if (urlParts[i] === 'skill' || urlParts[i] === 'step') {
            return urlParts[i + 1];
        }
    }
    return null;
}

function getStepIndexFromUrl() {
    const urlParts = window.location.pathname.split('/');
    // For paths like /step/skill-name/index
    for (let i = 0; i < urlParts.length; i++) {
        if (urlParts[i] === 'step' && i + 2 < urlParts.length) {
            return urlParts[i + 2];
        }
    }
    return null;
}

// Modify the updateProgress function in script.js to ensure UI updates
function updateProgress(skillId, stepIndex, substepIndex, status) {
    if (!skillId || !stepIndex) {
        console.error('Missing skill ID or step index');
        return;
    }

    const data = {
        skill_id: skillId,
        step_index: stepIndex,
        status: status
    };
    
    if (substepIndex !== null && substepIndex !== undefined) {
        data.substep_index = substepIndex;
    }

    // Log the data being sent for debugging
    console.log('Sending progress update:', data);

    fetch('/update-progress', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        // Log the response for debugging
        console.log('Progress update response:', data);
        
        if (data.error) {
            console.error('Error updating progress:', data.error);
            return;
        }

        // Force immediate update of progress bars
        if (data.overall_progress !== undefined) {
            const overallProgressBar = document.querySelector('.skill-overview .progress-bar .progress');
            const overallProgressText = document.querySelector('.skill-overview .progress-text');
            
            if (overallProgressBar) {
                // Force reflow to update immediately
                overallProgressBar.style.width = '0%';
                overallProgressBar.offsetHeight; // Force reflow
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
                // Force reflow to update immediately
                stepProgressBar.style.width = '0%';
                stepProgressBar.offsetHeight; // Force reflow
                stepProgressBar.style.width = `${data.step_progress}%`;
            }
            
            if (stepProgressText) {
                stepProgressText.textContent = `${data.step_progress}%`;
            }
        }
        
        // Highlight active status button
        highlightActiveStatusButtons();
        
        // Show success message
        if (status === 'completed') {
            showSuccessMessage('Progress updated! Great job completing this step.');
        } else if (status === 'in_progress') {
            showSuccessMessage('Progress updated! Keep going!');
        }
    })
    .catch(error => {
        console.error('Error updating progress:', error);
    });
}


function highlightActiveStatusButtons() {
    // Get current status from the page
    const currentStatus = document.querySelector('.status') ? 
                         document.querySelector('.status').classList.contains('completed') ? 'completed' :
                         document.querySelector('.status').classList.contains('in-progress') ? 'in_progress' : 
                         'not_started' : 'not_started';
    
    // Remove active class from all buttons
    document.querySelectorAll('.status-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Add active class to matching button
    document.querySelectorAll(`.status-button[data-status="${currentStatus}"]`).forEach(button => {
        button.classList.add('active');
    });
}

function showSuccessMessage(message) {
    // Create message element if it doesn't exist
    let messageEl = document.querySelector('.success-message');
    
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.className = 'success-message';
        document.querySelector('.step-detail').appendChild(messageEl);
    }
    
    // Set message and show
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

// Add event listener for skill search
const skillSearchInput = document.getElementById('skill-search');
if (skillSearchInput) {
    skillSearchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const skillButtons = document.querySelectorAll('.skill-button');
        
        skillButtons.forEach(button => {
            const skillName = button.querySelector('.skill-name').textContent.toLowerCase();
            if (skillName.includes(searchTerm)) {
                button.style.display = 'block';
            } else {
                button.style.display = 'none';
            }
        });
    });
}

// Update the current date in the UI
function updateCurrentDate() {
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Call on page load
updateCurrentDate();

