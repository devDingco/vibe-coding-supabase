import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface MagazineDetailData {
  id: string;
  image_url: string;
  category: string;
  title: string;
  description: string;
  content: string;
  tags: string[] | null;
}

interface UseMagazineDetailResult {
  data: MagazineDetailData | null;
  loading: boolean;
  error: string | null;
}

export const useMagazineDetail = (id: string): UseMagazineDetailResult => {
  const [data, setData] = useState<MagazineDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMagazineDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        // Supabase에서 ANON 키를 사용하여 magazine 테이블 조회
        const { data: magazineData, error: fetchError } = await supabase
          .from('magazine')
          .select('id, image_url, category, title, description, content, tags')
          .eq('id', id)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        if (!magazineData) {
          throw new Error('Magazine not found');
        }

        // Supabase Image Transformation을 사용하여 썸네일 URL 생성
        let thumbnailUrl = magazineData.image_url;
        if (magazineData.image_url) {
          // image_url이 이미 전체 URL인지 확인
          const isFullUrl = magazineData.image_url.startsWith('http');
          
          if (isFullUrl) {
            // 이미 전체 URL인 경우, 직접 변환
            thumbnailUrl = magazineData.image_url.replace(
              '/storage/v1/object/public/',
              '/storage/v1/object/public/'
            );
          } else {
            // storage path인 경우 getPublicUrl로 기본 URL을 가져옴
            const { data: publicUrlData } = supabase.storage
              .from('vibe-coding-supabase-storage')
              .getPublicUrl(magazineData.image_url);
            
            // Image Transformation을 위해 URL 경로를 변경
            thumbnailUrl = publicUrlData.publicUrl.replace(
              '/storage/v1/object/public/',
              '/storage/v1/object/public/'
            );
          }
          
          // 쿼리 파라미터 추가
          thumbnailUrl += '?width=852&resize=contain';
          
          console.log('상세 페이지 원본 URL:', magazineData.image_url);
          console.log('상세 페이지 썸네일 URL:', thumbnailUrl);
        }

        setData({
          ...magazineData,
          image_url: thumbnailUrl
        });
      } catch (err) {
        console.error('Error fetching magazine detail:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMagazineDetail();
    }
  }, [id]);

  return { data, loading, error };
};

