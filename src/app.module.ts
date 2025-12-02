import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionModule } from './transaction/transaction.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => {
        const uri = process.env.ICEBERGDB;
        if (!uri) {
          throw new Error('ICEBERGDB is not defined in .env');
        }
        return {
          uri,
          dbName: 'Iceberg',
        };
      },
    }),
    TransactionModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
