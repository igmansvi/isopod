import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface HealthStatus {
  server: string;
  docker: string;
  cachedImages: string[];
}

/**
 * Service for fetching system health telemetry from the backend.
 */
@Injectable({
  providedIn: 'root'
})
export class HealthService {
  private readonly apiService = inject(ApiService);

  /**
   * Retrieves the current system health status.
   */
  public checkHealth(): Observable<HealthStatus> {
    return this.apiService.get<HealthStatus>('/health');
  }
}
