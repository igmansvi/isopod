import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Core service for handling HTTP requests to the backend API.
 * Provides standardized error handling for all domain services.
 */
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Performs a GET request.
   *
   * @template T The expected response type
   * @param {string} endpoint The API endpoint (e.g., '/environments')
   * @returns {Observable<T>} An observable of the response body
   */
  public get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`);
  }

  /**
   * Performs a POST request.
   *
   * @template T The expected response type
   * @param {string} endpoint The API endpoint
   * @param {unknown} body The request payload
   * @returns {Observable<T>} An observable of the response body
   */
  public post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body);
  }

  /**
   * Performs a DELETE request.
   *
   * @template T The expected response type
   * @param {string} endpoint The API endpoint
   * @returns {Observable<T>} An observable of the response body
   */
  public delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`);
  }
}
