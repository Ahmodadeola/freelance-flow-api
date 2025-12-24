import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { hash } from 'argon2';
import { CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService) { }

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
}
