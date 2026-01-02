import { Test } from "@nestjs/testing"
import { AppModule } from "src/app.module"
import { PrismaService } from "src/prisma/prisma.service"
import { faker } from '@faker-js/faker'

import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { SignupDto } from "../dto/signup.dto";
import { LoginDto } from "../dto/login.dto";
import { Role, User } from "generated/prisma/client";
import RefreshTokensDto from "../dto/refresh-tokens.dto";
import { Cache } from "@nestjs/cache-manager";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

let prismaService: PrismaService;
let authService: AuthService;
let jwtService: JwtService;
let configService: ConfigService;
let signupDto: SignupDto;
let cacheManager: Cache

const randomSignupDto = () => ({
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    password: faker.internet.password()
})

beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule]
    }).compile()

    prismaService = moduleRef.get(PrismaService)
    authService = moduleRef.get(AuthService)
    jwtService = moduleRef.get(JwtService)
    configService = moduleRef.get(ConfigService)
    cacheManager = moduleRef.get(Cache)
    await prismaService.flush()
})

beforeEach(() => {
    signupDto = randomSignupDto()
})

describe("Registering a new user", () => {
    test("with valid details", async () => {
        const user = await authService.signup(signupDto)
        expect(user.role).toBe(Role.FREELANCER)
        Object.entries(signupDto).forEach(([key, value]) => {
            if (key !== "password") expect(value).toBe(user[key])
        })

        const userAuth = await prismaService.auth.findUnique({ where: { userId: user.id } })
        expect(userAuth?.email).toBe(user.email)
    })

    test("with a duplicate email", async () => {
        const user = await authService.signup(signupDto);
        expect(user.email).toBe(signupDto.email)
        try {
            await authService.signup(signupDto)
        } catch (error) {
            expect(error).toBeInstanceOf(ConflictException)
        }
    })
})

describe("User login", () => {
    let loginDto: LoginDto;
    let user: User

    beforeEach(async () => {
        user = await authService.signup(signupDto);
        loginDto = {
            email: user.email,
            password: signupDto.password
        }
    })

    test("with valid credentials", async () => {
        const result = await authService.login(loginDto)
        expect(result).toHaveProperty('tokens')
        expect(result).toHaveProperty('user')
        expect(result.user.email).toBe(user.email)
    })

    test("with invalid credentials", async () => {
        try {
            await authService.login({ email: user.email, password: "wrong" })
        } catch (error) {
            expect(error).toBeInstanceOf(UnauthorizedException)
        }

    })
})

describe("Tokens refresh", () => {
    let refreshTokenDto: RefreshTokensDto;
    let user: User;

    beforeEach(async () => {
        user = await authService.signup(signupDto);
        const loginResult = await authService.login({ email: user.email, password: signupDto.password })
        refreshTokenDto = loginResult.tokens
    })

    test("with valid tokens", async () => {
        const result = await authService.refreshTokens(refreshTokenDto)
        expect(result).toHaveProperty('accessToken')
        expect(result).toHaveProperty('refreshToken')
    })

    test("with an expired refresh token", async () => {
        expect(refreshTokenDto).toBeTruthy()

        // Simulate token expiration by deleting the cached token
        await cacheManager.del(user.id)

        try {
            await authService.refreshTokens(refreshTokenDto)
        } catch (error) {
            expect(error).toBeInstanceOf(UnauthorizedException)
            expect(error.message).toBe('Invalid tokens')
        }
    })

    test("with an expired refresh token", async () => {
        // Generate expired tokens
        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = jwtService.sign(payload);
        const refreshToken = jwtService.sign(payload, { secret: configService.get('jwt.refreshTokenSecret'), expiresIn: '-1h' });
        const tokens = { accessToken, refreshToken }

        // add tokens to cache 
        await cacheManager.set(payload.sub, tokens, 1000 * configService.get<number>('jwt.refreshTokenExpiresIn')!);

        try {
            await authService.refreshTokens(tokens)
        } catch (error) {
            expect(error).toBeInstanceOf(UnauthorizedException)
        }
    });


    test("with an already rotated token", async () => {
        const result = await authService.refreshTokens(refreshTokenDto)
        expect(result).toBeTruthy()
        try {
            await authService.refreshTokens(refreshTokenDto)
        } catch (error) {
            expect(error).toBeInstanceOf(UnauthorizedException)
        }
    })

    test("with mismatching tokens", async () => {
        const result = await authService.refreshTokens(refreshTokenDto)
        expect(result).toBeTruthy()
        try {
            await authService.refreshTokens({ ...refreshTokenDto, refreshToken: result?.refreshToken! })
        } catch (error) {
            expect(error).toBeInstanceOf(UnauthorizedException)
            expect(error.message).toBe('Invalid tokens')
        }
    })

    test("with cross user tokens", async () => {
        const newUserSignupDto = randomSignupDto()
        const user2 = await authService.signup(newUserSignupDto)
        const loginResult = await authService.login({ email: user2.email, password: newUserSignupDto.password })

        try {
            await authService.refreshTokens({ ...refreshTokenDto, refreshToken: loginResult?.tokens.refreshToken! })
        } catch (error) {
            expect(error).toBeInstanceOf(UnauthorizedException)
        }
    })

    test("with a malformed token", async () => {
        try {
            await authService.refreshTokens({ ...refreshTokenDto, refreshToken: faker.string.alphanumeric(20) })
        } catch (error) {
            expect(error).toBeInstanceOf(UnauthorizedException)
            expect(error.message).toBe('Invalid token')
        }
    })
})