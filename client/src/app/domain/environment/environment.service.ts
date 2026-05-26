import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Environment, EnvironmentCreateDTO } from './environment.model';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

/**
 * Service managing environment data and API interactions.
 */
@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  
  public readonly environments = signal<Environment[]>([]);
  public readonly isLoading = signal<boolean>(false);

  constructor(private readonly apiService: ApiService) {}

  /**
   * Fetches all environments for the current user and updates the signal state.
   *
   * @returns {Observable<Environment[]>} An observable of the fetched environments
   */
  public loadEnvironments(): Observable<Environment[]> {
    this.isLoading.set(true);
    return this.apiService.get<Environment[]>('/environments').pipe(
      tap({
        next: (envs) => {
          this.environments.set(envs);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  /**
   * Creates a new environment and refreshes the list.
   *
   * @param {EnvironmentCreateDTO} payload The creation payload
   * @returns {Observable<Environment>} An observable of the created environment
   */
  public createEnvironment(payload: EnvironmentCreateDTO): Observable<Environment> {
    return this.apiService.post<Environment>('/environments', payload).pipe(
      tap(() => this.loadEnvironments().subscribe())
    );
  }

  /**
   * Starts an existing environment.
   *
   * @param {string} id The environment ID
   * @returns {Observable<Environment>} An observable of the updated environment
   */
  public startEnvironment(id: string): Observable<Environment> {
    return this.apiService.post<Environment>(`/environments/${id}/start`, {}).pipe(
      tap(() => this.loadEnvironments().subscribe())
    );
  }

  /**
   * Stops a running environment.
   *
   * @param {string} id The environment ID
   * @returns {Observable<Environment>} An observable of the updated environment
   */
  public stopEnvironment(id: string): Observable<Environment> {
    return this.apiService.post<Environment>(`/environments/${id}/stop`, {}).pipe(
      tap(() => this.loadEnvironments().subscribe())
    );
  }

  /**
   * Deletes an environment permanently.
   *
   * @param {string} id The environment ID
   * @returns {Observable<void>} An observable completing on success
   */
  public deleteEnvironment(id: string): Observable<void> {
    return this.apiService.delete<void>(`/environments/${id}`).pipe(
      tap(() => this.loadEnvironments().subscribe())
    );
  }
}
