// finstack-frontend-final/src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { TaskService } from './task.service';
import { Task } from './task.model';

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

  // --- Filter Modal Properties ---
  showFilterModal: boolean = false;
  currentFilterColumn: string | null = null;
  filterSearchTerm: string = '';

  // Specific filter selections (temporary for modal)
  selectedFilterTaskTypes: string[] = [];
  selectedFilterEntityNames: string[] = [];
  selectedFilterStatuses: string[] = [];
  selectedFilterDates: string[] = [];
  selectedFilterContactPersons: string[] = []; // NEW: for Contact Person

  // Specific applied filters (affecting the table display)
  appliedFilterTaskTypes: string[] = [];
  appliedFilterEntityNames: string[] = [];
  appliedFilterStatuses: string[] = [];
  appliedFilterDates: string[] = [];
  appliedFilterContactPersons: string[] = []; // NEW: for Contact Person

  newTaskForm: FormGroup;
  editTaskForm: FormGroup;

  taskTypes: string[] = ['Call', 'Meeting', 'Video Call'];

  constructor(private taskService: TaskService, private fb: FormBuilder) {
    this.newTaskForm = this.fb.group({
      entityName: ['', Validators.required],
      date: [this.getCurrentDateString(), Validators.required],
      time: [this.getCurrentTimeString(), Validators.required],
      taskType: ['Call', Validators.required],
      phoneNumber: [''],
      contactPerson: [''],
      note: [''],
      status: ['open']
    });

    this.editTaskForm = this.fb.group({
      id: [{value: '', disabled: true}],
      entityName: ['', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required],
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
      },
      (error) => {
        console.error('Error loading tasks:', error);
      }
    );
  }

  changeFormStatus(status: 'open' | 'closed'): void {
    const currentForm = this.editingTask ? this.editTaskForm : this.newTaskForm;
    currentForm.get('status')?.setValue(status);
  }

  createTask(): void {
    if (!this.showNewTaskModal) {
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
      return;
    }

    if (this.newTaskForm.invalid) {
      console.error('New Task Form is invalid. Cannot create task.');
      this.newTaskForm.markAllAsTouched();
      return;
    }

    const taskData = this.newTaskForm.value;

    this.taskService.createTask(taskData).subscribe(
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
      alert(`Calling ${entityName} at ${phoneNumber || 'No number provided'}`);
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
    delete updatedData.date; // Backend uses date_created automatically

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

  // --- Filter Modal Methods - UPDATED FOR MULTIPLE COLUMNS ---

  openFilterModal(column: string): void {
    this.currentFilterColumn = column;
    this.filterSearchTerm = ''; // Reset search term when opening

    // Initialize selected filters with currently applied filters for the specific column
    if (column === 'taskType') {
      this.selectedFilterTaskTypes = [...this.appliedFilterTaskTypes];
    } else if (column === 'entityName') {
      this.selectedFilterEntityNames = [...this.appliedFilterEntityNames];
    } else if (column === 'status') {
      this.selectedFilterStatuses = [...this.appliedFilterStatuses];
    } else if (column === 'date') {
      this.selectedFilterDates = [...this.appliedFilterDates];
    } else if (column === 'contactPerson') { // NEW
      this.selectedFilterContactPersons = [...this.appliedFilterContactPersons];
    }
    this.showFilterModal = true;
  }

  closeFilterModal(): void {
    this.showFilterModal = false;
    this.currentFilterColumn = null;
    this.filterSearchTerm = '';
  }

  // Handle checkbox changes in the filter modal (now generic)
  onFilterCheckboxChange(value: string, event: Event, filterType: string): void {
    const inputElement = event.target as HTMLInputElement;
    let targetArray: string[] = [];

    if (filterType === 'taskType') targetArray = this.selectedFilterTaskTypes;
    else if (filterType === 'entityName') targetArray = this.selectedFilterEntityNames;
    else if (filterType === 'status') targetArray = this.selectedFilterStatuses;
    else if (filterType === 'date') targetArray = this.selectedFilterDates;
    else if (filterType === 'contactPerson') targetArray = this.selectedFilterContactPersons; // NEW

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

    // Assign back to trigger Angular change detection if targetArray was reassigned locally
    if (filterType === 'taskType') this.selectedFilterTaskTypes = targetArray;
    else if (filterType === 'entityName') this.selectedFilterEntityNames = targetArray;
    else if (filterType === 'status') this.selectedFilterStatuses = targetArray;
    else if (filterType === 'date') this.selectedFilterDates = targetArray;
    else if (filterType === 'contactPerson') this.selectedFilterContactPersons = targetArray; // NEW
  }

  // Apply button handler - UPDATED
  applyFilters(): void {
    if (this.currentFilterColumn === 'taskType') {
      this.appliedFilterTaskTypes = [...this.selectedFilterTaskTypes];
    } else if (this.currentFilterColumn === 'entityName') {
      this.appliedFilterEntityNames = [...this.selectedFilterEntityNames];
    } else if (this.currentFilterColumn === 'status') {
      this.appliedFilterStatuses = [...this.selectedFilterStatuses];
    } else if (this.currentFilterColumn === 'date') {
      this.appliedFilterDates = [...this.selectedFilterDates];
    } else if (this.currentFilterColumn === 'contactPerson') { // NEW
      this.appliedFilterContactPersons = [...this.selectedFilterContactPersons];
    }
    // tasksToDisplay getter will automatically re-evaluate based on applied filters
    this.closeFilterModal();
  }

  // Clear button handler - UPDATED
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
    } else if (this.currentFilterColumn === 'contactPerson') { // NEW
      this.selectedFilterContactPersons = [];
      this.appliedFilterContactPersons = [];
    }
    this.closeFilterModal();
  }

  // Getters for filter options based on the currently selected column
  get uniqueEntityNames(): string[] {
    // Extract unique entity names from all tasks, sort, and remove duplicates
    return [...new Set(this.tasks.map(task => task.entityName))].sort((a, b) => a.localeCompare(b));
  }

  get uniqueDates(): string[] {
    // Extract unique formatted dates (YYYY-MM-DD) from all tasks, sort them chronologically
    return [...new Set(this.tasks.map(task => formatDate(task.dateCreated, 'yyyy-MM-dd', 'en-US')))]
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }

  get allStatuses(): string[] {
    return ['open', 'closed'];
  }

  // NEW: Getters for unique contact persons
  get uniqueContactPersons(): string[] {
    // Filter out null/undefined/empty strings, then get unique, sort, and return
    return [...new Set(this.tasks.map(task => task.contactPerson).filter(Boolean) as string[])]
           .sort((a, b) => a.localeCompare(b));
  }

  // Central getter to provide options to the filter modal based on currentFilterColumn
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
    } else if (this.currentFilterColumn === 'contactPerson') { // NEW
      options = this.uniqueContactPersons;
    }

    if (!this.filterSearchTerm) {
      return options;
    }
    const searchTermLower = this.filterSearchTerm.toLowerCase();
    return options.filter(option => option.toLowerCase().includes(searchTermLower));
  }

  // Helper method for ID generation
  generateFilterId(option: string): string {
    if (!this.currentFilterColumn) {
      return ''; // Should not happen, but for safety
    }
    // Replace non-alphanumeric characters with hyphens, then convert to lowercase
    const safeOption = option.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    return `filter-${this.currentFilterColumn}-${safeOption}`;
  }

  // Check if an item is selected in the current filter column's temporary selection
  isFilterItemSelected(value: string): boolean {
    if (this.currentFilterColumn === 'taskType') return this.selectedFilterTaskTypes.includes(value);
    if (this.currentFilterColumn === 'entityName') return this.selectedFilterEntityNames.includes(value);
    if (this.currentFilterColumn === 'status') return this.selectedFilterStatuses.includes(value);
    if (this.currentFilterColumn === 'date') return this.selectedFilterDates.includes(value);
    if (this.currentFilterColumn === 'contactPerson') return this.selectedFilterContactPersons.includes(value); // NEW
    return false;
  }

  // Getter to return tasks that should be displayed in the table based on ALL applied filters
  get tasksToDisplay(): Task[] {
    let displayedTasks = [...this.tasks]; // Start with all tasks

    console.log('--- Filtering started ---');
    console.log('Initial tasks:', this.tasks.length);

    // Apply Task Type filter
    if (this.appliedFilterTaskTypes.length > 0) {
      console.log('Applying Task Type filter:', this.appliedFilterTaskTypes);
      displayedTasks = displayedTasks.filter(task =>
        this.appliedFilterTaskTypes.includes(task.taskType)
      );
      console.log('Tasks after Task Type filter:', displayedTasks.length);
    }

    // Apply Entity Name filter
    if (this.appliedFilterEntityNames.length > 0) {
      console.log('Applying Entity Name filter:', this.appliedFilterEntityNames);
      displayedTasks = displayedTasks.filter(task =>
        this.appliedFilterEntityNames.includes(task.entityName)
      );
      console.log('Tasks after Entity Name filter:', displayedTasks.length);
    }

    // Apply Status filter
    if (this.appliedFilterStatuses.length > 0) {
      console.log('Applying Status filter:', this.appliedFilterStatuses);
      displayedTasks = displayedTasks.filter(task =>
        this.appliedFilterStatuses.map(s => s.toLowerCase()).includes(task.status.toLowerCase())
      );
      console.log('Tasks after Status filter:', displayedTasks.length);
    }

    // Apply Date filter
    if (this.appliedFilterDates.length > 0) {
      console.log('Applying Date filter:', this.appliedFilterDates);
      displayedTasks = displayedTasks.filter(task =>
        this.appliedFilterDates.includes(formatDate(task.dateCreated, 'yyyy-MM-dd', 'en-US'))
      );
      console.log('Tasks after Date filter:', displayedTasks.length);
    }

    // NEW: Apply Contact Person filter
    if (this.appliedFilterContactPersons.length > 0) {
      console.log('Applying Contact Person filter:', this.appliedFilterContactPersons);
      displayedTasks = displayedTasks.filter(task =>
        // Ensure task.contactPerson exists before including it, and handle case if necessary
        task.contactPerson && this.appliedFilterContactPersons.includes(task.contactPerson)
      );
      console.log('Tasks after Contact Person filter:', displayedTasks.length);
    }

    console.log('--- Filtering finished ---');
    console.log('Final displayed tasks:', displayedTasks.length);
    return displayedTasks;
  }
}