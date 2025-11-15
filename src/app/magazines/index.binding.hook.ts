'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Magazine {
  id: string;
  image_url: string;
  category: string;
  title: string;
  description: string;
  tags: string[] | null;
}

export function useMagazines() {
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMagazines() {
      try {
        setLoading(true);
        setError(null);

        // Supabase에서 magazine 테이블 조회 (10개)
        const { data, error: fetchError } = await supabase
          .from('magazine')
          .select('id, image_url, category, title, description, tags')
          .limit(10);

        if (fetchError) {
          throw fetchError;
        }

        // Image Transformation을 사용하여 썸네일 URL 생성
        const magazinesWithThumbnails = (data || []).map((magazine) => {
          let thumbnailUrl: string;
          
          // image_url이 null이거나 없는 경우 처리
          if (!magazine.image_url) {
            return {
              ...magazine,
              image_url: '' // 또는 기본 이미지 URL
            };
          }
          
          // image_url이 이미 전체 URL인지 확인
          const isFullUrl = magazine.image_url.startsWith('http');
          
          if (isFullUrl) {
            // 이미 전체 URL인 경우, 직접 변환
            thumbnailUrl = magazine.image_url.replace(
              '/storage/v1/object/public/',
              '/storage/v1/object/public/'
            );
          } else {
            // storage path인 경우, getPublicUrl로 URL 생성 후 변환
            const { data: publicUrlData } = supabase.storage
              .from('vibe-coding-supabase-storage')
              .getPublicUrl(magazine.image_url);

            thumbnailUrl = publicUrlData.publicUrl.replace(
              '/storage/v1/object/public/',
              '/storage/v1/object/public/'
            );
          }

          // 쿼리 파라미터 추가
          thumbnailUrl += '?width=323&resize=contain';

          // 썸네일 URL 확인용 로그
          console.log('원본 image_url:', magazine.image_url);
          console.log('썸네일 URL:', thumbnailUrl);

          return {
            ...magazine,
            image_url: thumbnailUrl
          };
        });

        setMagazines(magazinesWithThumbnails);
      } catch (err) {
        console.error('Magazine 조회 오류:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchMagazines();
  }, []);

  return { magazines, loading, error };
}

