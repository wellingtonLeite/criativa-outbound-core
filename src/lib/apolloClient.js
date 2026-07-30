import { supabase } from './supabase';

export async function callApolloProxy(action, payload = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');

  const response = await fetch('/.netlify/functions/apollo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, payload })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || `Erro do Apollo: ${response.status}`);
  }
  return data;
}
