interface Env {
  DB: D1Database;
  SYNC_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiKey = context.request.headers.get('x-api-key');
  if (!apiKey || apiKey !== context.env.SYNC_API_KEY) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await context.request.json<{ [key: string]: unknown }>();
    if (!payload || typeof payload !== 'object') {
      return new Response(JSON.stringify({ success: false, error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    const dataStr = JSON.stringify(payload);

    const existing = await context.env.DB.prepare(
      'SELECT id FROM sync_data WHERE id = ?'
    ).bind(apiKey).first();

    if (existing) {
      await context.env.DB.prepare(
        'UPDATE sync_data SET data = ?, updated_at = ? WHERE id = ?'
      ).bind(dataStr, now, apiKey).run();
    } else {
      await context.env.DB.prepare(
        'INSERT INTO sync_data (id, data, updated_at) VALUES (?, ?, ?)'
      ).bind(apiKey, dataStr, now).run();
    }

    return new Response(JSON.stringify({ success: true, lastUpdated: now }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
