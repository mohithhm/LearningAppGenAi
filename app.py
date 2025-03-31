import os
import json
import requests
import datetime
import re
from flask import Flask, render_template, request, jsonify, redirect, send_file, url_for, session

# Gemini API Client
class GeminiClient:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "YOUR_API_KEY")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    def send_prompt(self, prompt, model="gemini-2.0-flash", max_tokens=2500, temperature=0.7):
        try:
            url = f"{self.base_url}/{model}:generateContent?key={self.api_key}"
            # Enhanced system prompt with stronger JSON formatting instructions and size restriction
            system_prompt = """You are an educational AI assistant.
            IMPORTANT: Your ENTIRE response must be ONLY a valid JSON object.
            DO NOT include explanations, markdown formatting, code blocks, or any text outside the JSON.
            Keep your response concise to avoid truncation. Limit to 8-10 steps maximum.
            Respond with ONLY this JSON structure:

            {
                "skill_name": "Skill Name",
                "description": "Brief description",
                "steps": [
                    {
                        "title": "Step title",
                        "explanation": "Short explanation (1-2 sentences)",
                        "exercise": "Brief exercise",
                        "tip": "Short tip",
                        "sub_steps": [
                            {
                                "title": "Sub-step title",
                                "explanation": "Short sub-step explanation",
                                "exercise": "Brief sub-step exercise",
                                "tip": "Short sub-step tip"
                            }
                        ]
                    }
                ]
            }"""
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": f"{system_prompt}\n\nTopic: {prompt}"}]
                    }
                ],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                    "topP": 0.8,
                    "topK": 40
                }
            }
            response = requests.post(url, json=payload)
            response.raise_for_status()
            print("Raw API Response:", response.text) # Debug logging
            response_data = response.json()
            if "candidates" not in response_data or not response_data["candidates"]:
                return {"error": "No valid response generated"}
            
            # Check if the response was truncated
            finish_reason = response_data["candidates"][0].get("finishReason", "")
            if finish_reason == "MAX_TOKENS":
                print("WARNING: Response was truncated due to MAX_TOKENS limit")
            
            # Extract the text response
            text_response = response_data["candidates"][0]["content"]["parts"][0]["text"]
            print("Text Response:", text_response) # Additional debug logging
            
            # Improved JSON parsing with better error handling
            try:
                # More robust cleaning of the response
                cleaned_response = text_response.strip()
                # Remove any code block markers or markdown formatting
                if cleaned_response.startswith("```"):
                    cleaned_response = cleaned_response[3:]
                elif cleaned_response.startswith("```"):
                    cleaned_response = cleaned_response[3:]
                if cleaned_response.endswith("```"):
                    cleaned_response = cleaned_response[:-3]
                cleaned_response = cleaned_response.strip()
                
                # If the response is empty after cleaning, return an error
                if not cleaned_response:
                    return {"error": "Empty response after cleaning", "raw_response": text_response}
                
                # Try to fix truncated JSON by adding missing closing brackets if needed
                if finish_reason == "MAX_TOKENS":
                    try:
                        # Attempt to parse as is first
                        json.loads(cleaned_response)
                    except json.JSONDecodeError as e:
                        # If it fails, try to repair the JSON
                        cleaned_response = self._repair_truncated_json(cleaned_response)
                
                # Parse the JSON
                return json.loads(cleaned_response)
            except json.JSONDecodeError as e:
                print(f"JSON Parse Error: {str(e)}")
                print("Cleaned Response:", cleaned_response)
                # Try to extract JSON from the response if it contains mixed content
                try:
                    # Look for JSON object pattern
                    json_pattern = r'(\{.*\})'
                    match = re.search(json_pattern, text_response, re.DOTALL)
                    if match:
                        potential_json = match.group(1)
                        return json.loads(potential_json)
                except:
                    pass
                return {
                    "error": f"JSON parsing failed: {str(e)}",
                    "raw_response": text_response
                }
        except requests.exceptions.RequestException as e:
            return {"error": f"API Error: {str(e)}"}
        except Exception as e:
            return {"error": f"Unexpected Error: {str(e)}"}

    def _repair_truncated_json(self, json_str):
        """Attempt to repair a truncated JSON string by balancing brackets"""
        # Count opening and closing brackets, braces, and quotes
        open_braces = json_str.count('{')
        close_braces = json_str.count('}')
        open_brackets = json_str.count('[')
        close_brackets = json_str.count(']')
        
        # If we have unbalanced quotes, find the last complete object
        if open_braces > close_braces or open_brackets > close_brackets:
            print(f"Attempting to repair truncated JSON. Imbalance detected: {open_braces}:{close_braces} braces, {open_brackets}:{close_brackets} brackets")
            # Find the last complete object by working backwards
            # First, ensure we have a valid starting structure
            if not json_str.strip().startswith('{'):
                return json_str # Can't repair if it doesn't start properly
            
            # Try to find the last valid position
            repaired = json_str
            # Add missing closing brackets and braces
            for _ in range(open_brackets - close_brackets):
                repaired += "]"
            for _ in range(open_braces - close_braces):
                repaired += "}"
            return repaired
        return json_str # Return original if it seems balanced

