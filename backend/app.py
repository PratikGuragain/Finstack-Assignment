# finstack-task-app/backend/app.py
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
from uuid import uuid4

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Task(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    date_created = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    entity_name = db.Column(db.String(100), nullable=False)
    task_type = db.Column(db.String(100), nullable=False)
    time = db.Column(db.String(50))
    contact_person = db.Column(db.String(100))
    phone_number = db.Column(db.String(50))
    note = db.Column(db.Text)
    status = db.Column(db.String(20), default='open', nullable=False) # 'open' or 'closed'
    # NEW COLUMN: last_status_change_date
    last_status_change_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "dateCreated": self.date_created.isoformat(),
            "entityName": self.entity_name,
            "taskType": self.task_type,
            "time": self.time,
            "contactPerson": self.contact_person,
            "phoneNumber": self.phone_number,
            "note": self.note,
            "status": self.status,
            "lastStatusChangeDate": self.last_status_change_date.isoformat() # Include in dict
        }

with app.app_context():
    db.create_all()

@app.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all()
    return jsonify([task.to_dict() for task in tasks])

@app.route('/tasks', methods=['POST'])
def create_task():
    data = request.json
    if not data or not all(key in data for key in ['entityName', 'taskType']):
        return jsonify({"error": "Missing entityName or taskType"}), 400

    new_task = Task(
        entity_name=data['entityName'],
        task_type=data['taskType'],
        time=data.get('time'),
        contact_person=data.get('contactPerson'),
        phone_number=data.get('phoneNumber'),
        status=data.get('status', 'open'),
        note=data.get('note'),
        # Set last_status_change_date on creation
        last_status_change_date=datetime.utcnow()
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@app.route('/tasks/<string:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    task_to_update = db.session.get(Task, task_id)

    if not task_to_update:
        return jsonify({"error": "Task not found"}), 404

    # Check if status is being changed
    old_status = task_to_update.status
    new_status = data.get('status', old_status) # Get new status or keep old

    task_to_update.entity_name = data.get('entityName', task_to_update.entity_name)
    task_to_update.task_type = data.get('taskType', task_to_update.task_type)
    task_to_update.time = data.get('time', task_to_update.time)
    task_to_update.contact_person = data.get('contactPerson', task_to_update.contact_person)
    task_to_update.phone_number = data.get('phoneNumber', task_to_update.phone_number)
    task_to_update.note = data.get('note', task_to_update.note)

    # Update status and last_status_change_date if status has changed
    if new_status != old_status:
        task_to_update.status = new_status
        task_to_update.last_status_change_date = datetime.utcnow() # Update timestamp
    else:
        # Even if status didn't change, other fields might have been updated.
        # So ensure the status is set to the new_status (which might be the same as old_status)
        # to avoid accidental overwrites if 'status' key was present but value was same.
        task_to_update.status = new_status


    db.session.commit()
    return jsonify(task_to_update.to_dict()), 200

@app.route('/tasks/<string:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task_to_delete = db.session.get(Task, task_id)

    if not task_to_delete:
        return jsonify({"error": "Task not found"}), 404

    db.session.delete(task_to_delete)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 200

if __name__ == '__main__':
    app.run(debug=True)