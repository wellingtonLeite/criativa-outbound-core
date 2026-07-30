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

    let reoonUrl = '';
    let reoonMethod = 'GET';
    let reoonBody = null;

    if (action === 'verify_email') {
      const { email, mode = 'quick' } = payload || {};
      if (!email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'email é obrigatório' }) };
      }
      reoonUrl = `https://emailverifier.reoon.com/api/v1/verify?email=${encodeURIComponent(email)}&key=${encodeURIComponent(reoonKey)}&mode=${encodeURIComponent(mode)}`;
    } else if (action === 'create_bulk_task') {
      const { emails, name } = payload || {};
      if (!emails || !emails.length) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'emails é obrigatório' }) };
      }
      reoonUrl = 'https://emailverifier.reoon.com/api/v1/create-bulk-verification-task/';
      reoonMethod = 'POST';
      reoonBody = JSON.stringify({ name: name || 'CORE', emails, key: reoonKey });
    } else if (action === 'get_bulk_task_result') {
      const { task_id } = payload || {};
      if (!task_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'task_id é obrigatório' }) };
      }
      reoonUrl = `https://emailverifier.reoon.com/api/v1/get-result-bulk-verification-task/?key=${encodeURIComponent(reoonKey)}&task_id=${encodeURIComponent(task_id)}`;
    } else if (action === 'check_balance') {
      reoonUrl = `https://emailverifier.reoon.com/api/v1/check-account-balance/?key=${encodeURIComponent(reoonKey)}`;
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
    }

    const fetchOptions = { method: reoonMethod };
    if (reoonBody) {
      fetchOptions.headers = { 'Content-Type': 'application/json' };
      fetchOptions.body = reoonBody;
    }

    const reoonResponse = await fetch(reoonUrl, fetchOptions);
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
