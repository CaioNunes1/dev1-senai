import { Module } from '@nestjs/common';
import { LineupController, MatchesController, StandingsController } from './league.controllers';
import { LineupService } from './lineup.service';
import { MatchesService } from './matches.service';

@Module({
  controllers: [LineupController, MatchesController, StandingsController],
  providers: [LineupService, MatchesService],
})
export class LeagueModule {}
