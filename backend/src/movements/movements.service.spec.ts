import { BadRequestException, ConflictException } from '@nestjs/common';
import { AssetStatus, MovementType } from '@prisma/client';
import { MovementsService } from './movements.service';

/**
 * A máquina de estados é a regra de negócio mais crítica do sistema:
 * é ela que impede entregar um equipamento que já está com alguém ou
 * devolver algo que nunca saiu do estoque.
 */
describe('MovementsService — máquina de estados', () => {
  const service = new MovementsService({} as never);
  const assertTransition = (service as never as {
    assertTransition: (asset: unknown, type: MovementType, destination?: AssetStatus) => void;
  }).assertTransition.bind(service);

  const asset = (status: AssetStatus) => ({ status, condition: 'GOOD' });

  it('permite entregar um equipamento disponível', () => {
    expect(() => assertTransition(asset(AssetStatus.AVAILABLE), MovementType.ASSIGNMENT)).not.toThrow();
  });

  it('bloqueia entregar um equipamento que já está em uso', () => {
    expect(() => assertTransition(asset(AssetStatus.ASSIGNED), MovementType.ASSIGNMENT)).toThrow(
      ConflictException,
    );
  });

  it('bloqueia devolver um equipamento que está no estoque', () => {
    expect(() => assertTransition(asset(AssetStatus.AVAILABLE), MovementType.RETURN)).toThrow(
      ConflictException,
    );
  });

  it('aceita devolução com destino manutenção', () => {
    expect(() =>
      assertTransition(asset(AssetStatus.ASSIGNED), MovementType.RETURN, AssetStatus.MAINTENANCE),
    ).not.toThrow();
  });

  it('recusa destino inválido para devolução', () => {
    expect(() =>
      assertTransition(asset(AssetStatus.ASSIGNED), MovementType.RETURN, AssetStatus.RESERVED),
    ).toThrow(BadRequestException);
  });

  it('só aceita retorno de manutenção para quem está em manutenção', () => {
    expect(() =>
      assertTransition(asset(AssetStatus.AVAILABLE), MovementType.MAINTENANCE_RETURN),
    ).toThrow(ConflictException);
    expect(() =>
      assertTransition(asset(AssetStatus.MAINTENANCE), MovementType.MAINTENANCE_RETURN),
    ).not.toThrow();
  });

  it('não movimenta equipamento já descartado', () => {
    for (const type of [MovementType.ASSIGNMENT, MovementType.RETURN, MovementType.MAINTENANCE]) {
      expect(() => assertTransition(asset(AssetStatus.DISPOSED), type)).toThrow(ConflictException);
    }
  });
});
