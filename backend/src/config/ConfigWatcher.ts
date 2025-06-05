import { watch, type FSWatcher } from 'fs';
import { Logger } from '@/utils/Logger';

interface WatcherEntry {
  readonly watcher: FSWatcher;
  readonly callbacks: Set<() => void>;
  readonly path: string;
  readonly options: WatchOptions;
}

interface WatchOptions {
  readonly debounceMs?: number;
  readonly persistent?: boolean;
  readonly recursive?: boolean;
  readonly encoding?: BufferEncoding;
}

interface EnvironmentWatchEntry {
  readonly timer: NodeJS.Timeout;
  readonly callbacks: Set<() => void>;
  readonly snapshot: Record<string, string | undefined>;
}

export class ConfigWatcher {
  private readonly logger: Logger;
  private readonly fileWatchers = new Map<string, WatcherEntry>();
  private readonly envWatcher: EnvironmentWatchEntry | null = null;
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>();
  private isDestroyed = false;

  constructor() {
    this.logger = new Logger('ConfigWatcher');
  }

  public watchFile(path: string, callback: () => void, options: WatchOptions = {}): void {
    if (this.isDestroyed) {
      throw new Error('ConfigWatcher has been destroyed');
    }

    try {
      const normalizedPath = this.normalizePath(path);
      const existingWatcher = this.fileWatchers.get(normalizedPath);

      if (existingWatcher) {
        existingWatcher.callbacks.add(callback);
        this.logger.debug(`Added callback to existing watcher for: ${normalizedPath}`);
        return;
      }

      const watchOptions = {
        debounceMs: 500,
        persistent: true,
        recursive: false,
        encoding: 'utf8' as BufferEncoding,
        ...options
      };

      const watcher = watch(normalizedPath, { 
        persistent: watchOptions.persistent,
        recursive: watchOptions.recursive,
        encoding: watchOptions.encoding
      });

      const callbacks = new Set<() => void>([callback]);

      watcher.on('change', (eventType) => {
        this.handleFileChange(normalizedPath, eventType, callbacks, watchOptions.debounceMs);
      });

      watcher.on('error', (error) => {
        this.logger.error(`File watcher error for ${normalizedPath}:`, error);
        this.removeFileWatcher(normalizedPath);
      });

      const watcherEntry: WatcherEntry = {
        watcher,
        callbacks,
        path: normalizedPath,
        options: watchOptions
      };

      this.fileWatchers.set(normalizedPath, watcherEntry);
      this.logger.info(`Started watching file: ${normalizedPath}`);

    } catch (error) {
      this.logger.error(`Failed to watch file ${path}:`, error);
      throw error;
    }
  }

  public watchEnvironment(callback: () => void, intervalMs = 5000): void {
    if (this.isDestroyed) {
      throw new Error('ConfigWatcher has been destroyed');
    }

    if (this.envWatcher) {
      this.envWatcher.callbacks.add(callback);
      this.logger.debug('Added callback to existing environment watcher');
      return;
    }

    try {
      const initialSnapshot = this.createEnvironmentSnapshot();
      const callbacks = new Set<() => void>([callback]);

      const timer = setInterval(() => {
        this.checkEnvironmentChanges(initialSnapshot, callbacks);
      }, intervalMs);

      Object.assign(this, {
        envWatcher: {
          timer,
          callbacks,
          snapshot: initialSnapshot
        }
      });

      this.logger.info(`Started watching environment variables (interval: ${intervalMs}ms)`);

    } catch (error) {
      this.logger.error('Failed to watch environment variables:', error);
      throw error;
    }
  }

  public stopWatching(path: string): void {
    const normalizedPath = this.normalizePath(path);
    this.removeFileWatcher(normalizedPath);
  }

  public stopWatchingEnvironment(): void {
    if (this.envWatcher) {
      clearInterval(this.envWatcher.timer);
      Object.assign(this, { envWatcher: null });
      this.logger.info('Stopped watching environment variables');
    }
  }

  public stopAll(): void {
    try {
      this.logger.info('Stopping all watchers...');

      // Stop file watchers
      for (const [path, entry] of this.fileWatchers.entries()) {
        try {
          entry.watcher.close();
          this.logger.debug(`Closed file watcher for: ${path}`);
        } catch (error) {
          this.logger.warn(`Failed to close file watcher for ${path}:`, error);
        }
      }
      this.fileWatchers.clear();

      // Stop environment watcher
      this.stopWatchingEnvironment();

      // Clear debounce timers
      for (const timer of this.debounceTimers.values()) {
        clearTimeout(timer);
      }
      this.debounceTimers.clear();

      this.isDestroyed = true;
      this.logger.info('All watchers stopped');

    } catch (error) {
      this.logger.error('Error stopping watchers:', error);
    }
  }

