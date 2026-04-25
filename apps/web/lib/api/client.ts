// lib/api/client.ts
// Single GraphQL client targeting the Ponder indexer's /graphql endpoint.
// Server-side: hits the indexer over the public URL during SSR.
// Client-side: hits /api/graphql which proxies through with caching.

const ENDPOINT =
  typeof window === 'undefined'
    ? process.env.INDEXER_GRAPHQL_URL || 'http://localhost:42069/graphql'
    : '/api/graphql';

export class GraphQLError extends Error {
  constructor(
    message: string,
    public readonly errors: unknown,
  ) {
    super(message);
    this.name = 'GraphQLError';
  }
}

export async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    throw new GraphQLError(`graphql HTTP ${res.status}`, null);
  }
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) throw new GraphQLError('graphql errors', json.errors);
  if (!json.data) throw new GraphQLError('graphql empty', null);
  return json.data;
}
