import pino from 'pino';

const logger = pino({ name: 'Resilience' });

/**
 * Executa uma função com estratégia de Retry (Backoff Exponencial + Jitter)
 * @param {Function} fn - Função assíncrona a ser executada
 * @param {Object} options - Configurações de retry
 * @param {number} options.retries - Número máximo de tentativas (padrão: 3)
 * @param {number} options.minTimeout - Tempo mínimo de espera em ms (padrão: 1000)
 * @param {number} options.factor - Fator de multiplicação (padrão: 2)
 * @param {string} options.operationName - Nome da operação para logs
 */
export async function withRetry(fn, options = {}) {
  const {
    retries = 3,
    minTimeout = 1000,
    factor = 2,
    operationName = 'operation'
  } = options;

  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt++;

      if (attempt > retries) {
        logger.error({ op: operationName, attempt, error: error.message }, 'Max retries reached. Operation failed.');
        throw error;
      }

      // Cálculo do Backoff com Jitter para evitar Thundering Herd
      const timeout = Math.min(minTimeout * Math.pow(factor, attempt - 1), 10000);
      const jitter = Math.random() * 200; // +0-200ms
      const waitTime = timeout + jitter;

      logger.warn({
        op: operationName,
        attempt,
        waitTime: Math.floor(waitTime),
        error: error.message
      }, 'Operation failed, retrying...');

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

/**
 * Circuit Breaker Pattern Simplificado
 * Previne chamadas a um serviço que está falhando consistentemente
 */
export class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF-OPEN
    this.nextAttempt = 0;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF-OPEN';
        logger.info({ circuit: this.name }, 'Circuit HALF-OPEN. Testing service...');
      } else {
        const err = new Error(`Circuit Breaker '${this.name}' is OPEN`);
        err.code = 'CIRCUIT_OPEN';
        throw err;
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF-OPEN') {
      this.state = 'CLOSED';
      logger.info({ circuit: this.name }, 'Circuit CLOSED. Service recovered.');
    }
  }

  onFailure(error) {
    this.failures++;
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      logger.error({ 
        circuit: this.name, 
        failures: this.failures, 
        nextAttempt: new Date(this.nextAttempt).toISOString() 
      }, 'Circuit OPENED due to failures.');
    }
  }
}
