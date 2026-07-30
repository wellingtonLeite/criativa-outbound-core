import { callFunctionProxy } from './functionsClient';

export async function callApolloProxy(action, payload = {}) {
  return callFunctionProxy('apollo', action, payload);
}
