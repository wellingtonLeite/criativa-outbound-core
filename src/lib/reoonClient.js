import { callFunctionProxy } from './functionsClient';

export async function callReoonProxy(action, payload = {}) {
  return callFunctionProxy('reoon', action, payload);
}

// Mapeia o status devolvido pela Reoon (quick ou power) para o enum
// validation_status da tabela leads.
function mapReoonStatus(status) {
  switch (status) {
    case 'valid':      // quick mode
    case 'safe':       // power mode
    case 'role_account': // deliverável, só que é uma caixa genérica (ex: contato@)
      return 'valid';
    case 'catch_all':
      return 'catch_all';
    case 'invalid':
    case 'disabled':
    case 'disposable':
    case 'spamtrap':
      return 'invalid';
    default: // 'inbox_full', 'unknown' ou qualquer status novo/inesperado
      return 'pending';
  }
}

// Verificação individual, modo quick (~0.5s) — usada ao adicionar um lead por vez
// (ex: resultado de busca enriquecido). Retorna 'pending' em qualquer falha
// (sem credencial, cota estourada, erro de rede) para não travar o fluxo.
export async function verifyEmailStatus(email) {
  try {
    const data = await callReoonProxy('verify_email', { email, mode: 'quick' });
    return mapReoonStatus(data.status);
  } catch (error) {
    console.warn('Validação Reoon falhou para', email, '-', error.message);
    return 'pending';
  }
}

// Verificação em lote, modo power (detecta catch-all e existência real da caixa) —
// usada na importação de listas. Cria uma tarefa assíncrona na Reoon e faz polling
// até completar ou até o tempo máximo de espera, retornando um Map email -> validation_status.
// E-mails que não forem resolvidos a tempo (ou em caso de erro) ficam 'pending'.
// onProgress(status) é chamado a cada checagem com o progresso real devolvido pela Reoon
// (status: 'creating' | 'waiting' | 'running' | 'completed' | 'failed', count_checked, count_total).
export async function verifyEmailsBulk(emails, { pollIntervalMs = 3000, maxWaitMs = 60000, onProgress } = {}) {
  const result = new Map(emails.map(e => [e, 'pending']));
  if (emails.length === 0) return result;

  const report = (status, extra = {}) => onProgress?.({ status, total: emails.length, ...extra });

  try {
    report('creating');
    const task = await callReoonProxy('create_bulk_task', { emails, name: 'CORE Import' });
    if (task.status !== 'success' || !task.task_id) {
      console.warn('Falha ao criar tarefa de verificação em lote na Reoon:', task);
      report('failed');
      return result;
    }

    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      const taskResult = await callReoonProxy('get_bulk_task_result', { task_id: task.task_id });
      if (taskResult.status === 'completed' && taskResult.results) {
        for (const [email, info] of Object.entries(taskResult.results)) {
          result.set(email, mapReoonStatus(info.status));
        }
        report('completed', { checked: taskResult.count_checked, progress: taskResult.progress_percentage });
        return result;
      }
      if (taskResult.status === 'file_not_found' || taskResult.status === 'file_loading_error') {
        console.warn('Tarefa de verificação em lote da Reoon falhou:', taskResult);
        report('failed');
        return result;
      }
      // 'waiting' / 'running' — continua o polling
      report(taskResult.status || 'running', { checked: taskResult.count_checked, progress: taskResult.progress_percentage });
    }
    console.warn('Tempo máximo de espera atingido para a verificação em lote da Reoon (task', task.task_id, ')');
    report('timeout');
    return result;
  } catch (error) {
    console.warn('Verificação em lote da Reoon falhou:', error.message);
    report('failed');
    return result;
  }
}
