import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SystemHealthIndicatorComponent } from './domain/health/system-health-indicator.component';

/**
 * Root application shell. Delegates all rendering to the router.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
