import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HealthService, HealthStatus } from './health.service';

/**
 * A global floating indicator for system health.
 */
@Component({
  selector: 'app-system-health-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-6 right-6 z-50 group">
      <!-- Hover Card -->
      <div
        class="absolute bottom-full right-0 mb-3 w-64 bg-black border border-white p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
      >
        <h4 class="text-sm font-bold text-white mb-2 border-b border-neutral-800 pb-2">
          System Health
        </h4>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-neutral-400">Server:</span>
            <span [ngClass]="status()?.server === 'up' ? 'text-green-500' : 'text-red-500'">{{
              status()?.server || 'Checking...'
            }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-400">Docker:</span>
            <span
              [ngClass]="status()?.docker === 'accessible' ? 'text-green-500' : 'text-red-500'"
              >{{ status()?.docker || 'Checking...' }}</span
            >
          </div>
          @if (status()?.cachedImages?.length) {
            <div class="mt-2 pt-2 border-t border-neutral-800">
              <span class="text-neutral-400 block mb-1">Cached Images:</span>
              @for (img of status()?.cachedImages; track img) {
                <div class="text-neutral-300 font-mono truncate">{{ img }}</div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Indicator Dot -->
      <div
        class="w-4 h-4 rounded-full shadow-lg border border-neutral-800 flex items-center justify-center cursor-help transition-colors"
        [ngClass]="
          isHealthy() ? 'bg-green-500 shadow-green-500/20' : 'bg-red-500 shadow-red-500/20'
        "
      >
        @if (isHealthy()) {
          <div class="w-full h-full rounded-full animate-ping bg-green-400 opacity-20"></div>
        }
        @if (!isHealthy()) {
          <div class="w-full h-full rounded-full animate-ping bg-red-400 opacity-20"></div>
        }
      </div>
    </div>
  `,
})
export class SystemHealthIndicatorComponent implements OnInit, OnDestroy {
  private readonly healthService = inject(HealthService);

  public readonly status = signal<HealthStatus | null>(null);
  private intervalId: any;

  public ngOnInit(): void {
    this.checkHealth();
    this.intervalId = setInterval(() => this.checkHealth(), 30000);
  }

  public ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private checkHealth(): void {
    this.healthService.checkHealth().subscribe({
      next: (s) => this.status.set(s),
      error: () => this.status.set({ server: 'down', docker: 'unreachable', cachedImages: [] }),
    });
  }

  public isHealthy(): boolean {
    const s = this.status();
    if (!s) return false;
    return s.server === 'up' && s.docker === 'accessible';
  }
}