class MCQGenerator:
    def __init__(self, gemini_client):
        self.gemini_client = gemini_client

    def generate_mcqs(self, step_content):
        prompt = f"""
    Based on the following educational content, create 3 multiple-choice questions that test understanding of key concepts.
    
    CONTENT:
    {step_content}
    
    FORMAT YOUR RESPONSE AS JSON WITH THE FOLLOWING STRUCTURE ONLY:
    {{
        "questions": [
            {{
                "question": "Question text here?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctIndex": 0,
                "explanation": "Brief explanation of why this answer is correct"
            }}
        ]
    }}
    
    IMPORTANT: Your response MUST be a valid JSON object containing ONLY a 'questions' array.
    Make sure each question has EXACTLY 4 options. The correctIndex should be the index (0-3) of the correct answer.
    """
    
        response = self.gemini_client.send_prompt(prompt, max_tokens=1500, temperature=0.3)
    
         # Handle possible errors or unexpected response structure
        if isinstance(response, dict):
            if "error" in response:
                print(f"Error in MCQ generation: {response['error']}")
                return {"questions": []}
            elif "questions" in response:
            # We have the expected structure
                valid_questions = []
                for q in response.get("questions", []):
                    if not all(k in q for k in ["question", "options", "correctIndex"]):
                        print(f"Skipping invalid question format: {q}")
                        continue
                # Ensure correctIndex is valid
                    if not isinstance(q["correctIndex"], int) or q["correctIndex"] < 0 or q["correctIndex"] >= len(q.get("options", [])):
                        q["correctIndex"] = 0
                    valid_questions.append(q)
                return {"questions": valid_questions}
            else:
            # Unexpected response structure - create default questions based on content
                print(f"Unexpected MCQ response structure: {response}")
                return self._create_default_questions(step_content)
    
    # If we get here, something went wrong
        print(f"Invalid response type from MCQ generation: {type(response)}")
        return {"questions": []}

def _create_default_questions(self, content):
    """Create basic default questions when API fails to return proper format"""
    # Extract title if available in content
    title = content.split('\n')[0] if '\n' in content else "This topic"
    
    return {
        "questions": [
            {
                "question": f"What is the main purpose of {title}?",
                "options": [
                    "To understand core concepts", 
                    "To practice implementation", 
                    "To learn advanced techniques", 
                    "To debug common issues"
                ],
                "correctIndex": 0,
                "explanation": "Understanding core concepts is the foundation of learning."
            }
        ]
    }


# Flask App Setup
app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = os.getenv("SECRET_KEY", "dev_secret_key")

gemini_client = GeminiClient()
mcq_generator = MCQGenerator(gemini_client)

# Directory for storing user data locally
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "user_data")
os.makedirs(DATA_DIR, exist_ok=True)

def get_user_data_path(user_id="default"):
    return os.path.join(DATA_DIR, f"{user_id}_data.json")

def load_user_data(user_id="default"):
    file_path = get_user_data_path(user_id)
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            pass
    return {"skills": [], "streaks": [], "last_active": None}

def save_user_data(data, user_id="default"):
    file_path = get_user_data_path(user_id)
    with open(file_path, 'w') as f:
        json.dump(data, f)

