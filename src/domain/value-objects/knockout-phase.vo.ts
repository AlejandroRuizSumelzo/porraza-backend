/**
 * KnockoutPhase Value Object
 *
 * Representa las fases de eliminatorias del Mundial 2026.
 * Inmutable y con validaciones.
 */
export class KnockoutPhase {
  private static readonly VALID_PHASES = [
    'ROUND_OF_32',
    'ROUND_OF_16',
    'QUARTER_FINALS',
    'SEMI_FINALS',
    'FINAL',
  ] as const;

  private static readonly PHASE_ORDER_MAP = new Map<string, number>([
    ['ROUND_OF_32', 1],
    ['ROUND_OF_16', 2],
    ['QUARTER_FINALS', 3],
    ['SEMI_FINALS', 4],
    ['FINAL', 5],
  ]);

  private static readonly NEXT_PHASE_MAP = new Map<string, string | null>([
    ['ROUND_OF_32', 'ROUND_OF_16'],
    ['ROUND_OF_16', 'QUARTER_FINALS'],
    ['QUARTER_FINALS', 'SEMI_FINALS'],
    ['SEMI_FINALS', 'FINAL'],
    ['FINAL', null],
  ]);

  private static readonly PHASE_MATCH_COUNT = new Map<string, number>([
    ['ROUND_OF_32', 16],
    ['ROUND_OF_16', 8],
    ['QUARTER_FINALS', 4],
    ['SEMI_FINALS', 2],
    ['FINAL', 1],
  ]);

  constructor(public readonly value: string) {
    this.validate();
  }

  private validate(): void {
    if (!KnockoutPhase.VALID_PHASES.includes(this.value as any)) {
      throw new Error(
        `Invalid knockout phase: ${this.value}. Valid phases are: ${KnockoutPhase.VALID_PHASES.join(', ')}`,
      );
    }
  }

  /**
   * Obtiene la fase anterior
   */
  getPreviousPhase(): KnockoutPhase | null {
    const currentOrder = KnockoutPhase.PHASE_ORDER_MAP.get(this.value);
    if (!currentOrder || currentOrder === 1) {
      return null;
    }

    const previousPhaseEntry = Array.from(
      KnockoutPhase.PHASE_ORDER_MAP.entries(),
    ).find(([_, order]) => order === currentOrder - 1);

    return previousPhaseEntry ? new KnockoutPhase(previousPhaseEntry[0]) : null;
  }

  /**
   * Obtiene la siguiente fase
   */
  getNextPhase(): KnockoutPhase | null {
    const nextPhaseValue = KnockoutPhase.NEXT_PHASE_MAP.get(this.value);
    return nextPhaseValue ? new KnockoutPhase(nextPhaseValue) : null;
  }

  /**
   * Obtiene el número esperado de partidos para esta fase
   */
  getExpectedMatchCount(): number {
    return KnockoutPhase.PHASE_MATCH_COUNT.get(this.value) || 0;
  }

  /**
   * Verifica si es la primera fase de eliminatorias
   */
  isFirstPhase(): boolean {
    return this.value === 'ROUND_OF_32';
  }

  /**
   * Verifica si es la final
   */
  isFinal(): boolean {
    return this.value === 'FINAL';
  }

  /**
   * Compara si esta fase es anterior a otra
   */
  isBefore(other: KnockoutPhase): boolean {
    const thisOrder = KnockoutPhase.PHASE_ORDER_MAP.get(this.value) || 0;
    const otherOrder = KnockoutPhase.PHASE_ORDER_MAP.get(other.value) || 0;
    return thisOrder < otherOrder;
  }

  /**
   * Obtiene todas las fases válidas
   */
  static getAllPhases(): string[] {
    return Array.from(KnockoutPhase.VALID_PHASES);
  }

  /**
   * Verifica si un string es una fase válida
   */
  static isValid(phase: string): boolean {
    return KnockoutPhase.VALID_PHASES.includes(phase as any);
  }

  toString(): string {
    return this.value;
  }
}
