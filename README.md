# 맥주 트래커 🍺

개인 맥주 소비 추적 및 통계 관리 웹앱

## 기능

- 🔐 사용자 인증 (로그인/회원가입)
- 🍺 맥주 종류 관리 (등록, 수정, 삭제, 정렬)
- 📝 일일 소비량 기록
- 📊 월별/연별 통계 및 캘린더 뷰
- 📱 모바일 최적화 반응형 디자인

## 기술 스택

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## 배포

이 프로젝트는 Vercel에 배포하도록 설정되어 있습니다.

### 환경 변수

배포 시 다음 환경 변수들을 설정해야 합니다:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 로컬 개발

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```