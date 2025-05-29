import { IAMFactory, IAMSystem } from './IAMFactory';
import { PermissionSetup } from './setup/PermissionSetup';
import { MongoPermissionRepository } from './repositories/MongoPermissionRepository';
import { IAuthenticationService } from './middleware/AuthenticationMiddleware';

export class IAMSystemBuilder {
  private permissionRepository?: MongoPermissionRepository;
  private authenticationService?: IAuthenticationService;
  private shouldSetupPermissions = true;

  withPermissionRepository(repository: MongoPermissionRepository): this {
    this.permissionRepository = repository;
    return this;
  }

  withAuthenticationService(service: IAuthenticationService): this {
    this.authenticationService = service;
    return this;
  }

  skipPermissionSetup(): this {
    this.shouldSetupPermissions = false;
    return this;
  }

  async build(): Promise<IAMSystem> {
    this.permissionRepository ??= new MongoPermissionRepository();

    // Setup default permissions if needed
    if (this.shouldSetupPermissions) {
      const setup = new PermissionSetup(this.permissionRepository);
      await setup.setupDefaultPermissions();
      await setup.validatePermissions();
    }

    // Create and return IAM system (authService is optional)
    return IAMFactory.createSystem(this.permissionRepository, this.authenticationService);
  }

  static create(): IAMSystemBuilder {
    return new IAMSystemBuilder();
  }
}