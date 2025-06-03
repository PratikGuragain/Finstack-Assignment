# finstack-task-app/backend/app.py
from flask import Flask, request, jsonify # Removed send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
from uuid import uuid4
import os
from flask_migrate import Migrate

# 1. REMOVE STATIC_FOLDER AND static_folder ARGUMENT FROM Flask() constructor
#    Because Netlify handles the frontend, Flask handles only the API.
# app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path='') # REMOVE THIS LINE
app = Flask(__name__) # <<< USE THIS LINE INSTEAD

# 2. Configure CORS dynamically for production/local.
#    This makes sure Flask only allows requests from your Netlify frontend URL.
CORS_ORIGIN = os.environ.get('CORS_ORIGIN', 'http://localhost:4200')
CORS(app, resources={r"/api/*": {"origins": CORS_ORIGIN}}) # Specific CORS for /api routes

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///site.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# --- Task Model (NO CHANGES NEEDED HERE - it's good) ---
class Task(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    date_created = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    # --- ADD THIS NEW COLUMN HERE ---
    task_date = db.Column(db.String(50), nullable=False) # For the user-entered date (e.g., "02/04/2024")
    # --- END NEW COLUMN ---
    entity_name = db.Column(db.String(100), nullable=False)
    task_type = db.Column(db.String(100), nullable=False)
    time = db.Column(db.String(50))
    contact_person = db.Column(db.String(100))
    phone_number = db.Column(db.String(50))
    note = db.Column(db.Text)
    status = db.Column(db.String(20), default='open', nullable=False)
    last_status_change_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        # Ensure you have IST defined if you want timezone conversion
        # from pytz import timezone
        # IST = timezone('Asia/Kolkata')

        ist_last_status_change_date = self.last_status_change_date.astimezone(IST) if self.last_status_change_date else None
        ist_date_created = self.date_created.astimezone(IST) if self.date_created else None

        return {
            'id': self.id,
            'dateCreated': ist_date_created.strftime('%Y-%m-%d %I:%M %p') if ist_date_created else None,
            'entityName': self.entity_name,
            'taskType': self.task_type,
            'time': self.time,
            'contactPerson': self.contact_person,
            'phoneNumber': self.phone_number,
            'note': self.note,
            'status': self.status,
            'lastStatusChangeDate': ist_last_status_change_date.strftime('%Y-%m-%d %I:%M %p') if ist_last_status_change_date else None,
            # --- ADD THIS TO to_dict ---
            'taskDate': self.task_date # This will send the user-entered date to the frontend
            # --- END ADD ---
        }@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.json
    # --- UPDATE THIS LINE: Make taskDate a required field for creation ---
    if not data or not all(key in data for key in ['taskDate', 'entityName', 'taskType']):
        return jsonify({"error": "Missing required data (taskDate, entityName, or taskType)"}), 400

    new_task = Task(
        task_date=data['taskDate'], # <-- ADD THIS LINE: Save the user-entered date
        entity_name=data['entityName'],
        task_type=data['taskType'],
        time=data.get('time'),
        contact_person=data.get('contactPerson'),
        phone_number=data.get('phoneNumber'),
        note=data.get('note'),
        status=data.get('status', 'open'),
        # last_status_change_date and date_created are set by default in the model
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@app.route('/api/tasks/<string:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    task_to_update = db.session.get(Task, task_id)

    if not task_to_update:
        return jsonify({"error": "Task not found"}), 404

    old_status = task_to_update.status
    new_status = data.get('status', old_status)

    task_to_update.entity_name = data.get('entityName', task_to_update.entity_name)
    task_to_update.task_type = data.get('taskType', task_to_update.task_type)
    task_to_update.time = data.get('time', task_to_update.time)
    task_to_update.contact_person = data.get('contactPerson', task_to_update.contact_person)
    task_to_update.phone_number = data.get('phoneNumber', task_to_update.phone_number)
    task_to_update.note = data.get('note', task_to_update.note)

    if new_status != old_status:
        task_to_update.status = new_status
        task_to_update.last_status_change_date = datetime.utcnow()
    else:
        task_to_update.status = new_status

    db.session.commit()
    return jsonify(task_to_update.to_dict()), 200

@app.route('/api/tasks/<string:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task_to_delete = db.session.get(Task, task_id)

    if not task_to_delete:
        return jsonify({"error": "Task not found"}), 404

    db.session.delete(task_to_delete)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 200

# 3. REMOVE ALL STATIC FILE SERVING ROUTES. Heroku is ONLY for your API.
# @app.route('/')
# def serve_index():
#     return send_from_directory(STATIC_FOLDER, 'index.html')

# @app.route('/<path:path>')
# def serve_angular_static_assets(path):
#     requested_file_path = os.path.join(STATIC_FOLDER, path)
#     if os.path.exists(requested_file_path):
#         return send_from_directory(STATIC_FOLDER, path)
#     else:
#         return send_from_directory(STATIC_FOLDER, 'index.html')

# --- Run the Flask App (for local development only) ---
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=os.environ.get('PORT', 5000))