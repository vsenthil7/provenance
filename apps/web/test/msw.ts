import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Default handlers — individual tests override with server.use(...).
export const handlers = [
  // .init username forward resolution
  http.get('*/initia/usernames/v1/usernames/from_address/:addr', ({ params }) => {
    if (params.addr === 'init1lina000000000000000000000000000000lina') {
      return HttpResponse.json({ username: 'lina' });
    }
    return HttpResponse.json({ message: 'not found' }, { status: 404 });
  }),
  // .init reverse resolution
  http.get('*/initia/usernames/v1/addresses/from_username/:name', ({ params }) => {
    if (params.name === 'lina') {
      return HttpResponse.json({ address: 'init1lina000000000000000000000000000000lina' });
    }
    return HttpResponse.json({ message: 'not found' }, { status: 404 });
  }),
];

export const server = setupServer(...handlers);
