// finstack-frontend-final/src/app/task.model.ts
export interface Task {
  id: string;
  dateCreated: string; // This is the automatic creation timestamp
  taskDate: string; // <--- ADD THIS LINE: This is for the user-entered date
  entityName: string;
  taskType: string;
  time?: string;
  contactPerson?: string;
  phoneNumber?: string;
  note?: string;
  status: 'open' | 'closed';
  lastStatusChangeDate?: string; // This is the automatic status change timestamp
}