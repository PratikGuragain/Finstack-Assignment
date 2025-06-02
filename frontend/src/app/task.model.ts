// finstack-frontend-final/src/app/task.model.ts
export interface Task {
  id: string;
  dateCreated: string;
  entityName: string;
  taskType: string;
  time?: string;
  contactPerson?: string;
  phoneNumber?: string;
  note?: string;
  status: 'open' | 'closed';
  lastStatusChangeDate?: string; // NEWLY ADDED for tooltip
}