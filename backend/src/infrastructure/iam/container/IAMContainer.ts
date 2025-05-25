

// Repositories
import { MongoIdentityRepository } from '../repositories/MongoIdentityRepository';
import { MongoSessionRepository } from '../repositories/MongoSessionRepository';
import { MongoAccessControlRepository } from '../repositories/MongoAccessControlRepository';

// Adapters
import { JWTTokenAdapter } from '../adapters/JWTTokenAdapter';
import { BcryptPasswordAdapter } from '../adapters/BcryptPasswordAdapter';
import { SecurityAuditAdapter } from '../adapters/SecurityAuditAdapter';
import { RiskAssessmentAdapter } from '../adapters/RiskAssessmentAdapter';

// Domain Services
import { IdentityManagementService } from '@/domain/iam/services/IdentityManagementService';
import { AccessControlService } from '@/domain/iam/services/AccessControlService';
import { SessionManagementService } from '@/domain/iam/services/SessionManagementService';

// Application Services
import { IdentityApplicationService } from '@/application/iam/IdentityApplicationService';
import { AccessApplicationService } from '@/application/iam/AccessApplicationService';
import { SessionApplicationService } from '@/application/iam/SessionApplicationService';

// Policy Engine
import { PolicyDecisionPoint } from '../policy/PolicyDecisionPoint';
import { PolicyInformationPoint } from '../policy/PolicyInformationPoint';
import { PolicyAdministrationPoint } from '../policy/PolicyAdministrationPoint';
import { RuleEngine } from '../policy/RuleEngine';
import { PolicyEngineService } from '../policy/PolicyEngineService';

// CQRS
import { IAMCommandBus } from '../bus/IAMCommandBus';
import { IAMQueryBus } from '../bus/IAMQueryBus';
import { IAMEventBus } from '../bus/IAMEventBus';

// Command Handlers
import { CreateIdentityCommandHandler } from '@/application/iam/handlers/commands/CreateIdentityCommandHandler';
import { AssignRoleCommandHandler } from '@/application/iam/handlers/commands/AssignRoleCommandHandler';
import { CreateSessionCommandHandler } from '@/application/iam/handlers/commands/CreateSessionCommandHandler';

// Query Handlers
import { GetIdentityQueryHandler } from '@/application/iam/handlers/queries/GetIdentityQueryHandler';
import { CheckAccessQueryHandler } from '@/application/iam/handlers/queries/CheckAccessQueryHandler';

// Event Handlers
import { IdentityCreatedEventHandler } from '../eventHandlers/IdentityCreatedEventHandler';
import { SessionCreatedEventHandler } from '../eventHandlers/SessionCreatedEventHandler';
import { AccessDeniedEventHandler } from '../eventHandlers/AccessDeniedEventHandler';

// Controllers
import { IdentityController } from '@/presentation/iam/controllers/IdentityController';
import { SessionController } from '@/presentation/iam/controllers/SessionController';
import { AccessController } from '@/presentation/iam/controllers/AccessController';
import { AuthenticationMiddleware } from '@/presentation/iam/middleware/AuthenticationMiddleware';
import { AccessControlModel } from '../schemas/AccessControlSchema';
import { AuditLogModel } from '../schemas/AuditLogSchema';
import { DeviceModel } from '../schemas/DeviceSchema';
import { IdentityModel } from '../schemas/IdentitySchema';
import { PermissionModel } from '../schemas/PermissionSchema';
import { PolicyModel } from '../schemas/PolicySchema';
import { RoleModel } from '../schemas/RoleSchema';
import { SessionModel } from '../schemas/SessionSchema';

export interface IAMContainerConfig {
  jwtAccessTokenSecret: string;
  jwtRefreshTokenSecret: string;
  jwtIssuer: string;
  bcryptSaltRounds: number;
}

export class IAMContainer {
  // Repositories
  private readonly identityRepository: MongoIdentityRepository;
  private readonly sessionRepository: MongoSessionRepository;
  private readonly accessControlRepository: MongoAccessControlRepository;

  // Adapters
  private readonly tokenAdapter: JWTTokenAdapter;
  private readonly passwordHasher: BcryptPasswordAdapter;
  private readonly auditLogger: SecurityAuditAdapter;
  private readonly riskAssessmentService: RiskAssessmentAdapter;

