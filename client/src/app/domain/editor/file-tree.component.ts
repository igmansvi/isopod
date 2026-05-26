import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnDestroy,
  Output,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-file-tree',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="h-full bg-neutral-900/50 border-r border-neutral-800 flex flex-col w-64 shrink-0 relative"
    >
      <div
        class="px-4 py-3 border-b border-neutral-800/50 flex justify-between items-center sticky top-0 bg-neutral-900/80 backdrop-blur-sm z-10"
      >
        <h2 class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Explorer</h2>
        <div class="flex items-center space-x-2">
          <!-- New File -->
          <button
            (click)="openCreateModal('file')"
            class="text-neutral-500 hover:text-white transition-colors"
            title="New File"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>
          <!-- New Folder -->
          <button
            (click)="openCreateModal('folder')"
            class="text-neutral-500 hover:text-white transition-colors"
            title="New Folder"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
          </button>
          <!-- Refresh -->
          <button
            (click)="loadFiles()"
            class="text-neutral-500 hover:text-white transition-colors"
            title="Refresh"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="flex-1 p-2 overflow-y-auto">
        @if (isLoading()) {
          <div class="flex justify-center py-4">
            <div
              class="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"
            ></div>
          </div>
        }

        @if (!isLoading()) {
          <ul class="space-y-0.5">
            @for (file of files(); track file) {
              <li class="group relative">
                <button
                  (click)="onSelect(file)"
                  class="w-full flex items-center py-1.5 pr-2 text-sm rounded-md transition-colors text-left"
                  [style.padding-left.rem]="
                    (file.split('/').length - (file.endsWith('/') ? 2 : 1)) * 0.75 + 0.5
                  "
                  [ngClass]="
                    activeFile() === file
                      ? 'bg-blue-600/10 text-blue-400'
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  "
                >
                  @if (file.endsWith('/')) {
                    <svg
                      class="w-4 h-4 mr-2 text-amber-400 shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                      />
                    </svg>
                  }
                  @if (!file.endsWith('/')) {
                    <svg
                      class="w-4 h-4 mr-2 text-neutral-400 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  }
                  <span class="truncate pr-6">{{
                    file.endsWith('/') ? file.slice(0, -1).split('/').pop() : file.split('/').pop()
                  }}</span>
                </button>
                <!-- Hover Actions -->
                <div
                  class="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center"
                >
                  <button
                    (click)="openDeleteModal(file); $event.stopPropagation()"
                    class="p-1 text-neutral-500 hover:text-red-400 bg-neutral-800 rounded transition-colors"
                    title="Delete"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </li>
            }
          </ul>
        }

        @if (!isLoading() && files().length === 0) {
          <div class="text-center py-4 text-xs text-neutral-500">Workspace is empty</div>
        }
      </div>

      <!-- Create Modal -->
      @if (showCreateModal) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div class="border border-white p-6 w-125 bg-black">
            <div class="flex justify-between items-start mb-2">
              <h3 class="text-sm font-bold">New {{ createType === 'file' ? 'File' : 'Folder' }}</h3>
              <button
                type="button"
                (click)="closeCreateModal()"
                class="text-white hover:text-neutral-400"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div class="flex items-center gap-4 mt-6">
              <label class="text-xs font-bold w-12">Name</label>
              <input
                #nameInput
                type="text"
                [value]="newEntryName()"
                (input)="newEntryName.set(nameInput.value)"
                (keyup.enter)="submitCreate()"
                class="flex-1 bg-black border border-white text-white p-2 text-xs focus:outline-none"
                autofocus
              />
            </div>
            <div class="flex justify-end gap-6 mt-4 border-t border-white pt-6">
              <button (click)="closeCreateModal()" class="text-xs font-bold hover:underline">
                Cancel
              </button>
              <button
                (click)="submitCreate()"
                class="text-xs font-bold hover:underline disabled:opacity-50"
                [disabled]="!newEntryName()"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Modal -->
      @if (showDeleteModal) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div class="border border-white p-6 w-125 bg-black">
            <div class="flex justify-between items-start mb-2">
              <h3 class="text-sm font-bold text-red-500">Delete File</h3>
              <button
                type="button"
                (click)="closeDeleteModal()"
                class="text-white hover:text-neutral-400"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <p class="text-xs text-white mb-6">
              Are you sure you want to delete
              <span class="font-bold">{{ deletePath()?.replace('/', '') }}</span
              >? This action cannot be undone.
            </p>
            <div class="flex justify-end gap-6 mt-4 border-t border-white pt-6">
              <button (click)="closeDeleteModal()" class="text-xs font-bold hover:underline">
                Cancel
              </button>
              <button
                (click)="submitDelete()"
                class="text-xs font-bold text-red-500 hover:underline"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class FileTreeComponent implements OnInit {
  @Input() public envId!: string;
  @Output() public fileSelected = new EventEmitter<string>();
  @Output() public fileDeleted = new EventEmitter<string>();

  public readonly files = signal<string[]>([]);
  public readonly isLoading = signal(false);
  public readonly activeFile = signal<string | null>(null);

  public showCreateModal = false;
  public createType: 'file' | 'folder' = 'file';
  public readonly newEntryName = signal('');

  public showDeleteModal = false;
  public readonly deletePath = signal<string | null>(null);

  private readonly apiService = inject(ApiService);

  private syncInterval: any;

  public ngOnInit(): void {
    if (this.envId) {
      this.loadFiles();
    }
  }

  public ngOnDestroy(): void {
  }

  public loadFiles(isSilent = false): void {
    if (!isSilent) this.isLoading.set(true);
    this.apiService.get<string[]>(`/files?envId=${this.envId}&action=list`).subscribe({
      next: (data) => {
        const sorted = data.sort((a, b) => {
          const aIsDir = a.endsWith('/');
          const bIsDir = b.endsWith('/');
          if (aIsDir && !bIsDir) return -1;
          if (!aIsDir && bIsDir) return 1;
          return a.localeCompare(b);
        });

        if (JSON.stringify(this.files()) !== JSON.stringify(sorted)) {
          this.files.set(sorted);

          if (this.activeFile() && !sorted.includes(this.activeFile()!)) {
            const deleted = this.activeFile()!;
            this.activeFile.set(null);
            this.fileDeleted.emit(deleted);
          }
        }

        if (!isSilent) this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load files:', err);
        if (!isSilent) this.isLoading.set(false);
      },
    });
  }

  public onSelect(file: string): void {
    if (file.endsWith('/')) return;
    this.activeFile.set(file);
    this.fileSelected.emit(file);
  }

  public openCreateModal(type: 'file' | 'folder'): void {
    this.createType = type;
    this.newEntryName.set('');
    this.showCreateModal = true;
  }

  public closeCreateModal(): void {
    this.showCreateModal = false;
    this.newEntryName.set('');
  }

  public submitCreate(): void {
    const name = this.newEntryName().trim();
    if (!name) return;

    if (this.createType === 'folder') {
      this.apiService.post<void>('/files/dir', { envId: this.envId, path: name }).subscribe({
        next: () => {
          this.closeCreateModal();
          this.loadFiles();
        },
      });
    } else {
      this.apiService
        .post<void>('/files', { envId: this.envId, path: name, content: '' })
        .subscribe({
          next: () => {
            this.closeCreateModal();
            this.loadFiles();
            this.onSelect(name);
          },
        });
    }
  }

  public openDeleteModal(path: string): void {
    this.deletePath.set(path);
    this.showDeleteModal = true;
  }

  public closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deletePath.set(null);
  }

  public submitDelete(): void {
    const path = this.deletePath();
    if (!path) return;

    this.apiService
      .delete<void>(`/files?envId=${this.envId}&path=${encodeURIComponent(path)}`)
      .subscribe({
        next: () => {
          this.closeDeleteModal();
          if (this.activeFile() === path) {
            this.activeFile.set(null);
          }
          this.fileDeleted.emit(path);
          this.loadFiles(true);
        },
      });
  }
}
