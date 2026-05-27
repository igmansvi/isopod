import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, AfterViewInit } from '@angular/core';
import loader from '@monaco-editor/loader';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

/**
 * Standalone component safely wrapping the Monaco Editor.
 * Includes native Ctrl+S binding for saving.
 */
@Component({
  selector: 'app-code-editor',
  standalone: true,
  template: `<div #editorContainer class="w-full h-full bg-editor-bg"></div>`
})
export class CodeEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() public content = '';
  @Input() public language = 'javascript';
  @Output() public contentChanged = new EventEmitter<string>();
  @Output() public saveRequested = new EventEmitter<string>();

  @ViewChild('editorContainer') private readonly editorContainer!: ElementRef<HTMLElement>;

  private editorInstance: any;
  private isInitializing = false;
  
  private readonly afkSaveSubject = new Subject<string>();
  private afkSubscription?: Subscription;

  constructor() {
    this.afkSubscription = this.afkSaveSubject.pipe(
      debounceTime(2000)
    ).subscribe(content => {
      this.saveRequested.emit(content);
    });
  }

  /**
   * Initializes the Monaco Editor via the official AMD loader.
   */
  public ngAfterViewInit(): void {
    this.isInitializing = true;
    loader.init().then((monaco) => {
      this.editorInstance = monaco.editor.create(this.editorContainer.nativeElement, {
        value: this.content,
        language: this.language,
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: '"Fira Code", "JetBrains Mono", monospace'
      });

      this.isInitializing = false;

      this.editorInstance.onDidChangeModelContent(() => {
        const val = this.editorInstance.getValue();
        this.contentChanged.emit(val);
        this.afkSaveSubject.next(val);
      });

      this.editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        this.saveRequested.emit(this.editorInstance.getValue());
      });
    });
  }

  /**
   * Updates the editor value if the input content changes externally.
   *
   * @param {SimpleChanges} changes Angular lifecycle changes
   */
  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['content'] && !changes['content'].firstChange) {
      if (this.editorInstance && this.editorInstance.getValue() !== this.content) {
        this.editorInstance.setValue(this.content);
      }
    }
    
    if (changes['language'] && this.editorInstance) {
    }
  }

  /**
   * Disposes the editor memory on component destruction.
   */
  public ngOnDestroy(): void {
    if (this.editorInstance) {
      this.editorInstance.dispose();
    }
    if (this.afkSubscription) {
      this.afkSubscription.unsubscribe();
    }
  }
}
