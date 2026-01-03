import { faker } from "@faker-js/faker"
import { SignupDto } from "../dto/signup.dto";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { App } from "supertest/types";
import request from 'supertest';
import { Role } from "generated/prisma/enums";
import { AuthService } from "../auth.service";
import { LoginDto } from "../dto/login.dto";
import { User } from "generated/prisma/client";
import RefreshTokensDto from "../dto/refresh-tokens.dto";
import { Cache } from "@nestjs/cache-manager";
import { PasswordResetDto } from "../dto/password-reset.dto";
import { createRandomAuthUser, randomSignupDto, setupTestingModule } from "test/test_utils";
import { PrismaService } from "src/prisma/prisma.service";

const randomPassword = () => `_${faker.string.alphanumeric(10)}1`

let authService: AuthService;
let prismaService: PrismaService;
let signupDto: SignupDto;
let app: INestApplication<App>;
let cacheManager: Cache

beforeEach(() => {
    signupDto = randomSignupDto()
})

beforeAll(async () => {
    const ctx = await setupTestingModule()

    authService = ctx.authService;
    cacheManager = ctx.cacheManager;
    prismaService = ctx.prismaService

    app = ctx.moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
    }));
    await app.init();
});

describe("Registering a new user", () => {
    test("with valid data", async () => {
        return request(app.getHttpServer())
            .post('/auth/signup')
            .send(signupDto)
            .expect(201)
            .then(({ body: { data: user } }) => {
                expect(user.role).toBe(Role.FREELANCER)
                Object.entries(signupDto).forEach(([key, value]) => {
                    if (key !== "password") expect(value).toBe(user[key])
                })
            })
    })

    test("with a duplicate email", async () => {
        await authService.signup(signupDto);
        return request(app.getHttpServer())
            .post('/auth/signup')
            .send(signupDto)
            .expect(409)
            .then(({ body }) => {
                expect(body.error).toBe("Conflict")
            })
    })

    test("with a weak password", async () => {
        return request(app.getHttpServer())
            .post('/auth/signup')
            .send({ ...signupDto, password: "weak" })
            .expect(400)
            .then(({ body }) => {
                expect(body.error).toBe("Bad Request")
            })
    })

    test("with an invalid email", async () => {
        return request(app.getHttpServer())
            .post('/auth/signup')
            .send({ ...signupDto, email: "email" })
            .expect(400)
            .then(({ body }) => {
                expect(body.error).toBe("Bad Request")
            })
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
        return request(app.getHttpServer())
            .post('/auth/login')
            .send(loginDto)
            .expect(200)
            .then(({ body: { data: { user, tokens } } }) => {
                expect(user.role).toBe(Role.FREELANCER)
                expect(tokens).toHaveProperty('accessToken')
                expect(tokens).toHaveProperty('refreshToken')
            })
    })

    test("with incorrect password", async () => {
        return request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: user.email, password: "_Wrong_pass1" })
            .expect(401)
            .then(({ body }) => {
                expect(body.error).toBe("Unauthorized")
                expect(body.message).toBe("Invalid credentials")
            })
    })

    test("with an invalid email", async () => {
        return request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: faker.string.alpha(10), password: loginDto.password })
            .expect(400)
            .then(({ body: { message, error } }) => {
                const errMessage = 'email must be an email'
                expect(message[0]).toContain(errMessage)
                expect(error).toBe("Bad Request")
            })
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
        return request(app.getHttpServer())
            .post('/auth/tokens-refresh')
            .send(refreshTokenDto)
            .expect(200)
            .then(({ body: { data: { accessToken, refreshToken } } }) => {
                expect(accessToken).not.toBe(refreshTokenDto.accessToken)
                expect(refreshToken).not.toBe(refreshTokenDto.refreshToken)
            })
    })

    test("after refresh token TTL", async () => {
        expect(refreshTokenDto).toBeTruthy()

        // Simulate token expiration by deleting the cached token
        await cacheManager.del(user.id)

        return request(app.getHttpServer())
            .post('/auth/tokens-refresh')
            .send(refreshTokenDto)
            .expect(401)
            .then(({ body: { error, message } }) => {
                expect(error).toBe("Unauthorized")
                expect(message).toBe("Invalid tokens")
            })
    })

    test("with an already rotated token", async () => {
        const result = await authService.refreshTokens(refreshTokenDto)
        expect(result).toBeTruthy()

        return request(app.getHttpServer())
            .post('/auth/tokens-refresh')
            .send(refreshTokenDto)
            .expect(401)
            .then(({ body: { error, message } }) => {
                expect(error).toBe("Unauthorized")
                expect(message).toBe("Invalid tokens")
            })
    })

    test("with mismatching tokens", async () => {
        const result = await authService.refreshTokens(refreshTokenDto)
        expect(result).toBeTruthy()

        return request(app.getHttpServer())
            .post('/auth/tokens-refresh')
            .send({ ...refreshTokenDto, refreshToken: result?.refreshToken! })
            .expect(401)
            .then(({ body: { error, message } }) => {
                expect(error).toBe("Unauthorized")
                expect(message).toBe("Invalid tokens")
            })

    })

    test("with cross user tokens", async () => {
        const newUserSignupDto = randomSignupDto()
        const user2 = await authService.signup(newUserSignupDto)
        const loginResult = await authService.login({ email: user2.email, password: newUserSignupDto.password })

        return request(app.getHttpServer())
            .post('/auth/tokens-refresh')
            .send({ ...refreshTokenDto, refreshToken: loginResult?.tokens.refreshToken! })
            .expect(401)
            .then(({ body: { error, message } }) => {
                expect(error).toBe("Unauthorized")
                expect(message).toBe("Invalid tokens")
            })
    })

    test("with a malformed token", async () => {
        return request(app.getHttpServer())
            .post('/auth/tokens-refresh')
            .send({ ...refreshTokenDto, refreshToken: faker.string.alphanumeric(20) })
            .expect(400)
            .then(({ body: { error, message } }) => {
                expect(error).toBe("Bad Request")
                expect(message[0]).toBe("refreshToken must be a jwt string")
            })
    })
})

