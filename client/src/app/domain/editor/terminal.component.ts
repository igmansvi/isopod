import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebSocketService } from '../../core/services/websocket.service';
import { Subscription } from 'rxjs';

/**
 * Component wrapping xterm.js to provide an interactive terminal interface.
 * Connects directly to the Spring Boot backend via WebSocket.
 */
@Component({
  selector: 'app-terminal',
  standalone: true,
  template: `<div #terminalContainer class="w-full h-full bg-terminal-bg p-2 overflow-hidden"></div>`
})
export class TerminalComponent implements AfterViewInit, OnDestroy {
  @Input() public envId!: string;
  @Output() public commandExecuted = new EventEmitter<void>();
  @ViewChild('terminalContainer') private readonly terminalContainer!: ElementRef<HTMLElement>;

  private terminal?: Terminal;
  private fitAddon?: FitAddon;
  private resizeObserver?: ResizeObserver;
  private messageSub?: Subscription;

  constructor(private readonly wsService: WebSocketService) {}

  /**
   * Initializes xterm.js, connects the WebSocket, and pipes data bidirectionally.
   */
  public ngAfterViewInit(): void {
    if (!this.envId) {
      console.error('Terminal requires an envId');
      return;
    }

    this.terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#0d0d0d',
        foreground: '#d4d4d4',
        cursor: '#4ade80'
      },
      fontFamily: '"Fira Code", "JetBrains Mono", monospace'
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(this.terminalContainer.nativeElement);
    this.fitAddon.fit();

    this.wsService.connect(this.envId);

    this.terminal.onData((data) => {
      this.wsService.sendMessage(data);
      if (data === '\r') {
        setTimeout(() => this.commandExecuted.emit(), 500);
      }
    });

    this.messageSub = this.wsService.getMessages().subscribe({
      next: (msg) => this.terminal?.write(msg)
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.fitAddon?.fit();
    });
    this.resizeObserver.observe(this.terminalContainer.nativeElement);
  }

  /**
   * Cleans up xterm instances and WebSocket connections upon destruction.
   */
  public ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.messageSub?.unsubscribe();
    this.wsService.disconnect();
    this.terminal?.dispose();
  }
}
