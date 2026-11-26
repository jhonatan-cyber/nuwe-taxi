jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));

import { SocketGateway } from './socket.gateway';
import { JwtRole } from '../auth/jwt/jwt-role';

describe('SocketGateway', () => {
  const futureExpiration = Math.floor(Date.now() / 1000) + 60;

  it('disconnects clients without a valid JWT', async () => {
    const jwtService = { verifyAsync: jest.fn().mockRejectedValue(new Error('invalid token')) };
    const gateway = new SocketGateway(jwtService as any, {} as any, {} as any, {} as any);
    const client = {
      handshake: { auth: {}, headers: {} },
      disconnect: jest.fn(),
    };

    await gateway.handleConnection(client as any);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('authenticates sockets and joins only the user and role rooms from the JWT', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        id: 17,
        roles: [JwtRole.DRIVER],
        exp: futureExpiration,
      }),
    };
    const gateway = new SocketGateway(jwtService as any, {} as any, {} as any, {} as any);
    const client = {
      handshake: { auth: { token: 'valid-token' }, headers: {} },
      data: {},
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
    };

    await gateway.handleConnection(client as any);

    expect((client.data as any).user).toEqual({
      userId: 17,
      roles: [JwtRole.DRIVER],
      expiresAt: futureExpiration,
    });
    expect(client.join).toHaveBeenCalledWith('user:17');
    expect(client.join).toHaveBeenCalledWith(`role:${JwtRole.DRIVER}`);
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('sends an offer event only to the client who owns the request', async () => {
    const offers = { findOneBy: jest.fn().mockResolvedValue({ id: 8 }) };
    const requests = { findOneBy: jest.fn().mockResolvedValue({ id_client: 17 }) };
    const gateway = new SocketGateway({} as any, requests as any, offers as any, {} as any);
    const emit = jest.fn();
    gateway.server = { to: jest.fn().mockReturnValue({ emit }) } as any;
    const client = {
      id: 'driver-socket',
      data: { user: { userId: 8, roles: [JwtRole.DRIVER], expiresAt: futureExpiration } },
    };

    await gateway.handleNewDriverOffer(client as any, { id_client_request: 3 });

    expect(gateway.server.to).toHaveBeenCalledWith('user:17');
    expect(emit).toHaveBeenCalledWith('created_driver_offer/3', { id_socket: 'driver-socket' });
  });
});