describe("Resetting password", () => {
    let passwordResetDto: PasswordResetDto;
    let user: User;
    let accessToken: string;

    beforeEach(async () => {
        user = await createRandomAuthUser(authService, signupDto)
        const loginResult = await authService.login({ email: user.email, password: signupDto.password })
        accessToken = loginResult.tokens.accessToken
    })

    test("for an existing user", async () => {
        const newPassword = randomPassword()
        passwordResetDto = { oldPassword: signupDto.password, newPassword }

        // reset the password
        const res = await request(app.getHttpServer())
            .patch('/auth/password-reset')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(passwordResetDto)
            .expect(200)

        expect(res.body.message).toBe("Password reset successful")


        // attempt login with new password
        return request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: user.email, password: newPassword })
            .expect(200)
    })

    test("with an incorrect old password", async () => {
        const newPassword = randomPassword()
        passwordResetDto = { oldPassword: randomPassword(), newPassword }

        return request(app.getHttpServer())
            .patch('/auth/password-reset')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(passwordResetDto)
            .expect(400)
            .then(({ body: { error, message } }) => {
                expect(error).toBe("Bad Request")
                expect(message).toBe("Old password is incorrect!")
            })
    })

    test("when old password equals new password", async () => {
        passwordResetDto = { oldPassword: signupDto.password, newPassword: signupDto.password }
        return request(app.getHttpServer())
            .patch('/auth/password-reset')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(passwordResetDto)
            .expect(400)
            .then(({ body: { error, message } }) => {
                expect(error).toBe("Bad Request")
                expect(message).toBe("Old and nwew password cannot be the same!")
            })
    })
})

describe("User logout", () => {
    let user: User;
    beforeEach(async () => {
        user = await createRandomAuthUser(authService, signupDto)
    })

    test("succeeds", async () => {
        const { tokens: { accessToken } } = await authService.login({ email: user.email, password: signupDto.password })

        return request(app.getHttpServer())
            .post('/auth/logout')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .then(({ body: { message } }) => {
                expect(message).toBe("Logged out successfully")
            })
    })
})

afterAll(async () => {
    await prismaService.flush()
    await app.close();
});