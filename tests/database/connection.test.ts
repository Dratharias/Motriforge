import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../backend/database/connection';
import { severityClassification } from '../../backend/database/schema';

describe('Database Connection', () => {
  beforeAll(async () => {
    // Ensure database is connected
    await db.execute('SELECT 1');
  });

  it('should connect to database successfully', async () => {
    const result = await db.execute('SELECT 1 as test');
    expect(result).toBeDefined();
  });

  it('should have severity classifications seeded', async () => {
    const severities = await db.select().from(severityClassification);
    
    expect(severities.length).toBeGreaterThan(0);
    expect(severities.length).toBe(19); // Based on seed data
    
    // Check some expected severity types
    const errorCritical = severities.find(s => s.type === 'error' && s.level === 'critical');
    const auditHigh = severities.find(s => s.type === 'audit' && s.level === 'high');
    
    expect(errorCritical).toBeDefined();
    expect(auditHigh).toBeDefined();
    expect(errorCritical?.requiresNotification).toBe(true);
  });

  it('should have proper table structure', async () => {
    // Test that we can query the main tables
    const tables = [
      'severity_classification',
      'event_actor_type', 
      'event_action_type',
      'event_scope_type',
      'event_target_type'
    ];

    for (const table of tables) {
      const result = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
      expect(result).toBeDefined();
    }
  });
});