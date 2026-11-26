import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { FirebaseRepository } from './firebase.repository';

const firebaseProvider = {
  provide: 'FIREBASE_APP',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
    return admin.apps.length
      ? admin.app()
      : admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          ...(projectId ? { projectId } : {}),
        });
  },
};

@Module({
  imports: [ConfigModule],
  providers: [firebaseProvider, FirebaseRepository],
  exports: [FirebaseRepository],
})
export class FirebaseModule {}
