import { Integrator } from './integrator.interface';

/**
 * Registry for managing e-invoice integrators
 */
export class IntegratorRegistry {
  private static integrators: Map<string, Integrator> = new Map();

  /**
   * Register an integrator
   */
  static register(integrator: Integrator): void {
    this.integrators.set(integrator.key(), integrator);
  }

  /**
   * Get an integrator by key
   */
  static getIntegrator(key: string): Integrator | null {
    return this.integrators.get(key) || null;
  }

  /**
   * Get all registered integrator keys
   */
  static getAvailableIntegrators(): string[] {
    return Array.from(this.integrators.keys());
  }

  /**
   * Check if an integrator is registered
   */
  static hasIntegrator(key: string): boolean {
    return this.integrators.has(key);
  }
}

