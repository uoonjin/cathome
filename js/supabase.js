// Supabase 클라이언트 초기화
// 정적 호스팅에서는 환경변수를 사용할 수 없어 직접 키를 포함합니다
// anon key는 공개용 키이며, 실제 보안은 Supabase RLS가 담당합니다

const SUPABASE_URL = 'https://cdyprvbppccgxinvjdvl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeXBydmJwcGNjZ3hpbnZqZHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDgwODcsImV4cCI6MjA4MjI4NDA4N30.uAEPW7woFODmfINB1epNyDTkbyBucUv2a6EbwV7tT6c';

// Supabase 클라이언트 생성 (CDN의 supabase 객체 사용)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
