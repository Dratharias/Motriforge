import { Database } from '~/database/connection';
import { sql } from 'drizzle-orm';

export interface IPAddress {
  id: string;
  ipAddress: string;
  ipVersion: number;
  ipType: 'public' | 'private' | 'loopback' | 'multicast' | 'broadcast' | 'reserved' | 'unknown';
  firstSeen: Date;
  lastSeen: Date;
  totalRequests: number;
  riskScore: number;
  reputationStatus: 'trusted' | 'neutral' | 'suspicious' | 'malicious' | 'unknown';
  isBlocked: boolean;
  blockReason?: string;
  blockedAt?: Date | undefined;
  notes?: string;
}

export interface IPGeolocation {
  id: string;
  ipAddressId: string;
  countryCode?: string;
  countryName?: string;
  regionCode?: string;
  regionName?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  organization?: string;
  asn?: number;
  asnOrg?: string;
  accuracyRadius?: number;
  dataSource: string;
  lastUpdated: Date;
}

export interface IPReputation {
  id: string;
  ipAddressId: string;
  reputationSource: string;
  reputationScore?: number;
  threatTypes: string[];
  isTorExit: boolean;
  isVpn: boolean;
  isProxy: boolean;
  isHosting: boolean;
  isResidential: boolean;
  malwareFamilies: string[];
  attackTypes: string[];
  confidenceLevel: 'low' | 'medium' | 'high' | 'critical';
  firstReported?: Date | undefined;
  lastReported?: Date | undefined;
  reportCount: number;
}

export interface IPUsage {
  id: string;
  ipAddressId: string;
  entityType: string;
  entityId: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  activityType: string;
  activityResult: 'success' | 'failed' | 'blocked';
  usageRiskScore: number;
  riskFactors: Record<string, any>;
  occurredAt: Date;
}

export interface IPRiskAnalysis {
  ipAddress: string;
  riskScore: number;
  totalRequests: number;
  failedRequests: number;
  uniqueUsers: number;
  suspiciousPatterns: string[];
}

export interface IPAddressConfig {
  enableGeolocationLookup: boolean;
  enableReputationLookup: boolean;
  enableRiskScoring: boolean;
  maxRiskScore: number;
  geolocationProvider: 'maxmind' | 'ipapi' | 'ipinfo' | 'mock';
  reputationProviders: string[];
  autoBlockThreshold: number;
  riskFactors: {
    publicIpWeight: number;
    vpnWeight: number;
    torWeight: number;
    suspiciousLocationWeight: number;
    highFailureRateWeight: number;
  };
}

export class IPAddressService {
  private readonly config: IPAddressConfig;

  constructor(
    private readonly db: Database,
    config?: Partial<IPAddressConfig>
  ) {
    this.config = {
      enableGeolocationLookup: true,
      enableReputationLookup: true,
      enableRiskScoring: true,
      maxRiskScore: 100,
      geolocationProvider: 'mock', // Use mock for MVP
      reputationProviders: ['internal'], // Use internal reputation for MVP
      autoBlockThreshold: 95,
      riskFactors: {
        publicIpWeight: 10,
        vpnWeight: 20,
        torWeight: 40,
        suspiciousLocationWeight: 15,
        highFailureRateWeight: 30
      },
      ...config
    };
  }

  /**
   * Get or create an IP address record
   */
  async getOrCreateIPAddress(ipAddress: string): Promise<string> {
    try {
      const result = await this.db.execute(sql`
        SELECT get_or_create_ip_address(${ipAddress}::inet) as ip_id
      `);

      const ipId = (result as any[])[0]?.ip_id;
      if (!ipId) {
        throw new Error('Failed to get or create IP address');
      }

      // Trigger background enrichment for new IPs
      if (this.config.enableGeolocationLookup || this.config.enableReputationLookup) {
        setImmediate(() => this.enrichIPAddress(ipId, ipAddress));
      }

      return ipId;
    } catch (error) {
      console.error('Failed to get or create IP address:', error);
      throw error;
    }
  }

