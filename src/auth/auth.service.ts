import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { hash, verify } from 'argon2';
import { LoginDto } from './dto/login.dto';
import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import RefreshTokensDto from './dto/refresh-tokens.dto';
import { handleJWTTokenError } from 'src/common/helper';

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService, private jwtService: JwtService, private readonly configService: ConfigService) { }

    async signup(createUserDto: CreateUserDto) {
        const newUser = await this.prisma.$transaction(async tx => {
            const { password, ...userData } = createUserDto
            const user = await tx.user.create({ data: userData })

            const hashedPassword = await hash(password)
            await tx.auth.create({ data: { userId: user.id, email: createUserDto.email, password: hashedPassword } })
            return user
        })


        return newUser
    }

    async login(loginDto: LoginDto) {
        const auth = await this.prisma.auth.findUnique({
            where: { email: loginDto.email },
            include: { user: true }
        });

        if (!auth || !(await verify(auth.password, loginDto.password))) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = await this.generateTokens(auth.userId, auth.email, auth.user.role);
        return { tokens, user: auth.user };
    }


    async refreshTokens(refreshTokensDto: RefreshTokensDto) {
        try {
            const refreshPayload = this.jwtService.verify(refreshTokensDto.refreshToken, { secret: this.configService.get('REFRESH_TOKEN_SECRET') });
            const tokens = await this.generateTokens(refreshPayload.sub, refreshPayload.email, refreshPayload.role);

            return tokens
        } catch (error) {
            handleJWTTokenError(error);
        }
    }

    async profile(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
        });
    }

    private async generateTokens(userId: string, email: string, role: string) {
        const payload = { sub: userId, email, role };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '20s' });
        const refreshToken = this.jwtService.sign(payload, { secret: this.configService.get('REFRESH_TOKEN_SECRET'), expiresIn: '7d' });

        return { accessToken, refreshToken };
    }
}
