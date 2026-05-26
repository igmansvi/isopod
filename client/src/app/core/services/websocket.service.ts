import { Injectable, OnDestroy } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, Subject, Subscription } from 'rxjs';

/**
 * Service handling the WebSocket connection to the Spring Boot backend
 * for the interactive terminal (xterm.js) sessions.
 */
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket$?: WebSocketSubject<string>;
  private readonly messagesSubject$ = new Subject<string>();
  private readonly baseUrl = environment.wsUrl;
  private subscription?: Subscription;

  /**
   * Connects to the terminal WebSocket stream for a specific environment.
   *
   * @param {string} envId The environment ID to connect to
   */
  public connect(envId: string): void {
    if (this.socket$ && !this.socket$.closed) {
      this.disconnect();
    }

    this.socket$ = webSocket({
      url: `${this.baseUrl}?envId=${envId}`,
      deserializer: msg => msg.data, // Expect raw text from backend, not JSON
      serializer: msg => msg       // Send raw text to backend
    });

    this.subscription = this.socket$.subscribe({
      next: (message: string) => this.messagesSubject$.next(message),
      error: (err: unknown) => console.error('[WebSocket] Error:', err),
      complete: () => console.log('[WebSocket] Connection closed')
    });
  }

  /**
   * Sends a raw string message (e.g., keystrokes) to the active Docker exec session.
   *
   * @param {string} message The terminal input string
   */
  public sendMessage(message: string): void {
    if (this.socket$ && !this.socket$.closed) {
      this.socket$.next(message);
    }
  }

  /**
   * Returns an observable stream of terminal output from the Docker container.
   *
   * @returns {Observable<string>} The output stream
   */
  public getMessages(): Observable<string> {
    return this.messagesSubject$.asObservable();
  }

  /**
   * Gracefully disconnects the WebSocket.
   */
  public disconnect(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = undefined;
    }
  }

  /**
   * Lifecycle hook to ensure sockets are cleaned up when the service is destroyed.
   */
  public ngOnDestroy(): void {
    this.disconnect();
  }
}
