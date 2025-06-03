// finstack-frontend-final/src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { TaskService } from './task.service';
import { Task } from './task.model'; // Assuming Task model matches backend's to_dict output

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule
  ]
})
export class AppComponent implements OnInit {
  title = 'Finstack Task List';
  tasks: Task[] = [];
  editingTask: Task | null = null;
  showNewTaskModal: boolean = false;

  showTaskOptionsModal: boolean = false;
  selectedTaskForOptions: Task | null = null;

  showFilterModal: boolean = false;
  currentFilterColumn: string | null = null;
  filterSearchTerm: string = '';

  selectedFilterTaskTypes: string[] = [];
  selectedFilterEntityNames: string[] = [];
  selectedFilterStatuses: string[] = [];
  selectedFilterDates: string[] = [];
  selectedFilterContactPersons: string[] = [];

  appliedFilterTaskTypes: string[] = [];
  appliedFilterEntityNames: string[] = [];
  appliedFilterStatuses: string[] = [];
  appliedFilterDates: string[] = [];
  appliedFilterContactPersons: string[] = [];

  newTaskForm: FormGroup;
  editTaskForm: FormGroup;

  taskTypes: string[] = ['Call', 'Meeting', 'Video Call'];

  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private taskService: TaskService, private fb: FormBuilder) {
    this.newTaskForm = this.fb.group({
      entityName: ['', Validators.required],
      date: [this.getCurrentDateString()],
      time: [this.getCurrentTimeString()],
      taskType: ['Call', Validators.required],
      phoneNumber: [''],
      contactPerson: [''],
      note: [''],
      status: ['open'] // Default status for new tasks
    });

    this.editTaskForm = this.fb.group({
      id: [{value: '', disabled: true}],
      entityName: ['', Validators.required],
      date: [''],
      time: [''],
      taskType: ['', Validators.required],
      phoneNumber: [''],
      contactPerson: [''],
      note: [''],
      status: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadTasks();
  }

  getCurrentDateString(): string {
    return formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
  }

  getCurrentTimeString(): string {
    return formatDate(new Date(), 'HH:mm', 'en-US');
  }

  loadTasks(): void {
    this.taskService.getTasks().subscribe(
      (tasks) => {
        this.tasks = tasks;
        console.log('Tasks received from backend:', this.tasks);
        this.applyFilters();
        this.sortTasks(this.sortColumn || 'dateCreated');
      },
      (error) => {
        console.error('Error loading tasks:', error);
      }
    );
  }

  // --- REMOVED: toggleStatus method as it's no longer needed for a select dropdown ---
  // toggleStatus(): void {
  //   const currentForm = this.editingTask ? this.editTaskForm : this.newTaskForm;
  //   const currentStatus = currentForm.get('status')?.value;
  //   const newStatus = currentStatus === 'open' ? 'closed' : 'open';
  //   currentForm.get('status')?.setValue(newStatus);
  // }

  openCreateTaskModal(): void {
    this.showNewTaskModal = true;
    this.newTaskForm.reset({
      entityName: '',
      date: this.getCurrentDateString(),
      time: this.getCurrentTimeString(),
      taskType: 'Call',
      phoneNumber: '',
      contactPerson: '',
      note: '',
      status: 'open'
    });
    this.editingTask = null;
  }

  createTask(): void {
    if (this.newTaskForm.invalid) {
      console.error('New Task Form is invalid. Cannot create task.');
      this.newTaskForm.markAllAsTouched();
      return;
    }

    const payload = {
      entityName: this.newTaskForm.value.entityName,
      taskType: this.newTaskForm.value.taskType,
      time: this.newTaskForm.value.time,
      contactPerson: this.newTaskForm.value.contactPerson,
      phoneNumber: this.newTaskForm.value.phoneNumber,
      note: this.newTaskForm.value.note,
      status: this.newTaskForm.value.status
    };

    this.taskService.createTask(payload).subscribe(
      (createdTask) => {
        console.log('Task created successfully:', createdTask);
        this.newTaskForm.reset();
        this.loadTasks();
        this.showNewTaskModal = false;
      },
      (error) => {
        console.error('Error creating task:', error);
      }
    );
  }

  openTaskOptions(task: Task): void {
    this.selectedTaskForOptions = task;
    this.showTaskOptionsModal = true;
  }

  closeTaskOptions(): void {
    this.selectedTaskForOptions = null;
    this.showTaskOptionsModal = false;
  }

  handleCall(): void {
    if (this.selectedTaskForOptions) {
      const entityName = this.selectedTaskForOptions.entityName;
      const phoneNumber = this.selectedTaskForOptions.phoneNumber;
      console.log(`Simulating a call for ${entityName}. Phone: ${phoneNumber || 'N/A'}`);
      console.log(`Calling ${entityName} at ${phoneNumber || 'No number provided'}`);
    }
    this.closeTaskOptions();
  }

  editTask(task: Task): void {
    this.closeTaskOptions();
    this.editingTask = task;
    this.showNewTaskModal = true;

    const fullDate = task.dateCreated ? new Date(task.dateCreated) : new Date();
    const formattedDate = formatDate(fullDate, 'yyyy-MM-dd', 'en-US');
    const formattedTime = task.time || this.getCurrentTimeString();

    this.editTaskForm.patchValue({
      id: task.id,
      entityName: task.entityName,
      date: formattedDate,
      time: formattedTime,
      taskType: task.taskType,
      phoneNumber: task.phoneNumber || '',
      contactPerson: task.contactPerson,
      note: task.note,
      status: task.status
    });
  }

  saveEditedTask(): void {
    if (!this.editingTask) {
      console.error('No task selected for editing.');
      return;
    }

    if (this.editTaskForm.invalid) {
      console.error('Edit Task Form is invalid. Cannot save changes.');
      this.editTaskForm.markAllAsTouched();
      return;
    }

    const updatedData = { ...this.editingTask, ...this.editTaskForm.value };
    delete updatedData.date;

    const taskId = this.editingTask.id;

    this.taskService.updateTask(taskId, updatedData).subscribe(
      (updatedTask) => {
        console.log('Task updated successfully:', updatedTask);
        this.cancelEdit();
        this.loadTasks();
        this.showNewTaskModal = false;
      },
      (error) => {
        console.error('Error updating task:', error);
      }
    );
  }

  cancelEdit(): void {
    this.editingTask = null;
    this.newTaskForm.reset();
    this.editTaskForm.reset();
    this.showNewTaskModal = false;
    this.closeTaskOptions();
  }

  deleteTask(id: string): void {
    this.closeTaskOptions();

    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(id).subscribe(
        () => {
          console.log('Task deleted successfully.');
          this.cancelEdit();
          this.loadTasks();
        },
        (error) => {
          console.error('Error deleting task:', error);
        }
      );
    }
  }

  clearSort(): void {
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.applyFilters();
  }

  sortTasks(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.tasksToDisplay.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (column === 'dateCreated') {
        valA = new Date(a.dateCreated).getTime();
        valB = new Date(b.dateCreated).getTime();
      } else if (column === 'lastStatusChangeDate' && a.lastStatusChangeDate && b.lastStatusChangeDate) {
        valA = new Date(a.lastStatusChangeDate).getTime();
        valB = new Date(b.lastStatusChangeDate).getTime();
      }
      else {
        valA = (a as any)[this.sortColumn!];
        valB = (b as any)[this.sortColumn!];
        if (typeof valA === 'string' && typeof valB === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }
      }

      if (valA < valB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  openFilterModal(column: string): void {
    this.currentFilterColumn = column;
    this.filterSearchTerm = '';

    if (column === 'taskType') {
      this.selectedFilterTaskTypes = [...this.appliedFilterTaskTypes];
    } else if (column === 'entityName') {
      this.selectedFilterEntityNames = [...this.appliedFilterEntityNames];
    } else if (column === 'status') {
      this.selectedFilterStatuses = [...this.appliedFilterStatuses];
    } else if (column === 'date') {
      this.selectedFilterDates = [...this.appliedFilterDates];
    } else if (column === 'contactPerson') {
      this.selectedFilterContactPersons = [...this.appliedFilterContactPersons];
    }
    this.showFilterModal = true;
  }

  closeFilterModal(): void {
    this.showFilterModal = false;
    this.currentFilterColumn = null;
    this.filterSearchTerm = '';
  }

  onFilterCheckboxChange(value: string, event: Event, filterType: string): void {
    const inputElement = event.target as HTMLInputElement;
    let targetArray: string[] = [];

    if (filterType === 'taskType') targetArray = this.selectedFilterTaskTypes;
    else if (filterType === 'entityName') targetArray = this.selectedFilterEntityNames;
    else if (filterType === 'status') targetArray = this.selectedFilterStatuses;
    else if (filterType === 'date') targetArray = this.selectedFilterDates;
    else if (filterType === 'contactPerson') targetArray = this.selectedFilterContactPersons;

    if (inputElement.checked) {
      if (!targetArray.includes(value)) {
        targetArray.push(value);
      }
    } else {
      const index = targetArray.indexOf(value);
      if (index > -1) {
        targetArray.splice(index, 1);
      }
    }

    if (filterType === 'taskType') this.selectedFilterTaskTypes = [...targetArray];
    else if (filterType === 'entityName') this.selectedFilterEntityNames = [...targetArray];
    else if (filterType === 'status') this.selectedFilterStatuses = [...targetArray];
    else if (filterType === 'date') this.selectedFilterDates = [...targetArray];
    else if (filterType === 'contactPerson') this.selectedFilterContactPersons = [...targetArray];
  }

  applyFilters(): void {
    if (this.currentFilterColumn === 'taskType') {
      this.appliedFilterTaskTypes = [...this.selectedFilterTaskTypes];
    } else if (this.currentFilterColumn === 'entityName') {
      this.appliedFilterEntityNames = [...this.selectedFilterEntityNames];
    } else if (this.currentFilterColumn === 'status') {
      this.appliedFilterStatuses = [...this.selectedFilterStatuses];
    } else if (this.currentFilterColumn === 'date') {
      this.appliedFilterDates = [...this.selectedFilterDates];
    } else if (this.currentFilterColumn === 'contactPerson') {
      this.appliedFilterContactPersons = [...this.selectedFilterContactPersons];
    }
    this.closeFilterModal();
  }

  clearFilters(): void {
    if (this.currentFilterColumn === 'taskType') {
      this.selectedFilterTaskTypes = [];
      this.appliedFilterTaskTypes = [];
    } else if (this.currentFilterColumn === 'entityName') {
      this.selectedFilterEntityNames = [];
      this.appliedFilterEntityNames = [];
    } else if (this.currentFilterColumn === 'status') {
      this.selectedFilterStatuses = [];
      this.appliedFilterStatuses = [];
    } else if (this.currentFilterColumn === 'date') {
      this.selectedFilterDates = [];
      this.appliedFilterDates = [];
    } else if (this.currentFilterColumn === 'contactPerson') {
      this.selectedFilterContactPersons = [];
      this.appliedFilterContactPersons = [];
    }
    this.closeFilterModal();
    this.applyFilters();
  }

  get uniqueEntityNames(): string[] {
    return [...new Set(this.tasks.map(task => task.entityName))].sort((a, b) => a.localeCompare(b));
  }

  get uniqueDates(): string[] {
    return [...new Set(this.tasks.map(task => formatDate(task.dateCreated, 'yyyy-MM-dd', 'en-US')))]
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }

  get allStatuses(): string[] {
    return ['open', 'closed'];
  }

  get uniqueContactPersons(): string[] {
    return [...new Set(this.tasks.map(task => task.contactPerson).filter(Boolean) as string[])]
           .sort((a, b) => a.localeCompare(b));
  }

  get filterOptionsForModal(): string[] {
    let options: string[] = [];
    if (this.currentFilterColumn === 'taskType') {
      options = this.taskTypes;
    } else if (this.currentFilterColumn === 'entityName') {
      options = this.uniqueEntityNames;
    }
    else if (this.currentFilterColumn === 'status') {
      options = this.allStatuses;
    } else if (this.currentFilterColumn === 'date') {
      options = this.uniqueDates;
    } else if (this.currentFilterColumn === 'contactPerson') {
      options = this.uniqueContactPersons;
    }

    if (!this.filterSearchTerm) {
      return options;
    }
    const searchTermLower = this.filterSearchTerm.toLowerCase();
    return options.filter(option => option.toLowerCase().includes(searchTermLower));
  }

  generateFilterId(option: string): string {
    if (!this.currentFilterColumn) {
      return '';
    }
    const safeOption = option.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    return `filter-${this.currentFilterColumn}-${safeOption}`;
  }

  isFilterItemSelected(value: string): boolean {
    if (this.currentFilterColumn === 'taskType') return this.selectedFilterTaskTypes.includes(value);
    if (this.currentFilterColumn === 'entityName') return this.selectedFilterEntityNames.includes(value);
    if (this.currentFilterColumn === 'status') return this.selectedFilterStatuses.includes(value);
    if (this.currentFilterColumn === 'date') return this.selectedFilterDates.includes(value);
    if (this.currentFilterColumn === 'contactPerson') return this.selectedFilterContactPersons.includes(value);
    return false;
  }

  get tasksToDisplay(): Task[] {
    let displayedTasks = [...this.tasks];

    if (this.appliedFilterTaskTypes.length > 0) {
      displayedTasks = displayedTasks.filter(task =>
        this.appliedFilterTaskTypes.includes(task.taskType)
      );
    }

    if (this.appliedFilterEntityNames.length > 0) {
      displayedTasks = displayedTasks.filter(task =>
        this.appliedFilterEntityNames.includes(task.entityName)
      );
    }

    if (this.appliedFilterStatuses.length > 0) {
      displayedTasks = displayedTasks.filter(task =>
        this.appliedFilterStatuses.map(s => s.toLowerCase()).includes(task.status.toLowerCase())
      );
    }

    if (this.appliedFilterDates.length > 0) {
      displayedTasks = displayedTasks.filter(task =>
        this.appliedFilterDates.includes(formatDate(task.dateCreated, 'yyyy-MM-dd', 'en-US'))
      );
    }

    if (this.appliedFilterContactPersons.length > 0) {
      displayedTasks = displayedTasks.filter(task =>
        task.contactPerson && this.appliedFilterContactPersons.includes(task.contactPerson)
      );
    }

    if (this.sortColumn) {
      displayedTasks.sort((a, b) => {
        let valA: any;
        let valB: any;

        if (this.sortColumn === 'dateCreated') {
          valA = new Date(a.dateCreated).getTime();
          valB = new Date(b.dateCreated).getTime();
        } else if (this.sortColumn === 'lastStatusChangeDate' && a.lastStatusChangeDate && b.lastStatusChangeDate) {
          valA = new Date(a.lastStatusChangeDate).getTime();
          valB = new Date(b.lastStatusChangeDate).getTime();
        } else {
          valA = (a as any)[this.sortColumn!];
          valB = (b as any)[this.sortColumn!];
          if (typeof valA === 'string' && typeof valB === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
          }
        }

        if (valA < valB) {
          return this.sortDirection === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return this.sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return displayedTasks;
  }
}