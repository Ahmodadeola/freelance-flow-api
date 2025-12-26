
import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from 'generated/prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient {
    constructor(private configService: ConfigService) {
        const connectionString = configService.get<string>('database.url');
        const adapter = new PrismaPg({ connectionString });
        super({ adapter });
    }
}
