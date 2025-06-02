// finstack-frontend-final/src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter, Routes } from '@angular/router'; // Import Routes for the type
import { provideHttpClient } from '@angular/common/http'; // Import provideHttpClient

import { AppComponent } from './app.component'; // Import AppComponent for routes

// Define your routes here directly
const routes: Routes = [
  { path: '', component: AppComponent }
  // Add other standalone components here for routing if you create them
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), // Provides routing for standalone components
    provideHttpClient()    // Provides HttpClient for your services
  ]
};