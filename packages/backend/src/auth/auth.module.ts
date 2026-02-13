import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { ConfigEnum } from 'src/enum/config.enum';
import { JwtStrategy } from './auth.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule], // 导入 ConfigModule 以使用 ConfigService
      inject: [ConfigService], // 注入 ConfigService
      // 使用 ConfigService 来动态配置 TypeORM
      useFactory: (cfgService: ConfigService) => {
        // console.log('🔐 JWT Secret Loaded:',  cfgService.get<string>(ConfigEnum.JWT_SECRET));
        return {
          secret: cfgService.get<string>(ConfigEnum.JWT_SECRET),
          signOptions: { expiresIn: '3d' },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
