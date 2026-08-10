import { Prisma } from '@udos/database';
import { TransactionRunner } from '../../../../platform/persistence/transaction-runner.port';
import { AppUser, UserRepository } from '../ports/user.repository.port';
import { ResolveOrProvisionUserUseCase } from './resolve-or-provision-user.use-case';

describe('ResolveOrProvisionUserUseCase', () => {
  const fakeTx = {} as Prisma.TransactionClient;
  const input = {
    keycloakSubjectId: 'kc-sub-1',
    tenantId: 'tenant-1',
    email: 'a@example.com',
    fullName: 'A User',
  };

  function buildUseCase(existing: AppUser | null) {
    const txRunner: TransactionRunner = { run: jest.fn((_tenantId, work) => work(fakeTx)) };
    const users: UserRepository = {
      findByKeycloakSubjectId: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockResolvedValue({
        id: 'new-user-id',
        tenantId: input.tenantId,
        keycloakSubjectId: input.keycloakSubjectId,
      }),
    };
    return { useCase: new ResolveOrProvisionUserUseCase(txRunner, users), users };
  }

  it('returns the existing user without creating a new one', async () => {
    const existing: AppUser = { id: 'existing-id', tenantId: 'tenant-1', keycloakSubjectId: 'kc-sub-1' };
    const { useCase, users } = buildUseCase(existing);

    const result = await useCase.execute(input);

    expect(result).toBe(existing);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('provisions a new user scoped to the tenant when none exists', async () => {
    const { useCase, users } = buildUseCase(null);

    const result = await useCase.execute(input);

    expect(users.create).toHaveBeenCalledWith(
      {
        tenantId: 'tenant-1',
        keycloakSubjectId: 'kc-sub-1',
        email: 'a@example.com',
        fullName: 'A User',
      },
      fakeTx,
    );
    expect(result.id).toBe('new-user-id');
  });
});