  // Domain Services
  private readonly identityManagementService: IdentityManagementService;
  private readonly accessControlService: AccessControlService;
  private readonly sessionManagementService: SessionManagementService;

  // Application Services
  private readonly identityApplicationService: IdentityApplicationService;
  private readonly accessApplicationService: AccessApplicationService;
  private readonly sessionApplicationService: SessionApplicationService;

  // Policy Engine
  private readonly policyInformationPoint: PolicyInformationPoint;
  private readonly ruleEngine: RuleEngine;
  private readonly policyDecisionPoint: PolicyDecisionPoint;
  private readonly policyAdministrationPoint: PolicyAdministrationPoint;
  private readonly policyEngineService: PolicyEngineService;

  // CQRS
  private readonly commandBus: IAMCommandBus;
  private readonly queryBus: IAMQueryBus;
  private readonly eventBus: IAMEventBus;

  // Controllers
  private readonly identityController: IdentityController;
  private readonly sessionController: SessionController;
  private readonly accessController: AccessController;
  private readonly authenticationMiddleware: AuthenticationMiddleware;

  constructor(config: IAMContainerConfig) {
    // Initialize Repositories
    this.identityRepository = new MongoIdentityRepository(IdentityModel);
    this.sessionRepository = new MongoSessionRepository(SessionModel);
    this.accessControlRepository = new MongoAccessControlRepository(AccessControlModel);

    // Initialize Adapters
    this.tokenAdapter = new JWTTokenAdapter(
      config.jwtAccessTokenSecret,
      config.jwtRefreshTokenSecret,
      config.jwtIssuer
    );
    this.passwordHasher = new BcryptPasswordAdapter(config.bcryptSaltRounds);
    this.auditLogger = new SecurityAuditAdapter(AuditLogModel);
    this.riskAssessmentService = new RiskAssessmentAdapter();

    // Initialize Domain Services
    this.identityManagementService = new IdentityManagementService(
      this.identityRepository,
      this.passwordHasher,
      this.auditLogger
    );

    this.accessControlService = new AccessControlService(
      this.accessControlRepository,
      new (class {
        constructor(private model: any) {}
        async findById(id: any) { 
          const doc = await this.model.findById(id);
          return doc ? { id: doc._id, name: { value: doc.name.value }, ...doc.toObject() } : null;
        }
        async findByIds(ids: any[]) {
          const docs = await this.model.find({ _id: { $in: ids } });
          return docs.map(doc => ({ id: doc._id, name: { value: doc.name.value }, ...doc.toObject() }));
        }
      })(RoleModel),
      new (class {
        constructor(private model: any) {}
        async findById(id: any) {
          const doc = await this.model.findById(id);
          return doc ? { id: doc._id, name: { value: doc.name.value }, ...doc.toObject() } : null;
        }
        async findByIds(ids: any[]) {
          const docs = await this.model.find({ _id: { $in: ids } });
          return docs.map(doc => ({ id: doc._id, name: { value: doc.name.value }, ...doc.toObject() }));
        }
      })(PermissionModel),
      this.auditLogger
    );

    this.sessionManagementService = new SessionManagementService(
      this.sessionRepository,
      new (class {
        constructor(private model: any) {}
        async findByFingerprint(fingerprint: string) {
          const doc = await this.model.findOne({ 'fingerprint.value': fingerprint });
          return doc ? { id: doc._id, fingerprint: { value: doc.fingerprint.value, components: doc.fingerprint.components }, ...doc.toObject() } : null;
        }
        async save(device: any) {
          await this.model.findByIdAndUpdate(device.id, device, { upsert: true });
        }
      })(DeviceModel),
      this.riskAssessmentService,
      this.auditLogger
    );

    // Initialize Policy Engine
    this.policyInformationPoint = new PolicyInformationPoint(PolicyModel);
    this.ruleEngine = new RuleEngine(this.policyInformationPoint);
    this.policyDecisionPoint = new PolicyDecisionPoint(
      this.policyInformationPoint,
      this.ruleEngine
    );
    this.policyAdministrationPoint = new PolicyAdministrationPoint(PolicyModel);
    this.policyEngineService = new PolicyEngineService(this.policyDecisionPoint);

    // Initialize Application Services
    this.identityApplicationService = new IdentityApplicationService(
      this.identityRepository,
      this.passwordHasher,
      this.identityManagementService,
      this.auditLogger
    );

    this.accessApplicationService = new AccessApplicationService(
      this.accessControlRepository,
      new (class {
        constructor(private model: any) {}
        async findById(id: any) { 
          const doc = await this.model.findById(id);
          return doc ? { id: doc._id, name: { value: doc.name.value }, ...doc.toObject() } : null;
        }
        async findByIds(ids: any[]) {
          const docs = await this.model.find({ _id: { $in: ids } });
          return docs.map(doc => ({ id: doc._id, name: { value: doc.name.value }, ...doc.toObject() }));
        }
      })(RoleModel),
      new (class {
        constructor(private model: any) {}
        async findById(id: any) {
          const doc = await this.model.findById(id);
          return doc ? { id: doc._id, name: { value: doc.name.value }, ...doc.toObject() } : null;
        }
        async findByIds(ids: any[]) {
          const docs = await this.model.find({ _id: { $in: ids } });
          return docs.map(doc => ({ id: doc._id, name: { value: doc.name.value }, ...doc.toObject() }));
        }
      })(PermissionModel),
      this.accessControlService,
      this.auditLogger
    );

    this.sessionApplicationService = new SessionApplicationService(
      this.sessionRepository,
      this.tokenAdapter,
      this.tokenAdapter,
      this.sessionManagementService,
      this.auditLogger
    );

    // Initialize CQRS
    this.commandBus = new IAMCommandBus();
    this.queryBus = new IAMQueryBus();
    this.eventBus = new IAMEventBus();

    this.setupCQRSHandlers();

    // Initialize Controllers
    this.identityController = new IdentityController(
      this.identityApplicationService,
      this.commandBus,
      this.queryBus
    );

    this.sessionController = new SessionController(
      this.sessionApplicationService,
      this.commandBus,
      this.queryBus
    );

    this.accessController = new AccessController(
      this.accessApplicationService,
      this.commandBus,
      this.queryBus
    );

    this.authenticationMiddleware = new AuthenticationMiddleware(
      this.tokenAdapter,
      this.sessionApplicationService
    );
  }

