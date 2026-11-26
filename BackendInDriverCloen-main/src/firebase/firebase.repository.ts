import { Inject, Injectable } from '@nestjs/common';
import { app } from 'firebase-admin';
import { Messaging } from 'firebase-admin/lib/messaging/messaging';
import { Message, MulticastMessage } from 'firebase-admin/lib/messaging/messaging-api';
@Injectable()
export class FirebaseRepository {
  messaging: Messaging;

  constructor(@Inject('FIREBASE_APP') private firebaseApp: app.App) {
    this.messaging = firebaseApp.messaging();
  }

  sendMessage(notification: Message): Promise<void> {
    return this.messaging.send(notification).then(() => undefined).catch(() => undefined);
  }

  sendMessageToMultipleDevices(notification: MulticastMessage): Promise<void> {
    return this.messaging.sendEachForMulticast(notification).then(() => undefined).catch(() => undefined);
  }

  
}