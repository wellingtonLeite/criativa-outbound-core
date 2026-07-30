import { supabase } from './supabase';

export async function callFunctionProxy(functionName, action, payload = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');

  const response = await fetch(`/.netlify/functions/${functionName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, payload })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || `Erro em ${functionName}: ${response.status}`);
  }
  return data;
}