  /**
   * Record IP usage in audit context
   */
  async recordIPUsage(
    ipAddress: string,
    entityType: string,
    entityId: string,
    options: {
      userId?: string;
      sessionId?: string;
      userAgent?: string;
      activityType?: string;
      activityResult?: 'success' | 'failed' | 'blocked';
    } = {}
  ): Promise<string> {
    try {
      const {
        userId,
        sessionId,
        userAgent,
        activityType = 'unknown',
        activityResult = 'success'
      } = options;

      const result = await this.db.execute(sql`
        SELECT record_ip_usage(
          ${ipAddress}::inet,
          ${entityType},
          ${entityId},
          ${userId ?? null},
          ${sessionId ?? null},
          ${userAgent ?? null},
          ${activityType},
          ${activityResult}
        ) as usage_id
      `);

      const usageId = (result as any[])[0]?.usage_id;
      if (!usageId) {
        throw new Error('Failed to record IP usage');
      }

      return usageId;
    } catch (error) {
      console.error('Failed to record IP usage:', error);
      throw error;
    }
  }

  /**
   * Get IP address details with geolocation and reputation
   */
  async getIPAddressDetails(ipAddress: string): Promise<{
    address: IPAddress;
    geolocation?: IPGeolocation;
    reputation: IPReputation[];
  } | null> {
    try {
      // Get basic IP address info
      const addressResult = await this.db.execute(sql`
        SELECT 
          id, ip_address, ip_version, ip_type, first_seen, last_seen,
          total_requests, risk_score, reputation_status, is_blocked,
          block_reason, blocked_at, notes, created_at, updated_at
        FROM ip_addresses 
        WHERE ip_address = ${ipAddress}::inet AND is_active = true
      `);

      if (!addressResult.length) {
        return null;
      }

      const addressData = addressResult[0] as any;
      const address: IPAddress = {
        id: addressData.id,
        ipAddress: addressData.ip_address,
        ipVersion: addressData.ip_version,
        ipType: addressData.ip_type,
        firstSeen: new Date(addressData.first_seen),
        lastSeen: new Date(addressData.last_seen),
        totalRequests: addressData.total_requests,
        riskScore: addressData.risk_score,
        reputationStatus: addressData.reputation_status,
        isBlocked: addressData.is_blocked,
        blockReason: addressData.block_reason,
        blockedAt: addressData.blocked_at ? new Date(addressData.blocked_at) : undefined,
        notes: addressData.notes
      };

      // Get geolocation data
      const geolocationResult = await this.db.execute(sql`
        SELECT 
          id, ip_address_id, country_code, country_name, region_code, region_name,
          city, postal_code, latitude, longitude, timezone, isp, organization,
          asn, asn_org, accuracy_radius, data_source, last_updated
        FROM ip_geolocation 
        WHERE ip_address_id = ${address.id} AND is_active = true
      `);

      let geolocation: IPGeolocation | undefined;
      if (geolocationResult.length > 0) {
        const geoData = geolocationResult[0] as any;
        geolocation = {
          id: geoData.id,
          ipAddressId: geoData.ip_address_id,
          countryCode: geoData.country_code,
          countryName: geoData.country_name,
          regionCode: geoData.region_code,
          regionName: geoData.region_name,
          city: geoData.city,
          postalCode: geoData.postal_code,
          latitude: geoData.latitude,
          longitude: geoData.longitude,
          timezone: geoData.timezone,
          isp: geoData.isp,
          organization: geoData.organization,
          asn: geoData.asn,
          asnOrg: geoData.asn_org,
          accuracyRadius: geoData.accuracy_radius,
          dataSource: geoData.data_source,
          lastUpdated: new Date(geoData.last_updated)
        };
      }

      // Get reputation data
      const reputationResult = await this.db.execute(sql`
        SELECT 
          id, ip_address_id, reputation_source, reputation_score, threat_types,
          is_tor_exit, is_vpn, is_proxy, is_hosting, is_residential,
          malware_families, attack_types, confidence_level, first_reported,
          last_reported, report_count
        FROM ip_reputation 
        WHERE ip_address_id = ${address.id} AND is_active = true
      `);

      const reputation: IPReputation[] = reputationResult.map((repData: any) => ({
        id: repData.id,
        ipAddressId: repData.ip_address_id,
        reputationSource: repData.reputation_source,
        reputationScore: repData.reputation_score,
        threatTypes: repData.threat_types ?? [],
        isTorExit: repData.is_tor_exit,
        isVpn: repData.is_vpn,
        isProxy: repData.is_proxy,
        isHosting: repData.is_hosting,
        isResidential: repData.is_residential,
        malwareFamilies: repData.malware_families ?? [],
        attackTypes: repData.attack_types ?? [],
        confidenceLevel: repData.confidence_level,
        firstReported: repData.first_reported ? new Date(repData.first_reported) : undefined,
        lastReported: repData.last_reported ? new Date(repData.last_reported) : undefined,
        reportCount: repData.report_count
      }));

      return {
        address,
        ...(geolocation !== undefined ? { geolocation } : {}),
        reputation
      };
    } catch (error) {
      console.error('Failed to get IP address details:', error);
      throw error;
    }
  }

