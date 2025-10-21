import type { Team } from '@domain/entities/team.entity';

export interface ITeamRepository {
  findAll(): Promise<Team[]>;
  findById(id: string): Promise<Team | null>;
}
