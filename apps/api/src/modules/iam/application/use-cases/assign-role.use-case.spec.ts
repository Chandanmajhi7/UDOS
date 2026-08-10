import { Prisma } from '@udos/database';
import { DomainEventPublisher } from '../../../../platform/events/domain-event-publisher.port';
import { TransactionRunner } from '../../../../platform/persistence/transaction-runner.port';
import { UserRoleAssignmentRepository } from '../ports/user-role-assignment.repository.port';
import { AssignRoleUseCase } from './assign-role.use-case';

describe('AssignRoleUseCase', () => {
  const fakeTx = {} as Prisma.TransactionClient;

  function buildUseCase() {
    // A fake transaction runner that just invokes the callback with a stand-in tx —
    // enough to prove AssignRoleUseCase does the write and the publish inside the
    // SAME transaction handle, without needing a real database for this unit test.
    const txRunner: TransactionRunner = {
      run: jest.fn((_tenantId, work) => work(fakeTx)),
    };
    const assignments: UserRoleAssignmentRepository = {
      findForUser: jest.fn(),
      assign: jest.fn().mockResolvedValue(undefined),
    };
    const events: DomainEventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    return {
      useCase: new AssignRoleUseCase(txRunner, assignments, events),
      txRunner,
      assignments,
      events,
    };
  }

  it('assigns the role and publishes RoleAssignedEvent within the same transaction', async () => {
    const { useCase, assignments, events } = buildUseCase();

    await useCase.execute({
      tenantId: 'tenant-1',
      userId: 'user-1',
      roleId: 'role-teacher',
      scope: { departmentId: 'dept-cs' },
    });

    expect(assignments.assign).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
      'role-teacher',
      { departmentId: 'dept-cs' },
      fakeTx,
    );
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'iam.role_assigned',
        tenantId: 'tenant-1',
        userId: 'user-1',
        roleId: 'role-teacher',
      }),
      fakeTx,
    );
  });

  it('defaults to an unscoped assignment when no scope is given', async () => {
    const { useCase, assignments } = buildUseCase();

    await useCase.execute({ tenantId: 'tenant-1', userId: 'user-1', roleId: 'role-registrar' });

    expect(assignments.assign).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
      'role-registrar',
      {},
      fakeTx,
    );
  });
});
