jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));

import { ClientRequestsService } from './client_requests.service';
import { CreateClientRequestDto } from './dto/create_client_request.dto';

describe('ClientRequestsService', () => {
  it('binds untrusted descriptions and coordinates as query parameters', async () => {
    const injectedText = "pickup'); DROP TABLE users; --";
    const repository = {
      query: jest.fn()
        .mockResolvedValueOnce([{ id: 42 }])
        .mockResolvedValueOnce([]),
    };
    const firebaseRepository = { sendMessageToMultipleDevices: jest.fn() };
    const service = new ClientRequestsService(
      repository as any,
      {} as any,
      firebaseRepository as any,
      {} as any,
    );
    const request: CreateClientRequestDto = {
      fare_offered: 10,
      pickup_description: injectedText,
      destination_description: 'Destination',
      pickup_lat: 1.25,
      pickup_lng: 2.5,
      destination_lat: 3.75,
      destination_lng: 4.5,
    };

    await expect(service.create(request, 7)).resolves.toBe(42);

    const [insertSql, insertParameters] = repository.query.mock.calls[0];
    expect(insertSql).not.toContain(injectedText);
    expect(insertSql).toContain('RETURNING id');
    expect(insertSql).toContain('ST_MakePoint($5, $6)');
    expect(insertParameters).toContain(injectedText);
    expect(insertParameters.slice(4)).toEqual([2.5, 1.25, 4.5, 3.75]);

    const [lookupSql, lookupParameters] = repository.query.mock.calls[1];
    expect(lookupSql).not.toContain('1.25');
    expect(lookupSql).toContain('ST_DWithin');
    expect(lookupParameters).toEqual([2.5, 1.25, 'DRIVER', 10000]);
  });
});