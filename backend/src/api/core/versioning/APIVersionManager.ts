import type { RouteHandler } from '@/shared/types/api';
import { Logger } from '@/utils/Logger';

export class APIVersionManager {
  private readonly supportedVersions: readonly string[] = ['v1', 'v2'];
  private readonly routeVersionMappings: Map<string, Map<string, RouteHandler>> = new Map();
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('APIVersionManager');
  }

  public validateVersion(version: string): boolean {
    return this.supportedVersions.includes(version);
  }

  public getVersionFromRequest(request: Request): string {
    // Check header first
    const headerVersion = request.headers.get('X-API-Version');
    if (headerVersion && this.validateVersion(headerVersion)) {
      return headerVersion;
    }

    // Check URL path
    const url = new URL(request.url);
    const pathMatch = RegExp(/^\/api\/(v\d+)\//).exec(url.pathname);
    if (pathMatch && this.validateVersion(pathMatch[1])) {
      return pathMatch[1];
    }

    // Default to v1
    return 'v1';
  }

  public getRouteHandler(route: string, version: string): RouteHandler | undefined {
    const versionMap = this.routeVersionMappings.get(route);
    if (!versionMap) {
      return undefined;
    }

    // Try exact version first
    let handler = versionMap.get(version);
    if (handler) {
      return handler;
    }

    // Fallback to previous versions
    const versionIndex = this.supportedVersions.indexOf(version);
    for (let i = versionIndex - 1; i >= 0; i--) {
      handler = versionMap.get(this.supportedVersions[i]);
      if (handler) {
        this.logger.debug(`Falling back to version ${this.supportedVersions[i]} for route ${route}`);
        return handler;
      }
    }

    return undefined;
  }

  public registerVersionedRoute(route: string, version: string, handler: RouteHandler): void {
    if (!this.validateVersion(version)) {
      throw new Error(`Unsupported API version: ${version}`);
    }

    let versionMap = this.routeVersionMappings.get(route);
    if (!versionMap) {
      versionMap = new Map();
      this.routeVersionMappings.set(route, versionMap);
    }

    versionMap.set(version, handler);
    this.logger.debug(`Registered route ${route} for version ${version}`);
  }

  public getSupportedVersions(): readonly string[] {
    return this.supportedVersions;
  }
}
