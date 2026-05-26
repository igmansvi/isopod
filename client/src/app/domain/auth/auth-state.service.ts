import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Service managing the global authentication state using Angular Signals.
 * Replaces the previous Zustand session store.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private readonly TOKEN_KEY = 'isopod_auth_token';
  
  public readonly token = signal<string | null>(this.getStoredToken());
  public readonly isAuthenticated = computed(() => this.token() !== null);

  constructor(private readonly router: Router) {}

  /**
   * Logs the user in by saving the token in state and local storage.
   *
   * @param {string} jwtToken The JWT token received from the backend
   */
  public login(jwtToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, jwtToken);
    this.token.set(jwtToken);
    this.router.navigate(['/dashboard']);
  }

  /**
   * Logs the user out by clearing the token and redirecting to login.
   */
  public logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.token.set(null);
    this.router.navigate(['/auth/login']);
  }

  /**
   * Retrieves the token from local storage on initialization.
   *
   * @returns {string | null} The stored token or null
   */
  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
}
