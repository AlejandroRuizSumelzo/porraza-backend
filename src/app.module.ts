import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { StadiumModule } from '@modules/stadium/stadium.module';
import { TeamModule } from '@modules/team/team.module';
import { MatchModule } from '@modules/match/match.module';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { PaymentModule } from '@modules/payment/payment.module';
import { LeagueModule } from '@modules/league/league.module';
import { PredictionModule } from '@modules/prediction/prediction.module';

@Module({
  imports: [
    DatabaseModule, // Módulo de base de datos (Pool de pg)
    StadiumModule, // Módulo de funcionalidad de estadios
    TeamModule, // Módulo de funcionalidad de equipos
    MatchModule, // Módulo de funcionalidad de partidos
    UserModule, // Módulo de funcionalidad de usuarios
    AuthModule, // Módulo de autenticación JWT
    PaymentModule, // Módulo de pagos con Stripe
    LeagueModule, // Módulo de funcionalidad de ligas
    PredictionModule, // Módulo de sistema de predicciones del Mundial 2026
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
