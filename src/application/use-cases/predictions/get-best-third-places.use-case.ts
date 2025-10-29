import { Injectable, Inject } from '@nestjs/common';
import type { IBestThirdPlacePredictionRepository } from '@domain/repositories/best-third-place-prediction.repository.interface';
import type { BestThirdPlacePrediction } from '@domain/entities/best-third-place-prediction.entity';

/**
 * GetBestThirdPlacesByPredictionUseCase (Application Layer)
 *
 * Caso de uso para obtener los 8 mejores terceros lugares de una predicción.
 *
 * Contexto:
 * - Cuando un usuario completa los 12 grupos, el backend calcula los 8 mejores terceros
 * - Este use case permite consultar esos terceros posteriormente
 * - Se usa en el GET /predictions/league/:leagueId para mostrar clasificados a R32
 *
 * Flujo:
 * 1. Consulta best_third_places_predictions por predictionId
 * 2. Retorna array vacío si no se han completado los grupos (< 12)
 * 3. Retorna los 8 mejores terceros ordenados por ranking_position (1-8)
 *
 * Casos de uso:
 * - Usuario accede a predicciones después de completar 12 grupos
 * - Frontend necesita mostrar los 32 clasificados a eliminatorias
 * - Frontend habilita la fase de eliminatorias basándose en estos datos
 */
@Injectable()
export class GetBestThirdPlacesByPredictionUseCase {
  constructor(
    @Inject('IBestThirdPlacePredictionRepository')
    private readonly bestThirdPlacePredictionRepository: IBestThirdPlacePredictionRepository,
  ) {}

  /**
   * Obtiene los 8 mejores terceros lugares de una predicción
   *
   * @param predictionId - UUID de la predicción
   * @returns Array de 8 mejores terceros (vacío si no se completaron los grupos)
   */
  async execute(predictionId: string): Promise<BestThirdPlacePrediction[]> {
    return await this.bestThirdPlacePredictionRepository.findByPrediction(
      predictionId,
    );
  }
}
