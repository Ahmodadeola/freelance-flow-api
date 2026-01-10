import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { UsersService } from '../users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { ConflictException } from '@nestjs/common';
import { randomCreateUserDto } from 'test/test_utils';
import { faker } from '@faker-js/faker';

let userService: UsersService;

let userDto: CreateUserDto;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  userService = moduleRef.get(UsersService);
});

beforeEach(() => {
  userDto = randomCreateUserDto();
});

describe('Creating a user', () => {
  test('with valid data', async () => {
    const user = await userService.create(userDto);
    expect(user.email).toBe(userDto.email);

    Object.entries(userDto).forEach(([key, value]) =>
      expect(value).toBe(user[key]),
    );
  });

  test('with a duplicate email', async () => {
    const user = await userService.create(userDto);
    expect(user.email).toBe(userDto.email);
    try {
      await userService.create(userDto);
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
    }
  });
});


describe("Updating a user", () => {
  test('with valid data', async () => {
    const user = await userService.create(userDto);
    expect(user.email).toBe(userDto.email);

    const newFirstName = faker.person.firstName();
    const updatedUser = await userService.update(user.id, {
      firstName: newFirstName,
    });
    expect(updatedUser.firstName).toBe(newFirstName);
    expect(updatedUser.id).toBe(user.id);
  });

  test('that does not exist', async () => {
    const fakeUserId = faker.string.uuid();
    try {
      await userService.update(fakeUserId, {
        firstName: faker.person.firstName()
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});