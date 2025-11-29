import { CreatePlayDto, PlayResponseDto, GetPlayDto } from '../../application/dtos/play.dto';

export interface PlaysPort {
  createPlay(dto: CreatePlayDto): Promise<PlayResponseDto>;
  getPlayById(playId: string): Promise<GetPlayDto>;
  getPlaysByUserId(userId: string, limit?: number, offset?: number): Promise<GetPlayDto[]>;
}

export const PLAYS_PORT = Symbol('PlaysPort');
