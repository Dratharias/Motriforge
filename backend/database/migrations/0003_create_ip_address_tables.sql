-- Create IP address normalization tables for security audit system
-- This follows database normalization best practices for IP address management

-- Core IP addresses table
CREATE TABLE IF NOT EXISTS ip_addresses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  ip_address INET NOT NULL UNIQUE,
  ip_version INTEGER NOT NULL CHECK (ip_version IN (4, 6)),
  ip_type VARCHAR(20) NOT NULL DEFAULT 'unknown' CHECK (ip_type IN (
    'public', 'private', 'loopback', 'multicast', 'broadcast', 'reserved', 'unknown'
  )),
  
  -- Basic metadata
  first_seen TIMESTAMP NOT NULL DEFAULT now(),
  last_seen TIMESTAMP NOT NULL DEFAULT now(),
  total_requests INTEGER NOT NULL DEFAULT 1,
  
  -- Risk assessment
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  reputation_status VARCHAR(20) DEFAULT 'unknown' CHECK (reputation_status IN (
    'trusted', 'neutral', 'suspicious', 'malicious', 'unknown'
  )),
  
  -- Administrative
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  block_reason TEXT,
  blocked_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- IP geolocation data
CREATE TABLE IF NOT EXISTS ip_geolocation (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  ip_address_id TEXT NOT NULL REFERENCES ip_addresses(id) ON DELETE CASCADE,
  
  -- Location data
  country_code VARCHAR(2), -- ISO 3166-1 alpha-2
  country_name VARCHAR(100),
  region_code VARCHAR(10),
  region_name VARCHAR(100),
  city VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone VARCHAR(50),
  
  -- Network data
  isp VARCHAR(255),
  organization VARCHAR(255),
  asn INTEGER, -- Autonomous System Number
  asn_org VARCHAR(255),
  
  -- Metadata
  accuracy_radius INTEGER, -- Accuracy in kilometers
  data_source VARCHAR(50) DEFAULT 'unknown', -- maxmind, ipapi, etc.
  last_updated TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Ensure one geolocation record per IP
  UNIQUE(ip_address_id)
);

