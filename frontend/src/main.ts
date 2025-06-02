// finstack-frontend-final/src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config'; // Import your appConfig
import { AppComponent } from './app/app.component'; // Import your AppComponent

bootstrapApplication(AppComponent, appConfig) // <--- Change this line
  .catch((err) => console.error(err));