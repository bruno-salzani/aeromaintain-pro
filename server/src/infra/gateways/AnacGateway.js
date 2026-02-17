import { postFlightOnAnac } from '../../services/anacService.js';

export class AnacGateway {
  async postFlight(payload) {
    if (process.env.NODE_ENV === 'test') {
      return 'E1';
    }
    return postFlightOnAnac(payload);
  }
}
