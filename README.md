# LearningAppGenAI 

A Flask-based educational web application powered by Google's Gemini API that creates personalized skill-learning plans and generates interactive MCQs to enhance topic mastery. Built for students, educators, and self-learners, the app tracks learning progress, offers daily streaks, and provides a gamified approach to skill development.

---

## Features

- **Gemini AI Integration**  
  Generates structured, JSON-based learning plans for any skill or topic.

- **MCQ Generation**  
  Dynamically creates multiple-choice questions (MCQs) from content to test understanding.

- **Progress Tracking**  
  Monitor step-wise and overall learning progress.

- **Daily Streaks**  
  Tracks user learning streaks to encourage consistency.

- **Interactive UI**  
  Supports step-by-step and sub-step views with navigation and interactivity.

---

## Tech Stack

- **Backend**: Python, Flask
- **Frontend**: HTML, CSS, JavaScript (Jinja templating)
- **AI**: Google Gemini API
- **Data Storage**: Local JSON files per user
- **Deployment**: Localhost (Flask server)

---

## Project Structure

```
LearningAppGenAi/
├── app.py                      # Main Flask application
├── templates/                  # HTML templates
│   ├── home.html
│   ├── learn.html
│   ├── skill.html
│   └── step.html
├── static/
│   ├── css/
│   ├── js/
│   └── step-navigation.js
├── user_data/                  # Stores per-user learning data as JSON
├── .env                        # Store your GEMINI_API_KEY here (optional)
└── README.md
```
---

## Setup Instructions
1. Clone the repository:
   
   git clone https://github.com/mohithhm/LearningAppGenAi.git
   
   cd LearningAppGenAi
2. Install dependencies:
   
   pip install flask requests python-dotenv
3. Setup env variables: Create a .env file and add these

   GEMINI_API_KEY=your_api_key_here

   SECRET_KEY=your_flask_secret_key
4. Run the app:

   python app.py

   
