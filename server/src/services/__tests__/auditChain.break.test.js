import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyAuditChain } from '../auditService.js';

vi.mock('../../models/auditLog.js', () => {
  return {
    AuditLog: {
      find: vi.fn()
    }
  };
});

const { AuditLog } = await import('../../models/auditLog.js');

describe('auditService.verifyAuditChain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detecta quebra de cadeia e retorna índice da quebra', async () => {
    const seq = [
      { resource: 'logs', resourceId: 'l1', action: 'CREATE', prevHash: '', hash: 'A', statusCode: 201 },
      { resource: 'logs', resourceId: 'l1', action: 'UPDATE', prevHash: 'A', hash: 'B', statusCode: 200 },
      { resource: 'logs', resourceId: 'l1', action: 'UPDATE', prevHash: 'WRONG', hash: 'C', statusCode: 200 }
    ];
    const chain = {
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(seq)
    };
    AuditLog.find.mockReturnValue(chain);
    const res = await verifyAuditChain({ resource: 'logs', resourceId: 'l1' });
    expect(AuditLog.find).toHaveBeenCalledWith({ resource: 'logs', resourceId: 'l1' });
    expect(res.total).toBe(3);
    expect(res.chainValid).toBe(false);
    expect(typeof res.breakIndex).toBe('number');
  });
});
