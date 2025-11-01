import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface MagazineDetailData {
  id: string;
  image_url?: string;
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

        setData(magazineData);
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

