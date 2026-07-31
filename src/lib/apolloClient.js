import { callFunctionProxy } from './functionsClient';
import { supabase } from './supabase';

export async function callApolloProxy(action, payload = {}) {
  return callFunctionProxy('apollo', action, payload);
}

// A API da Apollo não expõe saldo de créditos nem data de renovação (só
// limites de chamada — confirmado manualmente). Por isso o saldo é calibrado
// manualmente (usuário copia do painel da Apollo) e o consumo desde a
// calibração é estimado contando leads com e-mail trazidos depois disso.
export async function estimateApolloCredits(userId) {
  const { data: cred, error: credError } = await supabase
    .from('credentials')
    .select('credit_balance, credit_balance_as_of, credit_renews_at')
    .eq('user_id', userId)
    .eq('service_name', 'apollo')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (credError || !cred || cred.credit_balance == null || !cred.credit_balance_as_of) {
    return null; // ainda não calibrado
  }

  const { count, error: countError } = await supabase
    .from('leads')
    .select('id, campaigns!inner(user_id)', { count: 'exact', head: true })
    .eq('campaigns.user_id', userId)
    .not('email', 'is', null)
    .gt('created_at', cred.credit_balance_as_of);

  if (countError) {
    return null;
  }

  const consumedSinceCalibration = count || 0;
  const estimatedRemaining = Math.max(0, cred.credit_balance - consumedSinceCalibration);
  const renewalPassed = cred.credit_renews_at ? new Date(cred.credit_renews_at) < new Date() : false;

  return {
    balanceAsOf: cred.credit_balance_as_of,
    calibratedBalance: cred.credit_balance,
    consumedSinceCalibration,
    estimatedRemaining,
    renewsAt: cred.credit_renews_at,
    renewalPassed,
  };
}
