import { Play } from '../entities/play.entity';

export interface PlayRepository {
  save(play: Play): Promise<Play>;
  findById(id: string): Promise<Play | null>;
  findByRequestId(requestId: string): Promise<Play | null>;
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Play[]>;
  update(play: Play): Promise<Play>;
}

export const PLAY_REPOSITORY = Symbol('PlayRepository');
