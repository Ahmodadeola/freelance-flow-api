import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Cache } from 'cache-manager';
import { Request } from 'express';
import { handleJWTTokenError } from 'src/common/helper';
import { AuthTokens, ReqUser } from './auth.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      return false;
    }

    try {
      const payload: ReqUser = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.accessTokenSecret'),
      });
      const cachedTokens = await this.cacheManager.get<AuthTokens>(payload.sub);

      if (!cachedTokens || cachedTokens.accessToken !== token) {
        throw new UnauthorizedException('Invalid access token');
      }

      request.user = payload;
      return true;
    } catch (error) {
      handleJWTTokenError(error);
      return false;
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
