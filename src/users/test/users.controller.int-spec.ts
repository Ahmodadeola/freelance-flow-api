import { createRandomAuthUser, randomCreateUserDto, randomSignupDto, setupTestingModule } from "test/test_utils";
import { UsersService } from "../users.service";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { App } from "supertest/types";
import request from 'supertest';
import { CreateUserDto } from "../dto/create-user.dto";
import { AccountStatus } from "generated/prisma/enums";
import { faker } from "@faker-js/faker";
import { User } from "generated/prisma/browser";
import { AuthService } from "src/auth/auth.service";
import { SignupDto } from "src/auth/dto/signup.dto";

let userService: UsersService;
let authService: AuthService
let userDto: CreateUserDto;
let app: INestApplication<App>;

beforeAll(async () => {
    const ctx = await setupTestingModule();
    userService = ctx.userService;
    authService = ctx.authService;

    app = ctx.moduleRef.createNestApplication();
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
        }),
    );
    await app.init();
})


beforeEach(() => {
    userDto = randomCreateUserDto();
});

describe('Creating a user', () => {
    test('with valid data', async () => {
        return request(app.getHttpServer())
            .post('/users')
            .send(userDto)
            .expect(201)
            .then(({ body: { data: user } }) => {
                expect(user.status).toBe(AccountStatus.ACTIVE);
                expect(user.verified).toBe(false);

                Object.entries(userDto).forEach(([key, value]) =>
                    expect(value).toBe(user[key]),
                );
            });
    });

    test('with a duplicate email', async () => {
        const user = await userService.create(userDto);
        return request(app.getHttpServer())
            .post('/users')
            .send({ ...userDto, email: user.email })
            .expect(409)
            .then(({ body }) => {
                expect(body.error).toBe('Conflict');
            });

    });
});


describe("Updating a user", () => {
    let user: User;
    let accessToken: string;
    let signupDto: SignupDto

    beforeEach(async () => {
        signupDto = randomSignupDto();
        user = await createRandomAuthUser(authService, signupDto);
        const loginResult = await authService.login({
            email: user.email,
            password: signupDto.password,
        });
        accessToken = loginResult.tokens.accessToken;
    });


    test('with valid data', async () => {
        const newFirstName = faker.person.firstName();
        const businessName = faker.company.name();


        await request(app.getHttpServer())
            .patch(`/users/me`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ ...userDto, firstName: newFirstName, businessName })
            .expect(200)
            .then(({ body: { data: updatedUser } }) => {
                expect(updatedUser.firstName).toBe(newFirstName);
                expect(updatedUser.businessName).toBe(businessName);
            });


        // ensure the profile now contains the updated data
        await request(app.getHttpServer())
            .get('/auth/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .then(({ body: { data } }) => {
                expect(data.firstName).toBe(newFirstName);
                expect(data.businessName).toBe(businessName);
            });
    });

    test('without authentication', async () => {
        await request(app.getHttpServer())
            .patch(`/users/me`)
            .send({ ...userDto, firstName: faker.person.firstName(), businessName: faker.company.name() })
            .expect(403);
    });
});