-- IP reputation and threat intelligence
CREATE TABLE IF NOT EXISTS ip_reputation (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  ip_address_id TEXT NOT NULL REFERENCES ip_addresses(id) ON DELETE CASCADE,
  
  -- Reputation sources
  reputation_source VARCHAR(100) NOT NULL, -- virustotal, abuseipdb, etc.
  reputation_score INTEGER CHECK (reputation_score >= 0 AND reputation_score <= 100),
  threat_types TEXT[], -- ['malware', 'phishing', 'spam', 'botnet']
  
  -- Classification
  is_tor_exit BOOLEAN DEFAULT false,
  is_vpn BOOLEAN DEFAULT false,
  is_proxy BOOLEAN DEFAULT false,
  is_hosting BOOLEAN DEFAULT false,
  is_residential BOOLEAN DEFAULT false,
  
  -- Threat data
  malware_families TEXT[],
  attack_types TEXT[], -- ['brute_force', 'sql_injection', 'ddos']
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Temporal data
  first_reported TIMESTAMP,
  last_reported TIMESTAMP,
  report_count INTEGER DEFAULT 1,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- IP address usage history (for audit trail)
CREATE TABLE IF NOT EXISTS ip_address_usage (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  ip_address_id TEXT NOT NULL REFERENCES ip_addresses(id),
  
  -- Usage context
  entity_type VARCHAR(100) NOT NULL, -- 'audit_log', 'log_entry', 'event_log'
  entity_id TEXT NOT NULL,
  
  -- User context
  user_id TEXT,
  session_id TEXT,
  user_agent TEXT,
  
  -- Activity data
  activity_type VARCHAR(50) NOT NULL, -- 'login', 'api_request', 'data_access'
  activity_result VARCHAR(20) DEFAULT 'success', -- 'success', 'failed', 'blocked'
  
  -- Risk assessment for this usage
  usage_risk_score INTEGER DEFAULT 0 CHECK (usage_risk_score >= 0 AND usage_risk_score <= 100),
  risk_factors JSONB DEFAULT '{}', -- {'unusual_time': true, 'new_location': true}
  
  -- Temporal
  occurred_at TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_ip_addresses_ip ON ip_addresses(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_type ON ip_addresses(ip_type);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_risk ON ip_addresses(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_reputation ON ip_addresses(reputation_status);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_blocked ON ip_addresses(is_blocked) WHERE is_blocked = true;
CREATE INDEX IF NOT EXISTS idx_ip_addresses_last_seen ON ip_addresses(last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_ip_geolocation_country ON ip_geolocation(country_code);
CREATE INDEX IF NOT EXISTS idx_ip_geolocation_city ON ip_geolocation(city);
CREATE INDEX IF NOT EXISTS idx_ip_geolocation_location ON ip_geolocation(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_ip_geolocation_isp ON ip_geolocation(isp);
CREATE INDEX IF NOT EXISTS idx_ip_geolocation_asn ON ip_geolocation(asn);

CREATE INDEX IF NOT EXISTS idx_ip_reputation_source ON ip_reputation(reputation_source);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_score ON ip_reputation(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_threat_types ON ip_reputation USING GIN(threat_types);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_tor ON ip_reputation(is_tor_exit) WHERE is_tor_exit = true;
CREATE INDEX IF NOT EXISTS idx_ip_reputation_vpn ON ip_reputation(is_vpn) WHERE is_vpn = true;
CREATE INDEX IF NOT EXISTS idx_ip_reputation_confidence ON ip_reputation(confidence_level);

CREATE INDEX IF NOT EXISTS idx_ip_usage_entity ON ip_address_usage(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ip_usage_user ON ip_address_usage(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ip_usage_session ON ip_address_usage(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ip_usage_activity ON ip_address_usage(activity_type);
CREATE INDEX IF NOT EXISTS idx_ip_usage_risk ON ip_address_usage(usage_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_ip_usage_occurred ON ip_address_usage(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_usage_ip_time ON ip_address_usage(ip_address_id, occurred_at DESC);

-- Create functions for IP address management

-- Function to get or create IP address record
CREATE OR REPLACE FUNCTION get_or_create_ip_address(input_ip INET)
RETURNS TEXT AS $$
DECLARE
  ip_id TEXT;
  ip_ver INTEGER;
  ip_classification VARCHAR(20);
BEGIN
  -- Determine IP version
  ip_ver := CASE WHEN family(input_ip) = 4 THEN 4 ELSE 6 END;
  
  -- Classify IP type
  ip_classification := CASE
    -- IPv4 private ranges
    WHEN input_ip <<= '10.0.0.0/8'::inet THEN 'private'
    WHEN input_ip <<= '172.16.0.0/12'::inet THEN 'private' 
    WHEN input_ip <<= '192.168.0.0/16'::inet THEN 'private'
    WHEN input_ip <<= '169.254.0.0/16'::inet THEN 'private' -- Link-local
    -- IPv4 special ranges
    WHEN input_ip <<= '127.0.0.0/8'::inet THEN 'loopback'
    WHEN input_ip <<= '224.0.0.0/4'::inet THEN 'multicast'
    WHEN input_ip <<= '255.255.255.255/32'::inet THEN 'broadcast'
    -- IPv6 private/special ranges
    WHEN input_ip <<= 'fc00::/7'::inet THEN 'private' -- Unique local
    WHEN input_ip <<= 'fe80::/10'::inet THEN 'private' -- Link-local
    WHEN input_ip <<= '::1/128'::inet THEN 'loopback'
    WHEN input_ip <<= 'ff00::/8'::inet THEN 'multicast'
    -- Default to public for everything else
    ELSE 'public'
  END;
  
  -- Try to get existing IP
  SELECT id INTO ip_id 
  FROM ip_addresses 
  WHERE ip_address = input_ip;
  
  -- If not found, create new record
  IF ip_id IS NULL THEN
    INSERT INTO ip_addresses (ip_address, ip_version, ip_type)
    VALUES (input_ip, ip_ver, ip_classification)
    RETURNING id INTO ip_id;
  ELSE
    -- Update last_seen and increment counter
    UPDATE ip_addresses 
    SET last_seen = now(), 
        total_requests = total_requests + 1,
        updated_at = now()
    WHERE id = ip_id;
  END IF;
  
  RETURN ip_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record IP usage in audit context
CREATE OR REPLACE FUNCTION record_ip_usage(
  input_ip INET,
  p_entity_type VARCHAR(100),
  p_entity_id TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_activity_type VARCHAR(50) DEFAULT 'unknown',
  p_activity_result VARCHAR(20) DEFAULT 'success'
) RETURNS TEXT AS $$
DECLARE
  ip_id TEXT;
  usage_id TEXT;
  calculated_risk INTEGER;
BEGIN
  -- Get or create IP address
  SELECT get_or_create_ip_address(input_ip) INTO ip_id;
  
  -- Calculate basic usage risk (would be enhanced with more sophisticated logic)
  calculated_risk := 0;
  
  -- Add risk for public IPs
  IF EXISTS (SELECT 1 FROM ip_addresses WHERE id = ip_id AND ip_type = 'public') THEN
    calculated_risk := calculated_risk + 20;
  END IF;
  
  -- Add risk for failed activities
  IF p_activity_result = 'failed' THEN
    calculated_risk := calculated_risk + 30;
  END IF;
  
  -- Add risk for sensitive activities
  IF p_activity_type IN ('login', 'financial', 'data_export') THEN
    calculated_risk := calculated_risk + 15;
  END IF;
  
  -- Cap at 100
  calculated_risk := LEAST(calculated_risk, 100);
  
  -- Insert usage record
  INSERT INTO ip_address_usage (
    ip_address_id, entity_type, entity_id, user_id, session_id, 
    user_agent, activity_type, activity_result, usage_risk_score
  ) VALUES (
    ip_id, p_entity_type, p_entity_id, p_user_id, p_session_id,
    p_user_agent, p_activity_type, p_activity_result, calculated_risk
  ) RETURNING id INTO usage_id;
  
  RETURN usage_id;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze IP risk patterns
CREATE OR REPLACE FUNCTION analyze_ip_risk_patterns(
  p_ip_address INET DEFAULT NULL,
  p_user_id TEXT DEFAULT NULL,
  p_hours_back INTEGER DEFAULT 24
) RETURNS TABLE(
  ip_address INET,
  risk_score INTEGER,
  total_requests BIGINT,
  failed_requests BIGINT,
  unique_users BIGINT,
  suspicious_patterns TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ia.ip_address,
    ia.risk_score,
    COUNT(iau.*) as total_requests,
    COUNT(CASE WHEN iau.activity_result = 'failed' THEN 1 END) as failed_requests,
    COUNT(DISTINCT iau.user_id) as unique_users,
    ARRAY_AGG(DISTINCT 
      CASE 
        WHEN iau.activity_result = 'failed' AND COUNT(*) FILTER (WHERE iau.activity_result = 'failed') > 5 
        THEN 'high_failure_rate'
        WHEN COUNT(DISTINCT iau.user_id) > 10 
        THEN 'multiple_users'
        WHEN ir.is_tor_exit = true 
        THEN 'tor_exit_node'
        WHEN ir.is_vpn = true 
        THEN 'vpn_usage'
        ELSE NULL
      END
    ) FILTER (WHERE 
      (iau.activity_result = 'failed' AND COUNT(*) FILTER (WHERE iau.activity_result = 'failed') > 5) OR
      (COUNT(DISTINCT iau.user_id) > 10) OR
      (ir.is_tor_exit = true) OR
      (ir.is_vpn = true)
    ) as suspicious_patterns
  FROM ip_addresses ia
  LEFT JOIN ip_address_usage iau ON ia.id = iau.ip_address_id
  LEFT JOIN ip_reputation ir ON ia.id = ir.ip_address_id
  WHERE 
    (p_ip_address IS NULL OR ia.ip_address = p_ip_address)
    AND (p_user_id IS NULL OR iau.user_id = p_user_id)
    AND iau.occurred_at >= NOW() - (p_hours_back * INTERVAL '1 hour')
    AND ia.is_active = true
  GROUP BY ia.id, ia.ip_address, ia.risk_score, ir.is_tor_exit, ir.is_vpn
  ORDER BY ia.risk_score DESC, total_requests DESC;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update ip_addresses.updated_at
CREATE OR REPLACE FUNCTION update_ip_address_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ip_addresses_updated_at
  BEFORE UPDATE ON ip_addresses
  FOR EACH ROW EXECUTE FUNCTION update_ip_address_timestamp();

CREATE TRIGGER trigger_ip_reputation_updated_at
  BEFORE UPDATE ON ip_reputation
  FOR EACH ROW EXECUTE FUNCTION update_ip_address_timestamp();