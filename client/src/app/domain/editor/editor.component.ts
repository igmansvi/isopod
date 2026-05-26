import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TerminalComponent } from './terminal.component';
import { FileTreeComponent } from './file-tree.component';
import { CodeEditorComponent } from './code-editor.component';
import { EnvironmentService } from '../environment/environment.service';
import { Environment } from '../environment/environment.model';
import { ApiService } from '../../core/services/api.service';

/**
 * Main layout component for the active workspace editor.
 * Houses the terminal, file tree, and Monaco code editor.
 */
@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, TerminalComponent, FileTreeComponent, CodeEditorComponent, RouterLink],
  templateUrl: './editor.component.html'
})
export class EditorComponent implements OnInit {
  
  public envId: string | null = null;
  public environment: Environment | null = null;

  public readonly selectedFile = signal<string | null>(null);
  public readonly fileContent = signal<string>('');
  public readonly isSaving = signal<boolean>(false);
  public readonly hasUnsavedChanges = signal<boolean>(false);
  public readonly saveSuccess = signal<boolean>(false);

  private readonly route = inject(ActivatedRoute);
  private readonly environmentService = inject(EnvironmentService);
  private readonly apiService = inject(ApiService);

  /**
   * Lifecycle hook to extract route parameters and load environment metadata.
   */
  public ngOnInit(): void {
    this.envId = this.route.snapshot.paramMap.get('id');
    
    if (this.envId) {
      this.environment = this.environmentService.environments().find(e => e.id === this.envId) || null;
    }
  }

  /**
   * Fetches the content of the selected file from the backend.
   *
   * @param {string} filePath The path to the file
   */
  public onFileSelected(filePath: string): void {
    if (!this.envId) return;

    this.selectedFile.set(filePath);
    this.fileContent.set('Loading...');
    this.hasUnsavedChanges.set(false);
    this.saveSuccess.set(false);

    // Assuming the path returned by tree doesn't have a leading slash but the API needs it,
    // or just pass it directly if the backend handles it.
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;

    this.apiService.get<any>(`/files?envId=${this.envId}&path=${cleanPath}&action=read`).subscribe({
      next: (res) => {
        this.fileContent.set(res.content || '');
      },
      error: (err) => {
        console.error('Failed to read file:', err);
        this.fileContent.set('// Error reading file');
      }
    });
  }

  /**
   * Closes the file in the editor if it was deleted.
   *
   * @param {string} filePath The path to the deleted file
   */
  public onFileDeleted(filePath: string): void {
    if (this.selectedFile() === filePath || this.selectedFile() === `/${filePath}`) {
      this.selectedFile.set(null);
      this.fileContent.set('');
      this.hasUnsavedChanges.set(false);
    }
  }

  /**
   * Tracks when the user types in the editor to mark as unsaved.
   *
   * @param {string} newContent The updated content from Monaco
   */
  public onContentChanged(newContent: string): void {
    if (this.fileContent() !== newContent) {
      this.hasUnsavedChanges.set(true);
      this.saveSuccess.set(false);
    }
  }

  /**
   * Saves the current editor content to the backend.
   *
   * @param {string} content The final content to save
   */
  public onSaveRequested(content: string): void {
    const currentFile = this.selectedFile();
    if (!this.envId || !currentFile) return;

    this.isSaving.set(true);
    this.saveSuccess.set(false);

    const cleanPath = currentFile.startsWith('/') ? currentFile : `/${currentFile}`;

    this.apiService.post<any>('/files', {
      envId: this.envId,
      path: cleanPath,
      content: content
    }).subscribe({
      next: () => {
        this.fileContent.set(content); // Sync up the baseline
        this.isSaving.set(false);
        this.hasUnsavedChanges.set(false);
        this.saveSuccess.set(true);
        
        // Hide the "Saved" badge after 2 seconds
        setTimeout(() => this.saveSuccess.set(false), 2000);
      },
      error: (err) => {
        console.error('Failed to save file:', err);
        this.isSaving.set(false);
      }
    });
  }
}
