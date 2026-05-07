/**
 * globalAuthInterceptor.ts
 *
 * Registers a global axios response interceptor that handles 401 responses.
 * Call setupGlobalAuthInterceptor(dispatch) once on app boot from App.tsx.
 */
import axios from 'axios';
import { Action as AuthAction } from 'ui/auth/constants';
import { TransactionAction } from 'ui/reducer';
import { Routing } from 'app/constants';

let interceptorRegistered = false;

export const setupGlobalAuthInterceptor = (dispatch: Function): void => {
  if (interceptorRegistered) return;
  interceptorRegistered = true;

  axios.interceptors.response.use(
    response => response,
    error => {
      if (error?.response?.status === 401) {
        handle401(dispatch);
      }
      return Promise.reject(error);
    }
  );
};

const handle401 = (dispatch: Function) => {
  dispatch({ type: TransactionAction.Reset });
  dispatch({ type: AuthAction.LogoutSuccess });

  const currentPath = window.location.pathname;
  const publicPaths = [Routing.Login, Routing.SignUp, Routing.PasswordReset];
  const isPublicPath = publicPaths.some(p => currentPath.startsWith(p));

  if (!isPublicPath) {
    window.location.href = Routing.Login;
  }
};

/**
 * handle401IfNeeded
 * Used by useReadTransaction and useWriteTransaction for api-client responses
 * that return error objects rather than throwing.
 * Returns true if a 401 was detected and handled.
 */
let globalDispatch: Function | null = null;

export const setGlobalDispatch = (dispatch: Function): void => {
  globalDispatch = dispatch;
};

export const handle401IfNeeded = (response: any): boolean => {
  const status = response?.response?.status;
  if (status === 401) {
    if (globalDispatch) {
      handle401(globalDispatch);
    } else {
      // Fallback if dispatch not yet set
      window.location.href = Routing.Login;
    }
    return true;
  }
  return false;
};
