import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAccessToken, openVolumeOnAnac } from '../anacService.js';
import { config } from '../../config.js';

describe('anacService', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('getAccessToken posts form and returns token', async () => {
    const json = vi.fn().mockResolvedValue({ access_token: 'abc', expires_in: 1800 });
    global.fetch.mockResolvedValue({ ok: true, json });
    const token = await getAccessToken();
    expect(token).toBe('abc');
    expect(global.fetch).toHaveBeenCalledWith(config.anacSsoTokenUrl, expect.objectContaining({ method: 'POST' }));
  });

  it('openVolumeOnAnac formats payload and returns ids', async () => {
    const tokenJson = vi.fn().mockResolvedValue({ access_token: 'def', expires_in: 1800 });
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: tokenJson }) // token
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ idDiarioBordoVolume: 'V123', idDiarioBordoOperador: 'OP9' }) }); // volume

    const { requestBody } = await openVolumeOnAnac({
      numeroVolume: '01/PT-AAA/2025',
      matriculaAeronave: 'PT-AAA',
      minutosTotaisVoo: 60,
      totalPousos: 10,
      totalCiclosCelula: 10,
      observacoesTermoDeAbertura: 'Teste',
      horasVooMotor: { '1': '150:00' },
      ciclosMotor: { '1': '100' }
    });
    expect(requestBody.matriculaAeronave).toBe('PTAAA');
    expect(requestBody.minutosTotaisVoo).toBe('60');
  });
});
