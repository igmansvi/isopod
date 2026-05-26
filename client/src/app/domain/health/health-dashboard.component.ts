import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HealthService, HealthStatus } from './health.service';

@Component({
  selector: 'app-health-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './health-dashboard.component.html'
})
export class HealthDashboardComponent implements OnInit {
  private readonly healthService = inject(HealthService);
  
  public readonly status = signal<HealthStatus | null>(null);
  public readonly isLoading = signal<boolean>(true);
  public readonly error = signal<string | null>(null);

  public ngOnInit(): void {
    this.refreshHealth();
  }

  public refreshHealth(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.healthService.checkHealth().subscribe({
      next: (data) => {
        this.status.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to connect to Isopod telemetry endpoint.');
        this.isLoading.set(false);
      }
    });
  }
}