  private setupCQRSHandlers(): void {
    // Register Command Handlers
    this.commandBus.registerHandler(
      'CreateIdentityCommand',
      new CreateIdentityCommandHandler(this.identityApplicationService)
    );

    this.commandBus.registerHandler(
      'AssignRoleCommand',
      new AssignRoleCommandHandler(this.accessApplicationService)
    );

    this.commandBus.registerHandler(
      'CreateSessionCommand',
      new CreateSessionCommandHandler(this.sessionApplicationService)
    );

    // Register Query Handlers
    this.queryBus.registerHandler(
      'GetIdentityQuery',
      new GetIdentityQueryHandler(this.identityApplicationService)
    );

    this.queryBus.registerHandler(
      'CheckAccessQuery',
      new CheckAccessQueryHandler(this.accessApplicationService)
    );

    // Register Event Handlers
    this.eventBus.registerHandler(
      import('@/types/iam/enums').then(m => m.EventType.IDENTITY_CREATED),
      new IdentityCreatedEventHandler()
    );

    this.eventBus.registerHandler(
      import('@/types/iam/enums').then(m => m.EventType.SESSION_CREATED),
      new SessionCreatedEventHandler()
    );

    this.eventBus.registerHandler(
      import('@/types/iam/enums').then(m => m.EventType.ACCESS_DENIED),
      new AccessDeniedEventHandler()
    );
  }

  // Getter methods for accessing components
  getIdentityController(): IdentityController {
    return this.identityController;
  }

  getSessionController(): SessionController {
    return this.sessionController;
  }

  getAccessController(): AccessController {
    return this.accessController;
  }

  getAuthenticationMiddleware(): AuthenticationMiddleware {
    return this.authenticationMiddleware;
  }

  getPolicyEngineService(): PolicyEngineService {
    return this.policyEngineService;
  }

  getEventBus(): IAMEventBus {
    return this.eventBus;
  }

  getCommandBus(): IAMCommandBus {
    return this.commandBus;
  }

  getQueryBus(): IAMQueryBus {
    return this.queryBus;
  }
}