  public getWatchedFiles(): readonly string[] {
    return Array.from(this.fileWatchers.keys());
  }

  public isWatching(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    return this.fileWatchers.has(normalizedPath);
  }

  public isWatchingEnvironment(): boolean {
    return this.envWatcher !== null;
  }

  public getWatcherStats(): {
    readonly fileWatchersCount: number;
    readonly environmentWatcherActive: boolean;
    readonly totalCallbacks: number;
    readonly watchedPaths: readonly string[];
  } {
    const totalCallbacks = Array.from(this.fileWatchers.values())
      .reduce((sum, entry) => sum + entry.callbacks.size, 0) +
      (this.envWatcher?.callbacks.size ?? 0);

    return {
      fileWatchersCount: this.fileWatchers.size,
      environmentWatcherActive: this.envWatcher !== null,
      totalCallbacks,
      watchedPaths: this.getWatchedFiles()
    };
  }

  private handleFileChange(
    path: string, 
    eventType: string, 
    callbacks: Set<() => void>, 
    debounceMs?: number
  ): void {
    this.logger.debug(`File change detected: ${path} (${eventType})`);

    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    if (debounceMs && debounceMs > 0) {
      const timer = setTimeout(() => {
        this.executeCallbacks(callbacks, path);
        this.debounceTimers.delete(path);
      }, debounceMs);

      this.debounceTimers.set(path, timer);
    } else {
      this.executeCallbacks(callbacks, path);
    }
  }

  private checkEnvironmentChanges(
    snapshot: Record<string, string | undefined>, 
    callbacks: Set<() => void>
  ): void {
    try {
      const currentEnv = this.createEnvironmentSnapshot();
      const changes = this.detectEnvironmentChanges(snapshot, currentEnv);

      if (changes.length > 0) {
        this.logger.info(`Environment changes detected: ${changes.join(', ')}`);
        
        // Update snapshot
        Object.assign(snapshot, currentEnv);
        
        // Execute callbacks
        this.executeCallbacks(callbacks, 'environment');
      }

    } catch (error) {
      this.logger.error('Error checking environment changes:', error);
    }
  }

  private createEnvironmentSnapshot(): Record<string, string | undefined> {
    // Capture relevant environment variables
    const relevantKeys = [
      'NODE_ENV',
      'PORT',
      'HOST',
      'LOG_LEVEL',
      'DB_HOST',
      'DB_PORT',
      'DB_NAME',
      'CORS_ORIGINS',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET'
    ];

    const snapshot: Record<string, string | undefined> = {};
    
    for (const key of relevantKeys) {
      snapshot[key] = process.env[key];
    }

    return snapshot;
  }

  private detectEnvironmentChanges(
    oldSnapshot: Record<string, string | undefined>,
    newSnapshot: Record<string, string | undefined>
  ): string[] {
    const changes: string[] = [];

    // Check for modified or removed variables
    for (const [key, oldValue] of Object.entries(oldSnapshot)) {
      const newValue = newSnapshot[key];
      if (oldValue !== newValue) {
        changes.push(key);
      }
    }

    // Check for new variables
    for (const [key, newValue] of Object.entries(newSnapshot)) {
      if (!(key in oldSnapshot) && newValue !== undefined) {
        changes.push(key);
      }
    }

    return changes;
  }

  private executeCallbacks(callbacks: Set<() => void>, source: string): void {
    const callbackCount = callbacks.size;
    let successCount = 0;
    let errorCount = 0;

    for (const callback of callbacks) {
      try {
        callback();
        successCount++;
      } catch (error) {
        errorCount++;
        this.logger.error(`Callback error for ${source}:`, error);
      }
    }

    this.logger.debug(`Executed ${callbackCount} callbacks for ${source}`, {
      successful: successCount,
      failed: errorCount
    });
  }

  private removeFileWatcher(path: string): void {
    const entry = this.fileWatchers.get(path);
    if (entry) {
      try {
        entry.watcher.close();
        this.fileWatchers.delete(path);
        
        // Clear any pending debounce timer
        const timer = this.debounceTimers.get(path);
        if (timer) {
          clearTimeout(timer);
          this.debounceTimers.delete(path);
        }
        
        this.logger.info(`Stopped watching file: ${path}`);
      } catch (error) {
        this.logger.error(`Failed to stop watching file ${path}:`, error);
      }
    }
  }

  private normalizePath(path: string): string {
    // Simple path normalization (could be enhanced with path.resolve)
    return path.replace(/\\/g, '/').replace(/\/+/g, '/');
  }
}