import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStateService } from '../../domain/auth/auth-state.service';
import { environment } from '../../../environments/environment';

/**
 * HTTP Interceptor that attaches the JWT Bearer token to all outgoing API requests
 * if the user is currently authenticated.
 *
 * @param req The outgoing HTTP request
 * @param next The next interceptor in the chain
 * @returns An observable of the HTTP event stream
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authStateService = inject(AuthStateService);
  const token = authStateService.token();

  if (token && req.url.startsWith(environment.apiUrl)) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest);
  }

  return next(req);
};
