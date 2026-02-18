import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
// Future modules:
// import { TransactionsModule } from './transactions/transactions.module';
// import { BudgetsModule } from './budgets/budgets.module';
// import { GoalsModule } from './goals/goals.module';
// import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Global rate limit: 100 requests/min per IP. Auth login overrides to 5/min.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    PrismaModule,
    UsersModule,
    AuthModule,
  ],
  providers: [
    // Apply throttle guard globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
