import { callFunctionProxy } from './functionsClient';

export async function callReoonProxy(action, payload = {}) {
  return callFunctionProxy('reoon', action, payload);
}

// Mapeia o status devolvido pela Reoon (modo "quick") para o enum
// validation_status da tabela leads. Retorna 'pending' em qualquer
// falha (sem credencial, cota estourada, erro de rede) para não travar
// o fluxo de import/adição de leads.
export async function verifyEmailStatus(email) {
  try {
    const data = await callReoonProxy('verify_email', { email, mode: 'quick' });
    switch (data.status) {
      case 'valid':
        return 'valid';
      case 'invalid':
      case 'disposable':
      case 'spamtrap':
        return 'invalid';
      default:
        return 'pending';
    }
  } catch (error) {
    console.warn('Validação Reoon falhou para', email, '-', error.message);
    return 'pending';
  }
}
