import { Test } from "@nestjs/testing"
import { AppModule } from "src/app.module"
import { PrismaService } from "src/prisma/prisma.service"
import { faker } from '@faker-js/faker'

import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { SignupDto } from "../dto/signup.dto";
import { LoginDto } from "../dto/login.dto";
import { User } from "generated/prisma/client";

let prismaService: PrismaService;
let authService: AuthService;
let signupDto: SignupDto;

beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule]
    }).compile()

    prismaService = moduleRef.get(PrismaService)
    authService = moduleRef.get(AuthService)
    await prismaService.flush()
})

beforeEach(() => {
    signupDto = {
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        password: faker.internet.password()
    }
})

describe("Registering a new user", () => {
    test("with valid details", async () => {
        const user = await authService.signup(signupDto)
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