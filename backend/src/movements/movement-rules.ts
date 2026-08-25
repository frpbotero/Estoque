import { AssetStatus, MovementType } from '@prisma/client';

/**
 * Máquina de estados do ativo.
 *
 * Uma movimentação só é aceita se o status atual do ativo estiver na lista
 * `from` do tipo de movimentação. Isso impede coisas como entregar um
 * equipamento que já está com outra pessoa ou devolver algo que nunca saiu.
 */
export const MOVEMENT_RULES: Record<
  MovementType,
  { from: AssetStatus[]; allowedDestinations: AssetStatus[]; label: string }
> = {
  PURCHASE_ENTRY: {
    from: [],
    allowedDestinations: [AssetStatus.AVAILABLE],
    label: 'Entrada por compra',
  },
  ASSIGNMENT: {
    from: [AssetStatus.AVAILABLE, AssetStatus.RESERVED],
    allowedDestinations: [AssetStatus.ASSIGNED],
    label: 'Entrega ao colaborador',
  },
  RETURN: {
    from: [AssetStatus.ASSIGNED],
    allowedDestinations: [AssetStatus.AVAILABLE, AssetStatus.MAINTENANCE, AssetStatus.DISPOSED],
    label: 'Devolução',
  },
  MAINTENANCE: {
    from: [AssetStatus.AVAILABLE, AssetStatus.ASSIGNED, AssetStatus.RESERVED],
    allowedDestinations: [AssetStatus.MAINTENANCE],
    label: 'Envio para manutenção',
  },
  MAINTENANCE_RETURN: {
    from: [AssetStatus.MAINTENANCE],
    allowedDestinations: [AssetStatus.AVAILABLE, AssetStatus.RETIRED, AssetStatus.DISPOSED],
    label: 'Retorno de manutenção',
  },
  RETIREMENT: {
    from: [
      AssetStatus.AVAILABLE,
      AssetStatus.ASSIGNED,
      AssetStatus.MAINTENANCE,
      AssetStatus.RESERVED,
    ],
    allowedDestinations: [AssetStatus.RETIRED],
    label: 'Retirada de operação',
  },
  DISPOSAL: {
    from: [AssetStatus.AVAILABLE, AssetStatus.MAINTENANCE, AssetStatus.RETIRED],
    allowedDestinations: [AssetStatus.DISPOSED],
    label: 'Descarte',
  },
};

/** Estados terminais: nada mais acontece com o ativo depois disso. */
export const TERMINAL_STATUSES: AssetStatus[] = [AssetStatus.DISPOSED];

export const STATUS_LABELS: Record<AssetStatus, string> = {
  AVAILABLE: 'Disponível',
  ASSIGNED: 'Em uso',
  MAINTENANCE: 'Em manutenção',
  RESERVED: 'Reservado',
  RETIRED: 'Retirado de operação',
  DISPOSED: 'Descartado',
};
