/**
 * 로그인 권한 가드 Hook
 * 로그인 여부를 검사하고 비로그인 시 알림을 띄우는 기능 제공
 */

import { useCallback } from 'react';

interface UseAuthGuardProps {
  isLoggedIn: boolean;
}

interface UseAuthGuardReturn {
  /**
   * 로그인 여부를 검사하는 가드 함수
   * @returns {boolean} 로그인 여부 (true: 로그인됨, false: 비로그인)
   */
  checkLoginRequired: () => boolean;
}

export const useAuthGuard = ({ isLoggedIn }: UseAuthGuardProps): UseAuthGuardReturn => {
  /**
   * 로그인 액션 가드
   * 로그인 여부를 검사하고 비로그인 시 알림을 띄움
   */
  const checkLoginRequired = useCallback(() => {
    if (!isLoggedIn) {
      alert('로그인 후 이용 가능합니다');
      return false;
    }
    return true;
  }, [isLoggedIn]);

  return {
    checkLoginRequired,
  };
};