  /**
   * Analyze IP risk patterns
   */
  async analyzeIPRiskPatterns(
    options: {
      ipAddress?: string;
      userId?: string;
      hoursBack?: number;
    } = {}
  ): Promise<IPRiskAnalysis[]> {
    try {
      const { ipAddress, userId, hoursBack = 24 } = options;

      const result = await this.db.execute(sql`
        SELECT * FROM analyze_ip_risk_patterns(
          ${ipAddress ? `${ipAddress}::inet` : null},
          ${userId ?? null},
          ${hoursBack}
        )
      `);

      return (result as any[]).map(row => ({
        ipAddress: row.ip_address,
        riskScore: row.risk_score,
        totalRequests: parseInt(row.total_requests),
        failedRequests: parseInt(row.failed_requests),
        uniqueUsers: parseInt(row.unique_users),
        suspiciousPatterns: row.suspicious_patterns ?? []
      }));
    } catch (error) {
      console.error('Failed to analyze IP risk patterns:', error);
      throw error;
    }
  }

  /**
   * Block or unblock an IP address
   */
  async blockIPAddress(ipAddress: string, reason: string): Promise<void> {
    try {
      await this.db.execute(sql`
        UPDATE ip_addresses 
        SET is_blocked = true, 
            block_reason = ${reason},
            blocked_at = now(),
            updated_at = now()
        WHERE ip_address = ${ipAddress}::inet
      `);
    } catch (error) {
      console.error('Failed to block IP address:', error);
      throw error;
    }
  }

  async unblockIPAddress(ipAddress: string): Promise<void> {
    try {
      await this.db.execute(sql`
        UPDATE ip_addresses 
        SET is_blocked = false, 
            block_reason = NULL,
            blocked_at = NULL,
            updated_at = now()
        WHERE ip_address = ${ipAddress}::inet
      `);
    } catch (error) {
      console.error('Failed to unblock IP address:', error);
      throw error;
    }
  }

