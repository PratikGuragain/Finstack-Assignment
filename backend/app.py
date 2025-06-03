# backend/app.py

# ... imports ...
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
import os
import uuid
from datetime import datetime # Make sure datetime is imported for logging and timestamping

# ... app, db, migrate initialization ...
app = Flask(__name__)
# Configure your PostgreSQL database URL from Render environment
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# --- NEW CORS CONFIGURATION BLOCK ---
# Get the origin explicitly. Fallback to a development default if not found
allowed_origins = os.environ.get("CORE_ORIGIN")

# If you have multiple origins, you can split them by comma:
# allowed_origins = os.environ.get("CORE_ORIGIN").split(',') if os.environ.get("CORE_ORIGIN") else None

# Configure CORS - The origin should be your Netlify frontend URL
if allowed_origins:
    app.logger.info(f"CORS configured with specific origin: {allowed_origins}")
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
else:
    # Fallback for development if CORE_ORIGIN is not set or is None.
    # This is less secure as it allows all origins, use for debugging only.
    app.logger.warning("CORE_ORIGIN environment variable not set or is None. Enabling CORS for all origins for debugging.")
    CORS(app) # This will enable CORS for all origins, less secure, but will bypass the NoneType error

# --- END NEW CORS CONFIGURATION BLOCK ---

# ... Task model definition ...
class Task(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dateCreated = db.Column(db.String(20), default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    taskDate = db.Column(db.String(20), nullable=False)
    entityName = db.Column(db.String(255), nullable=False)
    taskType = db.Column(db.String(255), nullable=False)
    time = db.Column(db.String(50))
    contactPerson = db.Column(db.String(255))
    phoneNumber = db.Column(db.String(20))
    note = db.Column(db.Text)
    status = db.Column(db.String(50), default='open')
    lastStatusChangeDate = db.Column(db.String(20))


    def to_dict(self):
        return {
            'id': self.id,
            'dateCreated': self.dateCreated,
            'taskDate': self.taskDate,
            'entityName': self.entityName,
            'taskType': self.taskType,
            'time': self.time,
            'contactPerson': self.contactPerson,
            'phoneNumber': self.phoneNumber,
            'note': self.note,
            'status': self.status,
            'lastStatusChangeDate': self.lastStatusChangeDate
        }

# ... Routes for creating and getting tasks ...

# GET all tasks or POST a new task
@app.route('/api/tasks', methods=['GET', 'POST'])
def handle_tasks():
    if request.method == 'POST':
        # Add logging here
        app.logger.info("Received POST request to /api/tasks")
        data = request.json
        app.logger.info(f"Received JSON data for new task: {data}") # Log the received JSON data

        if not data:
            app.logger.error("Request must contain JSON data") # Log error
            return jsonify({"error": "Request must contain JSON data"}), 400

        # Ensure all required fields are present
        required_fields = ['taskDate', 'entityName', 'taskType']
        if not all(key in data for key in required_fields):
            missing = [key for key in required_fields if key not in data]
            app.logger.error(f"Missing required fields: {', '.join(missing)}") # Log missing fields
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        # Create new task instance
        new_task = Task(
            taskDate=data['taskDate'],
            entityName=data['entityName'],
            taskType=data['taskType'],
            time=data.get('time'),
            contactPerson=data.get('contactPerson'),
            phoneNumber=data.get('phoneNumber'),
            note=data.get('note'),
            status=data.get('status', 'open')
        )

        try:
            db.session.add(new_task)
            db.session.commit()
            app.logger.info(f"Task created successfully: {new_task.id}") # Log success
            return jsonify(new_task.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error creating task: {e}") # Existing error logging
            return jsonify({"error": "Could not create task", "details": str(e)}), 500

    elif request.method == 'GET':
        app.logger.info("Received GET request to /api/tasks") # Log GET request
        tasks = Task.query.all()
        return jsonify([task.to_dict() for task in tasks]), 200

# Other routes like DELETE, PUT, GET by ID if you have them
# Example: DELETE/PUT/GET single task by ID
@app.route('/api/tasks/<string:task_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_single_task(task_id):
    app.logger.info(f"Received request for task_id: {task_id}, method: {request.method}") # Log for single task
    task = Task.query.get(task_id)
    if not task:
        app.logger.error(f"Task with ID {task_id} not found") # Log not found
        return jsonify({"error": "Task not found"}), 404

    if request.method == 'GET':
        return jsonify(task.to_dict()), 200

    elif request.method == 'PUT':
        data = request.json
        app.logger.info(f"Received JSON data for updating task {task_id}: {data}") # Log update data

        if not data:
            return jsonify({"error": "Request must contain JSON data"}), 400

        # Update fields if present in the request data
        task.entityName = data.get('entityName', task.entityName)
        task.taskType = data.get('taskType', task.taskType)
        task.time = data.get('time', task.time)
        task.contactPerson = data.get('contactPerson', task.contactPerson)
        task.phoneNumber = data.get('phoneNumber', task.phoneNumber)
        task.note = data.get('note', task.note)
        task.taskDate = data.get('taskDate', task.taskDate)

        new_status = data.get('status')
        if new_status and new_status != task.status:
            task.status = new_status
            task.lastStatusChangeDate = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        try:
            db.session.commit()
            app.logger.info(f"Task {task_id} updated successfully") # Log update success
            return jsonify(task.to_dict()), 200
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error updating task {task_id}: {e}") # Existing error logging
            return jsonify({"error": "Could not update task", "details": str(e)}), 500

    elif request.method == 'DELETE':
        try:
            db.session.delete(task)
            db.session.commit()
            app.logger.info(f"Task {task_id} deleted successfully") # Log delete success
            return jsonify({"message": "Task deleted successfully"}), 200
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error deleting task {task_id}: {e}") # Existing error logging
            return jsonify({"error": "Could not delete task", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)