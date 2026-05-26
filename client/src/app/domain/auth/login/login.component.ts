import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthStateService } from '../auth-state.service';
import { finalize } from 'rxjs/operators';

/**
 * Component handling user login.
 * Utilizes Angular Reactive Forms and connects to the backend auth API.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(ApiService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  public readonly loginForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  public readonly isLoading = signal(false);
  public readonly errorMessage = signal<string | null>(null);

  constructor() {}

  /**
   * Submits the login form to the backend.
   * If successful, updates the global auth state and navigates to the dashboard.
   */
  public onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.apiService.post<{ token: string }>('/auth/login', this.loginForm.value)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.authState.login(response.token);
        },
        error: (err) => {
          if (err.status === 0) {
            this.errorMessage.set('Unable to reach the server. Please check your connection.');
          } else {
            this.errorMessage.set(err.error?.message ?? err.statusText ?? 'An unexpected error occurred.');
          }
        }
      });
  }
}
