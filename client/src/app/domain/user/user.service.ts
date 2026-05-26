import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

/**
 * Service for managing the user's account lifecycle.
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiService = inject(ApiService);

  /**
   * Triggers a cascading deletion of the authenticated user's account,
   * environments, Docker containers, and physical files.
   *
   * @returns An observable that completes when the account is deleted
   */
  public deleteAccount(): Observable<void> {
    return this.apiService.delete<void>('/users/me');
  }
}
