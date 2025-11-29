'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

/**
 * 로그인/로그아웃 상태 관리 Hook
 * @returns {Object} 로그인 상태 및 관련 함수들
 */
export const useLoginLogoutStatus = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * 로그인 상태 조회
   */
  useEffect(() => {
    // 초기 세션 확인
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('세션 조회 오류:', error);
          setUser(null);
        } else {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('세션 조회 예외:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // 인증 상태 변경 리스너 등록
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 클린업: 리스너 제거
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * 로그아웃 처리 함수
   */
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('로그아웃 에러:', error.message);
        alert(`로그아웃 중 오류가 발생했습니다: ${error.message}`);
        return;
      }

      // 로그아웃 성공 시 로그인 페이지로 이동
      router.push('/auth/login');
    } catch (error) {
      console.error('로그아웃 예외:', error);
      alert('로그아웃 중 예상치 못한 오류가 발생했습니다.');
    }
  };

  /**
   * 로그인 페이지로 이동
   */
  const goToLogin = () => {
    router.push('/auth/login');
  };

  /**
   * 마이페이지로 이동
   */
  const goToMyPage = () => {
    router.push('/mypages');
  };

  /**
   * 사용자 정보 추출
   */
  const getUserInfo = () => {
    if (!user) {
      return {
        profileImage: null,
        name: null,
        email: null,
      };
    }

    // 프로필 이미지: user_metadata의 avatar_url 또는 picture 사용
    const profileImage = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    
    // 이름: user_metadata의 full_name 또는 name 사용, 없으면 이메일의 @ 앞부분 사용
    const name = user.user_metadata?.full_name || 
                 user.user_metadata?.name || 
                 user.email?.split('@')[0] || 
                 '사용자';

    return {
      profileImage,
      name,
      email: user.email,
    };
  };

  return {
    isLoggedIn: !!user,
    loading,
    user,
    userInfo: getUserInfo(),
    handleLogout,
    goToLogin,
    goToMyPage,
  };
};
