import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClubsModule } from './clubs/clubs.module';
import { ClockModule } from './common/clock/clock.module';
import { RequestLoggerMiddleware } from './common/http/request-logger.middleware';
import { validateEnvironment } from './config/environment';
import { LeagueModule } from './league/league.module';
import { MarketModule } from './market/market.module';
import { PlayersModule } from './players/players.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    PrismaModule,
    ClockModule,
    PlayersModule,
    ClubsModule,
    MarketModule,
    LeagueModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*path');
  }
}
