import { faker } from "@faker-js/faker";
import { Cache } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "src/app.module";
import { AuthService } from "src/auth/auth.service";
import { PrismaService } from "src/prisma/prisma.service";


let prismaService: PrismaService;
let authService: AuthService;
let jwtService: JwtService;
let configService: ConfigService;
let cacheManager: Cache

export const setupTestingModule = async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [AppModule]
    }).compile()

    prismaService = moduleRef.get(PrismaService)
    authService = moduleRef.get(AuthService)
    jwtService = moduleRef.get(JwtService)
    configService = moduleRef.get(ConfigService)
    cacheManager = moduleRef.get(Cache)
    await prismaService.flush()

    return { moduleRef, prismaService, authService, jwtService, configService, cacheManager }
}

export const randomSignupDto = (opts: Record<string, any> = {}) => ({
    email: opts?.email || faker.internet.email(),
    firstName: opts?.firstName || faker.person.firstName(),
    lastName: opts?.lastName || faker.person.lastName(),
    password: opts?.password || `_${faker.string.alphanumeric(10)}1`
})

export const createRandomAuthUser = async (authService: AuthService, opts = {}) => await authService.signup(randomSignupDto(opts))
