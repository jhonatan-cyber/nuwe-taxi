import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { ClientRequests, Status } from '../client_requests/client_requests.entity';
import { DriverTripOffers } from '../driver_trip_offers/driver_trip_offers.entity';
import { DriversPosition } from '../drivers_position/drivers_position.entity';
import { JwtRole } from '../auth/jwt/jwt-role';

const ACTIVE_STATUSES = [Status.ACCEPTED, Status.ON_THE_WAY, Status.ARRIVED, Status.TRAVELLING];

const validateSocketOrigin = (
  origin: string | undefined,
  callback: (error: Error | null, allowed?: boolean) => void,
) => {
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((allowedOrigin) => allowedOrigin.trim())
    .filter(Boolean);
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error('Origin not allowed'), false);
};

@WebSocketGateway({
  cors: { origin: validateSocketOrigin },
  transports: ['websocket'],
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(ClientRequests) private readonly clientRequests: Repository<ClientRequests>,
    @InjectRepository(DriverTripOffers) private readonly driverTripOffers: Repository<DriverTripOffers>,
    @InjectRepository(DriversPosition) private readonly driversPosition: Repository<DriversPosition>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authToken = client.handshake.auth?.token
        ?? client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (typeof authToken !== 'string' || authToken.length === 0) throw new Error('Missing token');

      const payload = await this.jwtService.verifyAsync(authToken);
      const roles = Array.isArray(payload.roles)
        ? payload.roles.filter((role: string) => Object.values(JwtRole).includes(role as JwtRole))
        : [];
      if (!Number.isInteger(payload.id) || roles.length === 0 || !Number.isInteger(payload.exp)) {
        throw new Error('Invalid token');
      }

      client.data.user = { userId: payload.id as number, roles: roles as JwtRole[], expiresAt: payload.exp as number };
      await client.join(`user:${payload.id}`);
      await Promise.all(roles.map((role: JwtRole) => client.join(`role:${role}`)));
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('message')
  handleMessage() {
    return;
  }

  @SubscribeMessage('change_driver_position')
  async handleChangeDriverPosition(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const user = this.requireRole(client, JwtRole.DRIVER);
    const input = this.asObject(data);
    const latitude = this.coordinate(input.lat, -90, 90);
    const longitude = this.coordinate(input.lng, -180, 180);
    if (input.id !== undefined && this.integer(input.id) !== user.userId) throw new WsException('Invalid driver');

    await this.driversPosition.query(`
      INSERT INTO drivers_position (id_driver, position)
      VALUES (?, ST_GeomFromText(?, 4326))
      ON DUPLICATE KEY UPDATE position = VALUES(position)
    `, [user.userId, `POINT(${latitude} ${longitude})`]);

    const nearbyRequests = await this.clientRequests.query(`
      SELECT id_client FROM client_requests
      WHERE status = ?
        AND ST_Distance_Sphere(pickup_position, ST_GeomFromText(?, 4326)) <= ?
    `, [Status.CREATED, `POINT(${latitude} ${longitude})`, 5000]);
    for (const request of nearbyRequests) {
      this.server.to(`user:${request.id_client}`).emit('new_driver_position', {
        id_socket: client.id,
        id: user.userId,
        lat: latitude,
        lng: longitude,
      });
    }
  }

  @SubscribeMessage('new_client_request')
  async handleNewClientRequest(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const user = this.requireRole(client, JwtRole.CLIENT);
    const requestId = this.integer(this.asObject(data).id_client_request);
    const request = await this.clientRequests.findOneBy({ id: requestId, id_client: user.userId, status: Status.CREATED });
    if (!request) throw new WsException('Solicitud no encontrada');
    this.server.to(`role:${JwtRole.DRIVER}`).emit('created_client_request', { id_client_request: requestId });
  }

  @SubscribeMessage('new_driver_offer')
  async handleNewDriverOffer(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const user = this.requireRole(client, JwtRole.DRIVER);
    const requestId = this.integer(this.asObject(data).id_client_request);
    const offer = await this.driverTripOffers.findOneBy({ id_client_request: requestId, id_driver: user.userId });
    if (!offer) throw new WsException('Oferta no encontrada');
    const request = await this.clientRequests.findOneBy({ id: requestId });
    if (!request) throw new WsException('Solicitud no encontrada');
    this.server.to(`user:${request.id_client}`).emit(`created_driver_offer/${requestId}`, { id_socket: client.id });
  }

  @SubscribeMessage('new_driver_assigned')
  async handleNewDriverAssigned(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const user = this.requireRole(client, JwtRole.CLIENT);
    const input = this.asObject(data);
    const requestId = this.integer(input.id_client_request);
    const driverId = this.integer(input.id_driver);
    const request = await this.clientRequests.findOneBy({
      id: requestId,
      id_client: user.userId,
      id_driver_assigned: driverId,
      status: Status.ACCEPTED,
    });
    if (!request) throw new WsException('Asignación no encontrada');
    this.server.to(`user:${driverId}`).emit(`driver_assigned/${driverId}`, {
      id_socket: client.id,
      id_client_request: requestId,
    });
  }

  @SubscribeMessage('trip_change_driver_position')
  async handleTripChangeDriverPosition(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const user = this.requireRole(client, JwtRole.DRIVER);
    const input = this.asObject(data);
    const clientId = this.integer(input.id_client);
    const latitude = this.coordinate(input.lat, -90, 90);
    const longitude = this.coordinate(input.lng, -180, 180);
    const request = await this.clientRequests.findOneBy({
      id_client: clientId,
      id_driver_assigned: user.userId,
      status: In(ACTIVE_STATUSES),
    });
    if (!request) throw new WsException('Viaje no activo');
    this.server.to(`user:${clientId}`).emit(`trip_new_driver_position/${clientId}`, {
      id_socket: client.id,
      lat: latitude,
      lng: longitude,
    });
  }

  @SubscribeMessage('update_status_trip')
  async handleUpdateStatusTrip(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const user = this.requireAuthenticated(client);
    const input = this.asObject(data);
    const requestId = this.integer(input.id_client_request);
    const status = input.status;
    if (typeof status !== 'string' || !Object.values(Status).includes(status as Status)) {
      throw new WsException('Estado no válido');
    }

    const request = await this.clientRequests.findOneBy({ id: requestId });
    if (!request || request.status !== status
      || (request.id_client !== user.userId && request.id_driver_assigned !== user.userId)) {
      throw new WsException('Estado de viaje no verificado');
    }
    const payload = { id_socket: client.id, status, id_client_request: requestId };
    this.server.to(`user:${request.id_client}`).emit(`new_status_trip/${requestId}`, payload);
    if (request.id_driver_assigned) {
      this.server.to(`user:${request.id_driver_assigned}`).emit(`new_status_trip/${requestId}`, payload);
    }
  }

  private requireAuthenticated(client: Socket): { userId: number; roles: JwtRole[]; expiresAt: number } {
    const user = client.data.user;
    if (!user || !Number.isInteger(user.userId) || user.expiresAt * 1000 <= Date.now()) {
      client.disconnect(true);
      throw new WsException('No autenticado');
    }
    return user;
  }

  private requireRole(client: Socket, role: JwtRole) {
    const user = this.requireAuthenticated(client);
    if (!user.roles.includes(role)) throw new WsException('Rol no autorizado');
    return user;
  }

  private asObject(data: unknown): Record<string, unknown> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new WsException('Datos no válidos');
    return data as Record<string, unknown>;
  }

  private integer(value: unknown): number {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isSafeInteger(number) || number <= 0) throw new WsException('Identificador no válido');
    return number;
  }

  private coordinate(value: unknown, min: number, max: number): number {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number) || number < min || number > max) throw new WsException('Coordenada no válida');
    return number;
  }
}