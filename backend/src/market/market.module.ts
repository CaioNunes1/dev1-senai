import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { TransactionHistoryService } from './transaction-history.service';
import { TransactionsController } from './transactions.controller';

@Module({
  controllers: [MarketController, TransactionsController],
  providers: [MarketService, TransactionHistoryService],
})
export class MarketModule {}
