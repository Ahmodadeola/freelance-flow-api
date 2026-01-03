import { PrismaService } from "src/prisma/prisma.service"
import { faker } from '@faker-js/faker'

import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { SignupDto } from "../dto/signup.dto";
import { LoginDto } from "../dto/login.dto";
import { AccountStatus, Role, User } from "generated/prisma/client";
import RefreshTokensDto from "../dto/refresh-tokens.dto";
import { Cache } from "@nestjs/cache-manager";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PasswordResetDto } from "../dto/password-reset.dto";
import { createRandomAuthUser, randomSignupDto, setupTestingModule } from "test/test_utils";

let prismaService: PrismaService;
let authService: AuthService;
let jwtService: JwtService;
let configService: ConfigService;
let signupDto: SignupDto;
let cacheManager: Cache


beforeAll(async () => {
    const ctx = await setupTestingModule()

    prismaService = ctx.prismaService
    authService = ctx.authService
    jwtService = ctx.jwtService
    configService = ctx.configService
    cacheManager = ctx.cacheManager
    await prismaService.flush()
})

beforeEach(() => {
    signupDto = randomSignupDto()
})

describe("Registering a new user", () => {
    test("with valid details", async () => {
        const user = await authService.signup(signupDto)
        expect(user.status).toBe(AccountStatus.ACTIVE)
        expect(user.verified).toBe(false)
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
        user = await createRandomAuthUser(authService, signupDto)
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
        // Generate expired tokens
        const payload = { sub: user.id, email: user.email, role: Role.FREELANCER };
        const accessToken = jwtService.sign(payload);
        const refreshToken = jwtService.sign(payload, { secret: configService.get('jwt.refreshTokenSecret'), expiresIn: '-1h' });
        const tokens = { accessToken, refreshToken }

        // add tokens to cache 
        await cacheManager.set(payload.sub, tokens, 1000 * configService.get<number>('jwt.refreshTokenExpiresIn')!);
        await expect(authService.refreshTokens(tokens)).rejects.toThrow(new UnauthorizedException("Token has expired"))
    });


    test("with an already rotated token", async () => {
        const result = await authService.refreshTokens(refreshTokenDto)
        expect(result).toBeTruthy()

        await expect(authService.refreshTokens(refreshTokenDto)).rejects.toThrow(UnauthorizedException)
    })

    test("with mismatching tokens", async () => {
        const result = await authService.refreshTokens(refreshTokenDto)
        expect(result).toBeTruthy()
        await expect(authService.refreshTokens({ ...refreshTokenDto, refreshToken: result?.refreshToken! })).rejects.toThrow(UnauthorizedException)
    })

    test("with cross user tokens", async () => {
        const newUserSignupDto = randomSignupDto()
        const user2 = await authService.signup(newUserSignupDto)
        const loginResult = await authService.login({ email: user2.email, password: newUserSignupDto.password })

        await expect(authService.refreshTokens({ ...refreshTokenDto, refreshToken: loginResult?.tokens.refreshToken! })).rejects.toThrow(UnauthorizedException)
    })

    test("with a malformed token", async () => {
        await expect(authService.refreshTokens({ ...refreshTokenDto, refreshToken: faker.string.alphanumeric(20) })).rejects.toThrow(UnauthorizedException)
    })
})

describe("Resetting user password", () => {
    let passwordResetDto: PasswordResetDto;
    let user: User;

    beforeEach(async () => {
        user = await createRandomAuthUser(authService, signupDto)
    })

    test("for a non-existing user", async () => {
        passwordResetDto = { oldPassword: faker.internet.password(), newPassword: faker.internet.password() }
        await expect(authService.resetPassword(passwordResetDto, faker.string.uuid())).rejects.toThrow(new NotFoundException("User not found!"))
    })

    test("for an existing user", async () => {
        const newPassword = faker.internet.password()
        passwordResetDto = { oldPassword: signupDto.password, newPassword }
        const resetResult = await authService.resetPassword(passwordResetDto, user.id)

        expect(resetResult).toHaveProperty('message', 'Password reset successful')

        const loginResult = await authService.login({ email: user.email, password: newPassword })
        expect(loginResult).toHaveProperty('tokens')
        expect(loginResult).toHaveProperty('user.email', user.email)
    })

    test("with an incorrect old password", async () => {
        const newPassword = faker.internet.password()
        passwordResetDto = { oldPassword: faker.internet.password(), newPassword }

        await expect(authService.resetPassword(passwordResetDto, user.id)).rejects.toThrow(new BadRequestException("Old password is incorrect!"))
    })

    test("when old password equals new password", async () => {
        passwordResetDto = { oldPassword: signupDto.password, newPassword: signupDto.password }
        await expect(authService.resetPassword(passwordResetDto, user.id)).rejects.toThrow(new BadRequestException("Old and nwew password cannot be the same!"))
    })
})

describe("User logout", () => {
    let user: User;
    beforeEach(async () => {
        user = await createRandomAuthUser(authService, signupDto)
    })

    test("when user is logged in", async () => {
        await authService.login({ email: user.email, password: signupDto.password })

        const logoutResult = await authService.logout(user.id)
        expect(logoutResult).toHaveProperty("message", 'Logged out successfully')

        expect(await cacheManager.get(user.id)).toBeUndefined()
    })

    test("when user isn't logged in", async () => {
        const logoutResult = await authService.logout(user.id)
        expect(logoutResult).toHaveProperty("message", 'Logged out successfully')

        expect(await cacheManager.get(user.id)).toBeUndefined()

    })
})

afterAll(async () => {
    await prismaService.flush()
});