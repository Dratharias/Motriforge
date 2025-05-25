import { LogConfiguration } from '@/types/shared/infrastructure/logging';

export interface IEnvironmentConfigFactory {
  createForEnvironment(environment: string): LogConfiguration;
  createDevelopmentConfig(): LogConfiguration;
  createTestingConfig(): LogConfiguration;
  createStagingConfig(): LogConfiguration;
  createProductionConfig(): LogConfiguration;
}

