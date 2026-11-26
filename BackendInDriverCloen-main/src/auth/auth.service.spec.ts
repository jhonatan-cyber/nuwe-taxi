jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));

import { AuthService } from './auth.service';
import { JwtRole } from './jwt/jwt-role';

describe('AuthService', () => {
  it('always registers a client and excludes private fields from the response', async () => {
    const clientRole = { id: JwtRole.CLIENT, name: 'Client', image: '', route: '' };
    const userRepository = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((user) => ({ ...user, id: 12 })),
      save: jest.fn((user) => Promise.resolve({
        ...user,
        password: 'stored-hash',
        notification_token: 'private-notification-token',
      })),
    };
    const rolesRepository = { findOneBy: jest.fn().mockResolvedValue(clientRole) };
    const jwtService = { sign: jest.fn().mockReturnValue('signed-token') };
    const service = new AuthService(userRepository as any, rolesRepository as any, jwtService as any);

    const result = await service.register({
      name: 'Test',
      lastname: 'User',
      email: 'test@example.com',
      phone: '123456789',
      password: 'a-long-test-password',
      rolesIds: [JwtRole.ADMIN],
    } as any);

    expect(rolesRepository.findOneBy).toHaveBeenCalledWith({ id: JwtRole.CLIENT });
    expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      roles: [clientRole],
      password: 'a-long-test-password',
    }));
    expect(userRepository.create.mock.calls[0][0]).not.toHaveProperty('rolesIds');
    expect(jwtService.sign).toHaveBeenCalledWith(expect.objectContaining({ roles: [JwtRole.CLIENT] }));
    expect(result.token).toBe('Bearer signed-token');
    expect(result.user).not.toHaveProperty('password');
    expect(result.user).not.toHaveProperty('notification_token');
    expect(result.user.roles).toEqual([clientRole]);
  });
});