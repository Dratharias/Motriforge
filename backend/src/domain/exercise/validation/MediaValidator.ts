import { IExerciseValidator } from './IExerciseValidator';
import { ValidationResult, ValidationError, ValidationSeverity, ValidationWarning } from '../../../types/core/behaviors';
import { Exercise } from '../entities/Exercise';
import { ExerciseDefaults } from '../config/ExerciseDefaults';
import { MediaType } from '../../../types/fitness/enums/media';

/**
 * Validates exercise media content and requirements
 */
export class MediaValidator implements IExerciseValidator {
  public readonly priority = 60;
  public readonly name = 'MediaValidator';

  shouldValidate(exercise: Exercise): boolean {
    return exercise.mediaUrls.length > 0 || exercise.instructions.some(i => i.hasMedia());
  }

  validate(exercise: Exercise): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const config = ExerciseDefaults.getDefaultConfig();

    // Media requirements validation
    this.validateMediaRequirements(exercise, errors, config);
    
    // Media format validation
    this.validateMediaFormats(exercise, errors, warnings, config);
    
    // Media completeness validation
    this.validateMediaCompleteness(exercise, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      isDraftValid: true, // Media not critical for drafts
      requiredForPublication: config.validation.requireMediaForPublish ? ['media'] : [],
      canSaveDraft: () => true,
      canPublish: () => errors.length === 0
    };
  }

  private validateMediaRequirements(exercise: Exercise, errors: ValidationError[], config: any): void {
    if (config.validation.requireMediaForPublish && !exercise.isDraft) {
      const hasExerciseMedia = exercise.mediaUrls.length > 0;
      const hasInstructionMedia = exercise.instructions.some(i => i.hasMedia());
      
      if (!hasExerciseMedia && !hasInstructionMedia) {
        errors.push({
          field: 'media',
          message: 'Media content is required for publication',
          code: 'required',
          severity: ValidationSeverity.ERROR
        });
      }
    }

    if (exercise.mediaUrls.length > config.limits.maxMediaFiles) {
      errors.push({
        field: 'mediaUrls',
        message: `Cannot have more than ${config.limits.maxMediaFiles} media files`,
        code: 'max_items',
        severity: ValidationSeverity.ERROR
      });
    }
  }

  private validateMediaFormats(exercise: Exercise, errors: ValidationError[], warnings: ValidationWarning[], config: any): void {
    const mediaConfig = config.media;
    
    // Check media URL formats (basic validation)
    for (let i = 0; i < exercise.mediaUrls.length; i++) {
      const url = exercise.mediaUrls[i];
      const mediaType = exercise.mediaTypes[i];
      
      if (!this.isValidUrl(url)) {
        errors.push({
          field: 'mediaUrls',
          message: `Invalid media URL format: ${url}`,
          code: 'invalid_format',
          severity: ValidationSeverity.ERROR
        });
        continue;
      }

      // Check file extension alignment with media type
      if (mediaType && !this.isMediaTypeAligned(url, mediaType, mediaConfig)) {
        warnings.push({
          field: 'mediaTypes',
          message: `Media type ${mediaType} may not match file extension in URL`,
          suggestion: 'Verify that media type correctly identifies the file format'
        });
      }
    }

    // Validate instruction media
    for (const instruction of exercise.instructions) {
      if (instruction.mediaUrl && !this.isValidUrl(instruction.mediaUrl)) {
        errors.push({
          field: 'instructions',
          message: `Invalid media URL in instruction ${instruction.stepNumber}`,
          code: 'invalid_format',
          severity: ValidationSeverity.ERROR
        });
      }
    }
  }

  private validateMediaCompleteness(exercise: Exercise, warnings: ValidationWarning[]): void {
    // Check for missing thumbnails on videos
    const videoInstructions = exercise.instructions.filter(
      i => i.mediaType === MediaType.VIDEO
    );
    
    if (videoInstructions.length > 0) {
      warnings.push({
        field: 'instructions',
        message: 'Video instructions should include thumbnails for better user experience',
        suggestion: 'Generate or provide thumbnail images for video content'
      });
    }

    // Check for audio descriptions on complex visual exercises
    const visualInstructions = exercise.instructions.filter(
      i => i.mediaType === MediaType.IMAGE || i.mediaType === MediaType.VIDEO
    );
    
    if (visualInstructions.length > 0 && exercise.instructions.every(i => i.mediaType !== MediaType.AUDIO)) {
      warnings.push({
        field: 'instructions',
        message: 'Consider adding audio descriptions for accessibility',
        suggestion: 'Audio guidance can improve exercise execution and accessibility'
      });
    }

    // Suggest media for key instruction steps
    const keySteps = exercise.instructions.filter(i => 
      i.title.toLowerCase().includes('position') || 
      i.title.toLowerCase().includes('form') ||
      i.stepNumber === 1
    );
    
    const keyStepsWithoutMedia = keySteps.filter(i => !i.hasMedia());
    if (keyStepsWithoutMedia.length > 0) {
      warnings.push({
        field: 'instructions',
        message: 'Key instruction steps could benefit from visual media',
        suggestion: 'Add images or videos to critical form and positioning steps'
      });
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isMediaTypeAligned(url: string, mediaType: MediaType, mediaConfig: any): boolean {
    const extension = url.split('.').pop()?.toLowerCase();
    if (!extension) return false;

    switch (mediaType) {
      case MediaType.IMAGE:
        return mediaConfig.allowedImageFormats.includes(extension);
      case MediaType.VIDEO:
        return mediaConfig.allowedVideoFormats.includes(extension);
      case MediaType.AUDIO:
        return mediaConfig.allowedAudioFormats.includes(extension);
      default:
        return true; // Allow unknown types
    }
  }
}

