import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import AuditLogs from '@/components/AuditLogs';

vi.mock('@/services/api', () => ({
  apiGet: vi.fn().mockResolvedValue({
    total: 1,
    logs: [{
      action: 'CREATE',
      resource: 'components',
      statusCode: 201,
      ip: '127.0.0.1',
      ua: 'TestAgent',
      resourceId: 'c1',
      createdAt: new Date().toISOString()
    }]
  })
}));

describe('AuditLogs', () => {
  it('renders logs from API', async () => {
    render(<AuditLogs onClose={() => {}} />);
    fireEvent.click(screen.getByText('Atualizar'));
    const comp = await screen.findByText('components');
    const status = await screen.findByText('201');
    expect(comp).toBeTruthy();
    expect(status).toBeTruthy();
  });
});
