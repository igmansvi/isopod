import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EnvironmentService } from './environment.service';
import { AuthStateService } from '../auth/auth-state.service';
import { UserService } from '../user/user.service';
import { HealthService } from '../health/health.service';
import { SystemHealthIndicatorComponent } from '../health/system-health-indicator.component';

/**
 * Component representing the main user dashboard, listing available environments
 * and providing creation/management controls.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SystemHealthIndicatorComponent],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {

  public readonly environmentService = inject(EnvironmentService);
  private readonly healthService = inject(HealthService);
  private readonly authState = inject(AuthStateService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  public readonly username = computed(() => {
    const t = this.authState.token();
    if (!t) return 'User';
    try {
      const payload = JSON.parse(atob(t.split('.')[1]));
      return payload.sub || 'User';
    } catch {
      return 'User';
    }
  });

  public readonly createForm = this.fb.group({
    name: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9-]+$')]],
    image: ['ubuntu:latest']
  });

  public isCreating = false;
  public showCreateModal = false;

  public showDeleteAccountModal = false;
  public showDeleteEnvModal = false;
  public envToDelete: string | null = null;

  public loadingStates: Record<string, 'starting' | 'stopping'> = {};

  public templates: { label: string, value: string }[] = [];

  constructor() {}

  /**
   * Lifecycle hook to initialize the environment list.
   */
  public ngOnInit(): void {
    this.environmentService.loadEnvironments().subscribe();
    this.healthService.checkHealth().subscribe({
      next: (status) => {
        if (status && status.cachedImages) {
          this.templates = status.cachedImages.map(img => ({ label: img, value: img }));
          if (this.templates.length > 0) {
            this.createForm.patchValue({ image: this.templates[0].value });
          }
        }
      }
    });
  }

  /**
   * Toggles the environment creation modal visibility.
   */
  public toggleCreateModal(): void {
    this.showCreateModal = !this.showCreateModal;
    if (!this.showCreateModal) {
      if (this.templates.length > 0) {
        this.createForm.reset({ image: this.templates[0].value });
      } else {
        this.createForm.reset();
      }
    }
  }

  /**
   * Submits the new environment form to the backend.
   */
  public onSubmitCreate(): void {
    if (this.createForm.invalid) return;

    this.isCreating = true;
    this.environmentService.createEnvironment(this.createForm.value as any).subscribe({
      next: () => {
        this.isCreating = false;
        this.toggleCreateModal();
      },
      error: () => {
        this.isCreating = false;
      }
    });
  }

  /**
   * Navigates to the editor for a specific running environment.
   *
   * @param {string} id The environment ID
   */
  public openEditor(id: string): void {
    this.router.navigate(['/editor', id]);
  }

  /**
   * Starts a stopped environment.
   *
   * @param {string} id The environment ID
   */
  public startEnv(id: string): void {
    this.loadingStates[id] = 'starting';
    this.environmentService.startEnvironment(id).subscribe({
      next: () => delete this.loadingStates[id],
      error: () => delete this.loadingStates[id]
    });
  }

  /**
   * Stops a running environment.
   *
   * @param {string} id The environment ID
   */
  public stopEnv(id: string): void {
    this.loadingStates[id] = 'stopping';
    this.environmentService.stopEnvironment(id).subscribe({
      next: () => delete this.loadingStates[id],
      error: () => delete this.loadingStates[id]
    });
  }

  /**
   * Opens the delete environment modal.
   *
   * @param {string} id The environment ID
   */
  public openDeleteEnvModal(id: string): void {
    this.envToDelete = id;
    this.showDeleteEnvModal = true;
  }

  /**
   * Closes the delete environment modal.
   */
  public closeDeleteEnvModal(): void {
    this.showDeleteEnvModal = false;
    this.envToDelete = null;
  }

  /**
   * Confirms and executes environment deletion.
   */
  public confirmDeleteEnv(): void {
    if (this.envToDelete) {
      this.environmentService.deleteEnvironment(this.envToDelete).subscribe({
        next: () => this.closeDeleteEnvModal(),
        error: () => this.closeDeleteEnvModal()
      });
    }
  }

  /**
   * Opens the delete account modal.
   */
  public openDeleteAccountModal(): void {
    this.showDeleteAccountModal = true;
  }

  /**
   * Closes the delete account modal.
   */
  public closeDeleteAccountModal(): void {
    this.showDeleteAccountModal = false;
  }

  /**
   * Confirms and executes account deletion.
   */
  public confirmDeleteAccount(): void {
    this.userService.deleteAccount().subscribe({
      next: () => {
        this.closeDeleteAccountModal();
        this.logout();
      },
      error: (err) => {
        console.error('Failed to delete account:', err);
        alert('Failed to delete account. Please try again.');
        this.closeDeleteAccountModal();
      }
    });
  }

  /**
   * Logs the user out of the application.
   */
  public logout(): void {
    this.authState.logout();
  }
}
