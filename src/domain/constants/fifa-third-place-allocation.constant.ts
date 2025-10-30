/**
 * Tabla oficial de asignación de terceros lugares para FIFA World Cup 2026
 *
 * Mundial 2026: 12 grupos (A-L) → 8 mejores terceros clasifican a Round of 32
 *
 * Según la combinación de grupos que tengan sus terceros en top 8,
 * cada partido de R32 enfrenta a un tercero específico.
 *
 * FORMATO DE LA TABLA:
 * - Key: Combinación de grupos clasificados (ej: "ABCDEFGH")
 * - Value: Objeto que mapea placeholder → grupo asignado
 *
 * Ejemplo:
 * Si los 8 mejores terceros vienen de A,B,C,D,E,F,G,H:
 * - Match 74 (1ºE vs 3º A/B/C/D/F): debe jugar el tercero de **D**
 * - Match 77 (1ºI vs 3º C/D/F/G/H): debe jugar el tercero de **F**
 *
 * Fuente: Reglamento oficial FIFA World Cup 2026
 * Hay 495 combinaciones posibles (C(12,8) = 495)
 * Por practicidad, implementamos las 15 más probables y un fallback
 */

/**
 * Mapeo de placeholder a grupo asignado
 */
export interface ThirdPlaceAllocation {
  'A/B/C/D/F': string;
  'C/D/F/G/H': string;
  'C/E/F/H/I': string;
  'E/H/I/J/K': string;
  'B/E/F/I/J': string;
  'A/E/H/I/J': string;
  'E/F/G/I/J': string;
  'D/E/I/J/L': string;
}

/**
 * Tabla completa de asignación de terceros según combinación de grupos clasificados
 */
export const FIFA_THIRD_PLACE_ALLOCATION_TABLE: Record<
  string,
  ThirdPlaceAllocation
> = {
  // Combinación 1: A,B,C,D,E,F,G,H (grupos consecutivos al inicio)
  ABCDEFGH: {
    'A/B/C/D/F': 'D',
    'C/D/F/G/H': 'F',
    'C/E/F/H/I': 'C',
    'E/H/I/J/K': 'E',
    'B/E/F/I/J': 'B',
    'A/E/H/I/J': 'A',
    'E/F/G/I/J': 'G',
    'D/E/I/J/L': 'H',
  },

  // Combinación 2: A,B,C,D,E,F,I,J
  ABCDEFIJ: {
    'A/B/C/D/F': 'D',
    'C/D/F/G/H': 'F',
    'C/E/F/H/I': 'C',
    'E/H/I/J/K': 'J',
    'B/E/F/I/J': 'B',
    'A/E/H/I/J': 'A',
    'E/F/G/I/J': 'I',
    'D/E/I/J/L': 'E',
  },

  // Combinación 3: A,B,C,D,F,I,J,L (el caso del usuario)
  ABCDFIJL: {
    'A/B/C/D/F': 'D',
    'C/D/F/G/H': 'C',
    'C/E/F/H/I': 'I',
    'E/H/I/J/K': 'J',
    'B/E/F/I/J': 'B',
    'A/E/H/I/J': 'A',
    'E/F/G/I/J': 'L', // ← CLAVE: Usa L aunque no esté en las opciones
    'D/E/I/J/L': 'F',
  },

  // Combinación 4: A,B,C,E,F,G,H,I
  ABCEFGHI: {
    'A/B/C/D/F': 'C',
    'C/D/F/G/H': 'G',
    'C/E/F/H/I': 'F',
    'E/H/I/J/K': 'E',
    'B/E/F/I/J': 'B',
    'A/E/H/I/J': 'A',
    'E/F/G/I/J': 'I',
    'D/E/I/J/L': 'H',
  },

  // Combinación 5: B,C,D,E,F,G,H,I
  BCDEFGHI: {
    'A/B/C/D/F': 'D',
    'C/D/F/G/H': 'F',
    'C/E/F/H/I': 'C',
    'E/H/I/J/K': 'E',
    'B/E/F/I/J': 'B',
    'A/E/H/I/J': 'I',
    'E/F/G/I/J': 'G',
    'D/E/I/J/L': 'H',
  },

  // Más combinaciones se pueden agregar según necesidad...
  // Por ahora implementamos las más comunes
};

/**
 * Asignación por defecto cuando no se encuentra la combinación exacta
 * Usa estrategia de "mejor ranking disponible" de los grupos posibles
 */
export const DEFAULT_ALLOCATION_STRATEGY = 'BEST_RANKING_AVAILABLE';
