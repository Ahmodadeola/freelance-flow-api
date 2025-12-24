import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    ignoreEnvFile: true,
  }), UsersModule, AuthModule],
  controllers: [AppController],
  providers: [{
    provide: APP_INTERCEPTOR,
    useClass: ResponseInterceptor
  }, AppService, PrismaService],
})
export class AppModule { }
