'use client';

import { supabase } from '@/lib/supabase';

/**
 * 구글 로그인 Hook
 * @returns handleGoogleLogin: 구글 로그인을 처리하는 함수
 */
export const useGoogleLogin = () => {
  /**
   * 구글 로그인 처리 함수
   * - Supabase OAuth를 사용하여 구글 로그인 수행
   * - 로그인 성공 시 /auth/login/success 페이지로 리디렉션
   */
  const handleGoogleLogin = async () => {
    try {
      // Supabase의 구글 OAuth 로그인 호출
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // 로그인 성공 후 리디렉션될 URL 설정
          redirectTo: `${window.location.origin}/auth/login/success`,
        },
      });

      if (error) {
        console.error('구글 로그인 에러:', error.message);
        alert(`구글 로그인 중 오류가 발생했습니다: ${error.message}`);
      }
      // OAuth 로그인은 자동으로 리디렉션되므로 별도의 처리 불필요
    } catch (error) {
      console.error('구글 로그인 예외:', error);
      alert('구글 로그인 중 예상치 못한 오류가 발생했습니다.');
    }
  };

  return {
    handleGoogleLogin,
  };
};
