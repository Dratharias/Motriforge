import { Types } from 'mongoose';
import { IRiskAssessmentService } from '@/domain/iam/ports/IRiskAssessmentService';
import { RiskLevel } from '@/types/iam/interfaces';
import { LoggerFactory } from '@/shared-kernel/infrastructure/logging/factory/LoggerFactory';

export class RiskAssessmentAdapter implements IRiskAssessmentService {
  private readonly logger = LoggerFactory.getContextualLogger('RiskAssessmentAdapter');

  async assessLoginRisk(
    identityId: Types.ObjectId,
    ipAddress: string,
    deviceFingerprint: string,
    userAgent: string
  ): Promise<{
    riskScore: number;
    riskLevel: RiskLevel;
    factors: string[];
  }> {
    const factors: string[] = [];
    let riskScore = 0;

    try {
      // IP Address Risk Assessment
      if (this.isPrivateIP(ipAddress)) {
        riskScore += 10;
        factors.push('private_ip');
      } else {
        riskScore += 20;
        factors.push('public_ip');
      }

      // Device Assessment
      if (this.isNewDevice(deviceFingerprint)) {
        riskScore += 30;
        factors.push('new_device');
      }

      // User Agent Assessment
      if (this.isSuspiciousUserAgent(userAgent)) {
        riskScore += 25;
        factors.push('suspicious_user_agent');
      }

      // Time-based Assessment
      if (this.isOffHours()) {
        riskScore += 15;
        factors.push('off_hours_access');
      }

      // Determine risk level
      let riskLevel: RiskLevel;
      if (riskScore < 25) {
        riskLevel = RiskLevel.LOW;
      } else if (riskScore < 50) {
        riskLevel = RiskLevel.MEDIUM;
      } else if (riskScore < 75) {
        riskLevel = RiskLevel.HIGH;
      } else {
        riskLevel = RiskLevel.CRITICAL;
      }

      this.logger.debug('Login risk assessed', {
        identityId: identityId.toString(),
        riskScore,
        riskLevel,
        factors
      });

      return { riskScore, riskLevel, factors };

    } catch (error) {
      this.logger.error('Failed to assess login risk', error as Error, {
        identityId: identityId.toString()
      });
      
      // Return high risk on error
      return {
        riskScore: 75,
        riskLevel: RiskLevel.HIGH,
        factors: ['assessment_error']
      };
    }
  }

  async assessSessionRisk(
    sessionId: string,
    activities: Record<string, unknown>[]
  ): Promise<{
    riskScore: number;
    riskLevel: RiskLevel;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    let riskScore = 0;

    try {
      // Activity pattern analysis
      if (activities.length > 100) {
        riskScore += 20;
        recommendations.push('High activity volume detected');
      }

      // Check for rapid actions
      const rapidActions = this.detectRapidActions(activities);
      if (rapidActions) {
        riskScore += 30;
        recommendations.push('Rapid action patterns detected');
      }

      // Check for unusual access patterns
      const unusualPatterns = this.detectUnusualPatterns(activities);
      if (unusualPatterns) {
        riskScore += 25;
        recommendations.push('Unusual access patterns detected');
      }

      // Determine risk level and recommendations
      let riskLevel: RiskLevel;
      if (riskScore < 25) {
        riskLevel = RiskLevel.LOW;
      } else if (riskScore < 50) {
        riskLevel = RiskLevel.MEDIUM;
        recommendations.push('Monitor session closely');
      } else if (riskScore < 75) {
        riskLevel = RiskLevel.HIGH;
        recommendations.push('Consider additional authentication');
      } else {
        riskLevel = RiskLevel.CRITICAL;
        recommendations.push('Terminate session immediately');
      }

      this.logger.debug('Session risk assessed', {
        sessionId,
        riskScore,
        riskLevel,
        activityCount: activities.length
      });

      return { riskScore, riskLevel, recommendations };

    } catch (error) {
      this.logger.error('Failed to assess session risk', error as Error, {
        sessionId
      });
      
      return {
        riskScore: 50,
        riskLevel: RiskLevel.MEDIUM,
        recommendations: ['Assessment error - manual review required']
      };
    }
  }

  private isPrivateIP(ipAddress: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[0-1])\./,
      /^192\.168\./,
      /^127\./
    ];
    
    return privateRanges.some(range => range.test(ipAddress));
  }

  private isNewDevice(deviceFingerprint: string): boolean {
    // In a real implementation, this would check against a database of known devices
    // For now, we'll use a simple heuristic
    return Math.random() > 0.7; // 30% chance it's a new device
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private isOffHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    
    // Consider 10 PM to 6 AM as off hours
    return hour >= 22 || hour <= 6;
  }

  private detectRapidActions(activities: Record<string, unknown>[]): boolean {
    if (activities.length < 2) return false;
    
    // Check for actions within 1 second of each other
    for (let i = 1; i < activities.length; i++) {
      const prev = new Date(activities[i - 1].timestamp as string);
      const curr = new Date(activities[i].timestamp as string);
      
      if (curr.getTime() - prev.getTime() < 1000) {
        return true;
      }
    }
    
    return false;
  }

  private detectUnusualPatterns(activities: Record<string, unknown>[]): boolean {
    // Simple heuristic: if more than 50% of activities are the same type
    const actionCounts = new Map<string, number>();
    
    activities.forEach(activity => {
      const action = activity.action as string;
      actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1);
    });
    
    const maxCount = Math.max(...Array.from(actionCounts.values()));
    return maxCount > activities.length * 0.5;
  }
}