import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as auditService from '../auditService.js';

vi.mock('../../models/auditLog.js', () => {
  return {
    AuditLog: {
      create: vi.fn(),
      find: vi.fn(),
      countDocuments: vi.fn()
    }
  };
});

const { AuditLog } = await import('../../models/auditLog.js');

describe('auditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('addAuditLog sends normalized payload', async () => {
    const req = {
      ip: '127.0.0.1',
      method: 'POST',
      headers: { 'user-agent': 'Vitest' },
      user: { email: 'admin@test.com' }
    };
    await auditService.addAuditLog({
      req,
      action: 'CREATE',
      resource: 'components',
      resourceId: 'c1',
      statusCode: 201,
      payload: { foo: 'bar' }
    });
    expect(AuditLog.create).toHaveBeenCalledWith({
      action: 'CREATE',
      resource: 'components',
      resourceId: 'c1',
      method: 'POST',
      statusCode: 201,
      user: 'admin@test.com',
      ip: '127.0.0.1',
      ua: 'Vitest',
      payload: { foo: 'bar' }
    });
  });

  it('listAuditLogs returns total and logs', async () => {
    const chain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ resource: 'components', action: 'CREATE' }])
    };
    AuditLog.find.mockReturnValue(chain);
    AuditLog.countDocuments.mockResolvedValue(1);
    const res = await auditService.listAuditLogs({ limit: 10, offset: 0, resource: 'components' });
    expect(AuditLog.find).toHaveBeenCalledWith({ resource: 'components' });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.total).toBe(1);
    expect(res.logs.length).toBe(1);
  });
});
