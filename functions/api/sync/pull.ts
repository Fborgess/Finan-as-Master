interface Env {
  DB: D1Database;
  SYNC_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const apiKey = context.request.headers.get('x-api-key');
  if (!apiKey || apiKey !== context.env.SYNC_API_KEY) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const row = await context.env.DB.prepare(
      'SELECT data, updated_at FROM sync_data WHERE id = ?'
    ).bind(apiKey).first<{ data: string; updated_at: string }>();

    if (!row) {
      return new Response(JSON.stringify({ success: true, data: null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = JSON.parse(row.data);
    return new Response(JSON.stringify({ success: true, data: { ...data, lastUpdated: row.updated_at } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
