import { Prisma } from '@udos/database';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface AppUser {
  id: string;
  tenantId: string | null;
  keycloakSubjectId: string;
}

export interface CreateUserData {
  tenantId: string;
  keycloakSubjectId: string;
  email: string;
  fullName: string;
}

export interface UserRepository {
  findByKeycloakSubjectId(
    keycloakSubjectId: string,
    tx: Prisma.TransactionClient,
  ): Promise<AppUser | null>;
  create(data: CreateUserData, tx: Prisma.TransactionClient): Promise<AppUser>;
}
