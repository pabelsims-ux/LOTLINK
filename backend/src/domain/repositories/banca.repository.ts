import { Banca } from '../entities/banca.entity';

export interface BancaRepository {
  save(banca: Banca): Promise<Banca>;
  findById(id: string): Promise<Banca | null>;
  findByName(name: string): Promise<Banca | null>;
  findAll(activeOnly?: boolean): Promise<Banca[]>;
  update(banca: Banca): Promise<Banca>;
}

export const BANCA_REPOSITORY = Symbol('BancaRepository');
