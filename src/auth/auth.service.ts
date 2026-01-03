import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { hash, verify } from 'argon2';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import RefreshTokensDto from './dto/refresh-tokens.dto';
import { handleJWTTokenError } from 'src/common/helper';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AuthTokens } from './auth.interface';
import { PasswordResetDto } from './dto/password-reset.dto';
import { Auth, Role } from 'generated/prisma/client';
import { SignupDto } from './dto/signup.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService, private jwtService: JwtService, private readonly configService: ConfigService, @Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    async signup(signupDto: SignupDto) {

        // use prisma transaction to create a user and an auth object
        try {
            return await this.prisma.$transaction(async tx => {
                const { password, ...userData } = signupDto
                const user = await tx.user.create({ data: userData })

                const hashedPassword = await hash(password)
                await tx.auth.create({ data: { userId: user.id, email: signupDto.email, password: hashedPassword } })
                return user
            })
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException('User with this email already exists');
            }
            throw error;
        }
    }

    async login(loginDto: LoginDto) {
        const auth = await this.prisma.auth.findUnique({
            where: { email: loginDto.email },
            include: { user: true }
        });

        if (!auth || !(await verify(auth.password, loginDto.password))) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = await this.generateTokens(auth.userId, auth.email, Role.FREELANCER);
        await this.cacheManager.set(auth.userId, tokens, 1000 * this.configService.get<number>('jwt.refreshTokenExpiresIn')!);
        await this.prisma.auth.update({ where: { id: auth.id }, data: { lastLoginAt: new Date() } })
        return { tokens, user: auth.user };
    }


    async refreshTokens(refreshTokensDto: RefreshTokensDto) {
        try {
            const refreshPayload = this.jwtService.verify(refreshTokensDto.refreshToken, { secret: this.configService.get<string>('jwt.refreshTokenSecret') });

            const cachedTokens = await this.cacheManager.get<AuthTokens>(refreshPayload.sub);
            const isTokenMatch = cachedTokens?.refreshToken === refreshTokensDto.refreshToken && cachedTokens?.accessToken === refreshTokensDto.accessToken;
            if (!cachedTokens || !isTokenMatch) {
                throw new UnauthorizedException('Invalid tokens');
            }
            const tokens = await this.generateTokens(refreshPayload.sub, refreshPayload.email, refreshPayload.role);
            await this.cacheManager.set(refreshPayload.sub, tokens, 1000 * this.configService.get<number>('jwt.refreshTokenExpiresIn')!);

            return tokens
        } catch (error) {
            handleJWTTokenError(error);
        }
    }

    async resetPassword(passwordResetDto: PasswordResetDto, userId: string) {
        const { oldPassword, newPassword } = passwordResetDto
        if (oldPassword === newPassword) throw new BadRequestException("Old and nwew password cannot be the same!")
        const auth: Auth | null = await this.prisma.auth.findUnique({
            where: { userId }
        });
        if (!auth) throw new NotFoundException('User not found!')

        const oldPasswordMatch = await verify(auth.password, oldPassword)
        if (!oldPasswordMatch) throw new BadRequestException("Old password is incorrect!")

        const hashedPassword = await hash(newPassword)
        await this.prisma.auth.update({
            where: { userId },
            data: {
                password: hashedPassword
            }
        })
        return { message: 'Password reset successful' }
    }

    async logout(userId: string) {
        await this.cacheManager.del(userId);
        return { message: 'Logged out successfully' };
    }

    async profile(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
        });
    }

    private async generateTokens(userId: string, email: string, role: string) {
        const payload = { sub: userId, email, role, iat: Math.floor(Date.now()), jti: randomUUID() };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { secret: this.configService.get('jwt.refreshTokenSecret'), expiresIn: '7d' });

        return { accessToken, refreshToken };
    }
}
