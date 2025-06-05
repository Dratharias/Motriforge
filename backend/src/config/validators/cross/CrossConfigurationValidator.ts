import { ConfigCollection } from "@/config/ConfigManager";
import { CrossValidationContext, mergeValidationResults } from "@/config/ConfigValidator";
import { ValidationResult } from "@/config/environment.config";
import { DevelopmentCrossValidator } from "./DevelopmentCrossValidator";
import { GeneralCrossValidator } from "./GeneralCrossValidator";
import { TestingCrossValidator } from "./TestingCrossValidator";
import { ProductionCrossValidator } from "./ProductionCrossValidator";

export class CrossConfigurationValidator {
  private readonly productionValidator = new ProductionCrossValidator();
  private readonly developmentValidator = new DevelopmentCrossValidator();
  private readonly testingValidator = new TestingCrossValidator();
  private readonly generalValidator = new GeneralCrossValidator();

  public validate(configs: ConfigCollection): ValidationResult {
    const context: CrossValidationContext = { configs };
    const results: ValidationResult[] = [];

    // Environment-specific validation
    if (configs.environment.isProduction) {
      results.push(this.productionValidator.validate(context));
    } else if (configs.environment.isDevelopment) {
      results.push(this.developmentValidator.validate(context));
    } else if (configs.environment.isTesting) {
      results.push(this.testingValidator.validate(context));
    }

    // General cross-configuration validation
    results.push(this.generalValidator.validate(context));

    return mergeValidationResults(results);
  }

}