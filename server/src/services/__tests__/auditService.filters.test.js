import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as auditService from '../auditService.js';

vi.mock('../../models/auditLog.js', () => {
  return {
    AuditLog: {
      find: vi.fn(),
      countDocuments: vi.fn()
    }
  };
});

const { AuditLog } = await import('../../models/auditLog.js');

describe('auditService filters use index-friendly queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('query logs RECTIFY filter by resource and action', async () => {
    const chain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([])
    };
    AuditLog.find.mockReturnValue(chain);
    AuditLog.countDocuments.mockResolvedValue(0);
    await auditService.listAuditLogs({ limit: 10, offset: 0, resource: 'logs', action: 'RECTIFY' });
    expect(AuditLog.find).toHaveBeenCalledWith({ resource: 'logs', action: 'RECTIFY' });
  });

  it('query by action RECTIFY alone', async () => {
    const chain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([])
    };
    AuditLog.find.mockReturnValue(chain);
    AuditLog.countDocuments.mockResolvedValue(0);
    await auditService.listAuditLogs({ limit: 10, offset: 0, action: 'RECTIFY' });
    expect(AuditLog.find).toHaveBeenCalledWith({ action: 'RECTIFY' });
  });
});
