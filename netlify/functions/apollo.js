import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

export const handler = async (event, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'ok' };
  }

  try {
    // Authenticate user via Auth header
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    // Fetch Apollo API Key from credentials
    const { data: creds, error: dbError } = await supabase
      .from('credentials')
      .select('api_key, is_active')
      .eq('user_id', user.id)
      .eq('service_name', 'apollo')
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbError) {
      console.error('Database error fetching credential:', dbError);
    }

    if (!creds || !creds.api_key) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Chave de API do Apollo não encontrada ou inativa nas Integrações.' }) };
    }

    const apolloKey = creds.api_key;
    const body = JSON.parse(event.body || '{}');
    const { action, payload } = body; 

    let apolloUrl = '';
    let apolloMethod = 'POST';

    if (action === 'search_people') {
      apolloUrl = 'https://api.apollo.io/api/v1/mixed_people/api_search';
    } else if (action === 'search_companies') {
      apolloUrl = 'https://api.apollo.io/api/v1/mixed_companies/search';
    } else if (action === 'get_lists') {
      apolloUrl = 'https://api.apollo.io/api/v1/labels';
      apolloMethod = 'GET';
    } else if (action === 'create_list') {
      apolloUrl = 'https://api.apollo.io/api/v1/labels';
    } else if (action === 'get_list_contacts') {
      apolloUrl = 'https://api.apollo.io/api/v1/contacts/search';
    } else if (action === 'enrich_person') {
      apolloUrl = 'https://api.apollo.io/api/v1/people/match';
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
    }

    const apolloHeaders = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-Api-Key': apolloKey
    };

    const fetchOptions = {
      method: apolloMethod,
      headers: apolloHeaders
    };

    if (apolloMethod === 'POST') {
      fetchOptions.body = JSON.stringify(payload);
    } else if (payload && Object.keys(payload).length > 0) {
      const queryParams = new URLSearchParams(payload).toString();
      apolloUrl += `?${queryParams}`;
    }

    const apolloResponse = await fetch(apolloUrl, fetchOptions);
    const apolloData = await apolloResponse.json();

    return {
      statusCode: apolloResponse.status,
      headers,
      body: JSON.stringify(apolloData)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