def update_streak(user_id="default"):
    user_data = load_user_data(user_id)
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    if "streaks" not in user_data:
        user_data["streaks"] = []
    if user_data.get("last_active") == today:
        return len(user_data["streaks"])
    if user_data.get("last_active"):
        last_active_date = datetime.datetime.strptime(user_data["last_active"], "%Y-%m-%d")
        today_date = datetime.datetime.strptime(today, "%Y-%m-%d")
        if (today_date - last_active_date).days == 1:
            user_data["streaks"].append(today)
        else:
            user_data["streaks"] = [today]
    else:
        user_data["streaks"].append(today)
    user_data["last_active"] = today
    save_user_data(user_data, user_id)
    return len(user_data["streaks"])

@app.route('/')
def index():
    user_id = session.get('user_id', 'default')
    streak = update_streak(user_id)
    user_data = load_user_data(user_id)
    return render_template('home.html', skills=user_data.get("skills", []), streak=streak)

@app.route('/learn', methods=['GET', 'POST'])
def learn():
    if request.method == 'POST':
        skill_topic = request.form.get('skill')
        if skill_topic:
            return redirect(url_for('generate_skill_plan', skill=skill_topic))
    return render_template('learn.html')

@app.route('/generate-plan/<skill>')
def generate_skill_plan(skill):
    user_id = session.get('user_id', 'default')
    learning_plan = gemini_client.send_prompt(skill)
    if "error" in learning_plan:
        return render_template('error.html', error=learning_plan["error"])
    
    user_data = load_user_data(user_id)
    for step in learning_plan.get("steps", []):
        step["progress"] = 0
        step["status"] = "not_started"
        # Ensure sub_steps exists and is properly initialized
        if "sub_steps" not in step or step["sub_steps"] is None:
            step["sub_steps"] = []
        for sub_step in step.get("sub_steps", []):
            if "status" not in sub_step:
                sub_step["status"] = "not_started"
    
    learning_plan["overall_progress"] = 0
    learning_plan["created_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    existing_skills = [s for s in user_data.get("skills", []) if s.get("skill_name") == learning_plan.get("skill_name")]
    if existing_skills:
        existing_skills.update(learning_plan)
    else:
        user_data.setdefault("skills", []).append(learning_plan)
    
    save_user_data(user_data, user_id)
    return redirect(url_for('view_skill', skill_id=learning_plan.get("skill_name")))

@app.route('/skill/<skill_id>')
def view_skill(skill_id):
    user_id = session.get('user_id', 'default')
    user_data = load_user_data(user_id)
    skill = next((s for s in user_data.get("skills", []) if s.get("skill_name") == skill_id), None)
    if not skill:
        return render_template('error.html', error="Skill not found")
    return render_template('skill.html', skill=skill)

@app.route('/step/<skill_id>/<int:step_index>')
def view_step(skill_id, step_index):
    user_id = session.get('user_id', 'default')
    user_data = load_user_data(user_id)
    skill = next((s for s in user_data.get("skills", []) if s.get("skill_name") == skill_id), None)
    if not skill or step_index >= len(skill.get("steps", [])):
        return render_template('error.html', error="Step not found")
    
    step = skill["steps"][step_index]
    next_step_index = step_index + 1 if step_index + 1 < len(skill["steps"]) else None
    prev_step_index = step_index - 1 if step_index > 0 else None
    
    return render_template('step.html', skill=skill, step=step,
                           step_index=step_index,
                           next_step_index=next_step_index,
                           prev_step_index=prev_step_index)

@app.route('/static/js/step-navigation.js')
def step_navigation_js():
    """Serve the new step navigation JavaScript file"""
    return send_file('static/js/step-navigation.js')

@app.route('/check-step/<skill_id>/<int:step_index>')
def check_step_exists(skill_id, step_index):
    """Check if a step exists for the given skill"""
    user_id = session.get('user_id', 'default')
    user_data = load_user_data(user_id)
    skill = next((s for s in user_data.get("skills", []) if s.get("skill_name") == skill_id), None)
    if not skill or step_index >= len(skill.get("steps", [])):
        return jsonify({"exists": False})
    return jsonify({"exists": True})

# Modify the update_progress function to handle completion status better
@app.route('/update-progress', methods=['POST'])
def update_progress():
    data = request.json
    skill_id, step_index, substep_index, status = data.get('skill_id'), data.get('step_index'), data.get('substep_index'), data.get('status')
    
    user_id = session.get('user_id', 'default')
    user_data = load_user_data(user_id)
    
    skill = next((s for s in user_data.get("skills", []) if s.get("skill_name") == skill_id), None)
    if not skill or int(step_index) >= len(skill.get("steps", [])):
        return jsonify({"error": "Invalid skill or step index"})
    
    step = skill["steps"][int(step_index)]
    step["status"] = status
    
    # Handle substep progress if applicable
    if substep_index is not None and int(substep_index) < len(step.get("sub_steps", [])):
        sub_step = step["sub_steps"][int(substep_index)]
        sub_step["status"] = status
        
        # Calculate step progress based on substeps
        if step.get("sub_steps") and len(step["sub_steps"]) > 0:
            completed_substeps = sum(1 for sub in step["sub_steps"] if sub.get("status") == "completed")
            in_progress_substeps = sum(1 for sub in step["sub_steps"] if sub.get("status") == "in_progress")
            total_substeps = len(step["sub_steps"])
            
            # Calculate weighted progress (completed = 100%, in_progress = 50%)
            step["progress"] = int(((completed_substeps + (in_progress_substeps * 0.5)) / total_substeps) * 100)
    else:
        # If no substeps, set progress based on status
        if status == "not_started":
            step["progress"] = 0
        elif status == "in_progress":
            step["progress"] = 50
        elif status == "completed":
            step["progress"] = 100
    
    # Calculate overall progress with weighted values
    total_steps = len(skill["steps"])
    completed_steps = sum(1 for s in skill["steps"] if s.get("status") == "completed")
    in_progress_steps = sum(1 for s in skill["steps"] if s.get("status") == "in_progress")
    
    # Calculate weighted progress (completed = 100%, in_progress = 50%)
    skill["overall_progress"] = int(((completed_steps + (in_progress_steps * 0.5)) / total_steps) * 100)
    
    save_user_data(user_data, user_id)
    
    return jsonify({
        "success": True,
        "step_progress": step["progress"],
        "overall_progress": skill["overall_progress"]
    })


@app.route('/get-mcqs/<skill_id>/<step_index>')
def get_mcqs(skill_id, step_index):
    user_id = session.get('user_id', 'default')
    user_data = load_user_data(user_id)
    
    try:
        step_index = int(step_index)
        skill = next((s for s in user_data.get("skills", []) if s.get("skill_name") == skill_id), None)
        
        if not skill or step_index >= len(skill.get("steps", [])):
            return jsonify({"questions": []})
        
        step = skill["steps"][step_index]
        
        # Generate MCQs if not already present
        if "mcqs" not in step or not step.get("mcqs", {}).get("questions"):
            step_content = f"{step.get('title', '')} {step.get('explanation', '')} {step.get('exercise', '')} {step.get('tip', '')}"
            mcqs = mcq_generator.generate_mcqs(step_content)
            
            # Ensure we have a valid questions array
            if not isinstance(mcqs, dict):
                mcqs = {"questions": []}
            elif not isinstance(mcqs.get("questions", []), list):
                mcqs = {"questions": []}
                
            step["mcqs"] = mcqs
            save_user_data(user_data, user_id)
        
        return jsonify(step.get("mcqs", {"questions": []}))
    except Exception as e:
        print(f"Error generating MCQs: {str(e)}")
        return jsonify({"questions": []})
@app.route('/congratulations/<skill_id>')
def congratulations(skill_id):
    user_id = session.get('user_id', 'default')
    user_data = load_user_data(user_id)
    
    skill = next((s for s in user_data.get("skills", []) if s.get("skill_name") == skill_id), None)
    if not skill:
        return render_template('error.html', error="Skill not found")
    
    # Ensure skill is marked as 100% complete
    skill["overall_progress"] = 100
    for step in skill.get("steps", []):
        step["status"] = "completed"
        step["progress"] = 100
    
    save_user_data(user_data, user_id)
    
    return render_template('congratulations.html', skill=skill)


if __name__ == "__main__":
    app.run(debug=True, port=5000)