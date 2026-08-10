import { Injectable } from '@nestjs/common';
import { Prisma } from '@udos/database';
import { AppUser, CreateUserData, UserRepository } from '../application/ports/user.repository.port';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  async findByKeycloakSubjectId(
    keycloakSubjectId: string,
    tx: Prisma.TransactionClient,
  ): Promise<AppUser | null> {
    const user = await tx.user.findUnique({ where: { keycloakSubjectId } });
    if (!user) return null;
    return { id: user.id, tenantId: user.tenantId, keycloakSubjectId: user.keycloakSubjectId };
  }

  async create(data: CreateUserData, tx: Prisma.TransactionClient): Promise<AppUser> {
    const user = await tx.user.create({
      data: {
        tenantId: data.tenantId,
        keycloakSubjectId: data.keycloakSubjectId,
        email: data.email,
        fullName: data.fullName,
      },
    });
    return { id: user.id, tenantId: user.tenantId, keycloakSubjectId: user.keycloakSubjectId };
  }
}
