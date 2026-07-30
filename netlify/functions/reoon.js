import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'ok' };
  }

  try {
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    const { data: creds, error: dbError } = await supabase
      .from('credentials')
      .select('api_key, is_active')
      .eq('user_id', user.id)
      .eq('service_name', 'reoon')
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbError) {
      console.error('Database error fetching credential:', dbError);
    }

    if (!creds || !creds.api_key) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Chave de API do Reoon não encontrada ou inativa nas Integrações.' }) };
    }

    const reoonKey = creds.api_key;
    const body = JSON.parse(event.body || '{}');
    const { action, payload } = body;

    if (action !== 'verify_email') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
    }

    const { email, mode = 'quick' } = payload || {};
    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'email é obrigatório' }) };
    }

    const url = `https://emailverifier.reoon.com/api/v1/verify?email=${encodeURIComponent(email)}&key=${encodeURIComponent(reoonKey)}&mode=${encodeURIComponent(mode)}`;
    const reoonResponse = await fetch(url);
    const reoonData = await reoonResponse.json();

    return {
      statusCode: reoonResponse.status,
      headers,
      body: JSON.stringify(reoonData)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
