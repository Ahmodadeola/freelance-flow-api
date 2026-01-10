import { faker } from '@faker-js/faker';
import { Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus } from 'generated/prisma/enums';
import { AppModule } from 'src/app.module';
import { AuthService } from 'src/auth/auth.service';
import { dropObjectFields } from 'src/common/helper';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';

let prismaService: PrismaService;
let authService: AuthService;
let jwtService: JwtService;
let userService: UsersService;
let configService: ConfigService;
let cacheManager: Cache;

export const setupTestingModule = async () => {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  prismaService = moduleRef.get(PrismaService);
  authService = moduleRef.get(AuthService);
  jwtService = moduleRef.get(JwtService);
  configService = moduleRef.get(ConfigService);
  userService = moduleRef.get(UsersService);
  cacheManager = moduleRef.get(Cache);
  await prismaService.flush();

  return {
    moduleRef,
    prismaService,
    authService,
    jwtService,
    userService,
    configService,
    cacheManager,
  };
};

export const randomSignupDto = (opts: Record<string, any> = {}) => ({
  email: opts?.email || faker.internet.email(),
  firstName: opts?.firstName! || faker.person.firstName(),
  lastName: opts?.lastName || faker.person.lastName(),
  password: opts?.password || `_${faker.string.alphanumeric(10)}1`,
  businessName: opts?.businessName || faker.company.name(),
  countryCode: opts?.countryCode || faker.location.countryCode(),
  verified: opts?.verified || false,
  status: opts?.status || AccountStatus.ACTIVE,
});

export const randomCreateUserDto = (
  opts: Record<string, any> = {},
): CreateUserDto => {
  const data = randomSignupDto(opts);
  return dropObjectFields(data, ['password']) as CreateUserDto;
};

export const createRandomAuthUser = async (
  authService: AuthService,
  opts = {},
) => await authService.signup(randomSignupDto(opts));