  /**
   * Get IP usage history for audit purposes
   */
  async getIPUsageHistory(
    ipAddress: string,
    options: {
      limit?: number;
      offset?: number;
      hoursBack?: number;
    } = {}
  ): Promise<IPUsage[]> {
    try {
      const { limit = 100, offset = 0, hoursBack = 168 } = options; // Default 1 week

      const result = await this.db.execute(sql`
        SELECT 
          iau.id, iau.ip_address_id, iau.entity_type, iau.entity_id,
          iau.user_id, iau.session_id, iau.user_agent, iau.activity_type,
          iau.activity_result, iau.usage_risk_score, iau.risk_factors,
          iau.occurred_at, iau.created_at
        FROM ip_address_usage iau
        JOIN ip_addresses ia ON iau.ip_address_id = ia.id
        WHERE ia.ip_address = ${ipAddress}::inet
          AND iau.occurred_at >= NOW() - (${hoursBack} * INTERVAL '1 hour')
          AND iau.is_active = true
        ORDER BY iau.occurred_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      return (result as any[]).map(row => ({
        id: row.id,
        ipAddressId: row.ip_address_id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        userId: row.user_id,
        sessionId: row.session_id,
        userAgent: row.user_agent,
        activityType: row.activity_type,
        activityResult: row.activity_result,
        usageRiskScore: row.usage_risk_score,
        riskFactors: row.risk_factors ?? {},
        occurredAt: new Date(row.occurred_at)
      }));
    } catch (error) {
      console.error('Failed to get IP usage history:', error);
      throw error;
    }
  }

  /**
   * Enrich IP address with geolocation and reputation data
   */
  private async enrichIPAddress(ipId: string, ipAddress: string): Promise<void> {
    try {
      if (this.config.enableGeolocationLookup) {
        await this.enrichGeolocation(ipId, ipAddress);
      }

      if (this.config.enableReputationLookup) {
        await this.enrichReputation(ipId, ipAddress);
      }

      if (this.config.enableRiskScoring) {
        await this.updateRiskScore(ipId);
      }
    } catch (error) {
      console.error('Failed to enrich IP address:', error);
      // Don't throw - enrichment is background process
    }
  }

  /**
   * Enrich IP with geolocation data (mock implementation for MVP)
   */
  private async enrichGeolocation(ipId: string, ipAddress: string): Promise<void> {
    try {
      // Check if geolocation already exists
      const existing = await this.db.execute(sql`
        SELECT id FROM ip_geolocation WHERE ip_address_id = ${ipId}
      `);

      if (existing.length > 0) {
        return; // Already enriched
      }

      // Mock geolocation data for MVP
      const mockGeolocation = this.generateMockGeolocation(ipAddress);

      await this.db.execute(sql`
        INSERT INTO ip_geolocation (
          ip_address_id, country_code, country_name, region_name, city,
          latitude, longitude, timezone, isp, organization, data_source
        ) VALUES (
          ${ipId}, ${mockGeolocation.countryCode}, ${mockGeolocation.countryName},
          ${mockGeolocation.regionName}, ${mockGeolocation.city},
          ${mockGeolocation.latitude}, ${mockGeolocation.longitude},
          ${mockGeolocation.timezone}, ${mockGeolocation.isp},
          ${mockGeolocation.organization}, 'mock'
        ) ON CONFLICT (ip_address_id) DO NOTHING
      `);
    } catch (error) {
      console.error('Failed to enrich geolocation:', error);
    }
  }

  /**
   * Enrich IP with reputation data (mock implementation for MVP)
   */
  private async enrichReputation(ipId: string, ipAddress: string): Promise<void> {
    try {
      // Check if reputation already exists
      const existing = await this.db.execute(sql`
        SELECT id FROM ip_reputation WHERE ip_address_id = ${ipId} AND reputation_source = 'internal'
      `);

      if (existing.length > 0) {
        return; // Already enriched
      }

      // Mock reputation data for MVP
      const mockReputation = this.generateMockReputation(ipAddress);

      await this.db.execute(sql`
        INSERT INTO ip_reputation (
          ip_address_id, reputation_source, reputation_score, threat_types,
          is_tor_exit, is_vpn, is_proxy, is_hosting, is_residential,
          confidence_level, report_count
        ) VALUES (
          ${ipId}, 'internal', ${mockReputation.reputationScore}, ${mockReputation.threatTypes},
          ${mockReputation.isTorExit}, ${mockReputation.isVpn}, ${mockReputation.isProxy},
          ${mockReputation.isHosting}, ${mockReputation.isResidential},
          ${mockReputation.confidenceLevel}, 1
        )
      `);
    } catch (error) {
      console.error('Failed to enrich reputation:', error);
    }
  }

  /**
   * Update IP risk score based on reputation and usage patterns
   */
  private async updateRiskScore(ipId: string): Promise<void> {
    try {
      const reputationResult = await this.db.execute(sql`
        SELECT is_tor_exit, is_vpn, is_proxy, reputation_score
        FROM ip_reputation 
        WHERE ip_address_id = ${ipId} AND is_active = true
        LIMIT 1
      `);

      const usageResult = await this.db.execute(sql`
        SELECT 
          COUNT(*) as total_usage,
          COUNT(CASE WHEN activity_result = 'failed' THEN 1 END) as failed_usage,
          COUNT(DISTINCT user_id) as unique_users
        FROM ip_address_usage 
        WHERE ip_address_id = ${ipId} 
          AND occurred_at >= NOW() - INTERVAL '24 hours'
      `);

      let riskScore = this.calculateReputationRisk(reputationResult);
      riskScore += this.calculateUsageRisk(usageResult);
      riskScore = Math.min(riskScore, this.config.maxRiskScore);

      await this.db.execute(sql`
        UPDATE ip_addresses 
        SET risk_score = ${riskScore},
            reputation_status = CASE 
              WHEN ${riskScore} >= 80 THEN 'malicious'
              WHEN ${riskScore} >= 60 THEN 'suspicious'
              WHEN ${riskScore} >= 20 THEN 'neutral'
              ELSE 'trusted'
            END,
            updated_at = now()
        WHERE id = ${ipId}
      `);

      if (riskScore >= this.config.autoBlockThreshold) {
        await this.db.execute(sql`
          UPDATE ip_addresses 
          SET is_blocked = true,
              block_reason = 'Automatically blocked due to high risk score',
              blocked_at = now()
          WHERE id = ${ipId}
        `);
      }
    } catch (error) {
      console.error('Failed to update risk score:', error);
    }
  }

  private calculateReputationRisk(reputationResult: any[]): number {
    let riskScore = 0;
    if (reputationResult.length > 0) {
      const rep = reputationResult[0];
      if (rep.is_tor_exit) riskScore += this.config.riskFactors.torWeight;
      if (rep.is_vpn) riskScore += this.config.riskFactors.vpnWeight;
      if (rep.is_proxy) riskScore += 10;
      if (rep.reputation_score < 50) riskScore += 25;
    }
    return riskScore;
  }

  private calculateUsageRisk(usageResult: any[]): number {
    let riskScore = 0;
    if (usageResult.length > 0) {
      const usage = usageResult[0];
      const failureRate = usage.failed_usage / Math.max(usage.total_usage, 1);
      if (failureRate > 0.3) riskScore += this.config.riskFactors.highFailureRateWeight;
      if (usage.unique_users > 10) riskScore += 20;
    }
    return riskScore;
  }

  /**
   * Generate mock geolocation data for MVP
   */
  private generateMockGeolocation(ipAddress: string): Partial<IPGeolocation> {
    // Simple mock based on IP characteristics
    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress.startsWith('172.')) {
      return {
        countryCode: 'US',
        countryName: 'United States',
        regionName: 'Private Network',
        city: 'Internal',
        latitude: 39.0458,
        longitude: -76.6413,
        timezone: 'America/New_York',
        isp: 'Private Network',
        organization: 'Internal'
      };
    }

    return {
      countryCode: 'US',
      countryName: 'United States',
      regionName: 'California',
      city: 'San Francisco',
      latitude: 37.7749,
      longitude: -122.4194,
      timezone: 'America/Los_Angeles',
      isp: 'Mock ISP',
      organization: 'Mock Organization'
    };
  }

  /**
   * Generate mock reputation data for MVP
   */
  private generateMockReputation(ipAddress: string): Partial<IPReputation> {
    // Generate reputation based on IP characteristics
    const isPrivate = ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress.startsWith('172.');
    
    if (isPrivate) {
      return {
        reputationScore: 80, // Private IPs are generally trusted
        threatTypes: [],
        isTorExit: false,
        isVpn: false,
        isProxy: false,
        isHosting: false,
        isResidential: true,
        malwareFamilies: [],
        attackTypes: [],
        confidenceLevel: 'high'
      };
    }

    // Public IP mock reputation
    const hash = this.simpleHash(ipAddress);
    const riskLevel = hash % 100;

    let reputationScore: number;
    if (riskLevel > 80) {
      reputationScore = 20;
    } else if (riskLevel > 60) {
      reputationScore = 40;
    } else {
      reputationScore = 70;
    }

    return {
      reputationScore,
      threatTypes: riskLevel > 80 ? ['malware'] : [],
      isTorExit: riskLevel > 95,
      isVpn: riskLevel > 85,
      isProxy: riskLevel > 75,
      isHosting: riskLevel > 70,
      isResidential: riskLevel < 30,
      malwareFamilies: riskLevel > 90 ? ['generic'] : [],
      attackTypes: riskLevel > 80 ? ['brute_force'] : [],
      confidenceLevel: riskLevel > 80 ? 'high' : 'medium'
    };
  }

  /**
   * Simple hash function for consistent mock data
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}