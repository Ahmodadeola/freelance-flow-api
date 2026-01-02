
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

    async flush() {
        /* This function is meant for testing purpose only, it will delete all the database
        tables before the tests are run.
        */
        if (process.env.NODE_ENV === "production") return;

        // Get all model names that have deleteMany method

        // models to be deleted
        const modelNames = ['user', 'auth'];

        // Delete all models
        const deletePromises = modelNames.map(modelName => {
            const model = (this as any)[modelName];
            if (model && typeof model.deleteMany === 'function') {
                return model.deleteMany();
            }
            return Promise.resolve();
        });

        return Promise.all(deletePromises);
    }
}
