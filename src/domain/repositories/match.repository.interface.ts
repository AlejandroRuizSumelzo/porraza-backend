import type { Match } from '@domain/entities/match.entity';

export interface IMatchRepository {
  findAll(): Promise<Match[]>;
  findById(id: string): Promise<Match | null>;
}
