import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  static hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });

    // Mensagem genérica de propósito: não revelar se o e-mail existe.
    if (!user || !user.active || user.deletedAt) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokens = await this.issueTokens(user);

    return {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: { sub: string; jti: string };

    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    const hash = AuthService.digest(refreshToken);

    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.tokenHash !== hash) {
      throw new UnauthorizedException('Sessão expirada, faça login novamente');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.active || user.deletedAt) {
      throw new UnauthorizedException('Usuário inativo');
    }

    // Rotação: o token usado é invalidado no mesmo instante.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash: AuthService.digest(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return;
    }

    // Sem token informado, encerra todas as sessões do usuário.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!(await argon2.verify(user.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await AuthService.hashPassword(dto.newPassword) },
    });

    await this.logout(userId);
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const jti = randomBytes(16).toString('hex');

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn') as JwtSignOptions['expiresIn'],
      },
    );

    const refreshExpiresIn = this.config.get<string>('jwt.refreshExpiresIn')!;
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresIn as JwtSignOptions['expiresIn'],
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId: user.id,
        tokenHash: AuthService.digest(refreshToken),
        expiresAt: new Date(Date.now() + AuthService.durationToMs(refreshExpiresIn)),
      },
    });

    return { accessToken, refreshToken };
  }

  private static digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private static durationToMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration.trim());
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }
    const value = Number(match[1]);
    const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]]!;
    return value * unit;
  }
}
