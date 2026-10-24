# Briefly

관심 주제별 최신 뉴스를 한곳에서 탐색하고, 필요한 기사를 저장할 수 있는 개인 맞춤 뉴스 브리핑 웹 애플리케이션입니다.

현재 상태: 핵심 기능 1차 구현 완료

## 바로가기

- 웹 애플리케이션: https://briefly-news-brown.vercel.app
- GitHub 저장소: https://github.com/wonody-cpu/briefly-news

## 로컬 실행

1. `.env.local` 파일의 `GNEWS_API_KEY=` 뒤에 발급받은 키를 입력합니다.
2. 터미널에서 `npm run dev`를 실행합니다.
3. 브라우저에서 `http://127.0.0.1:4173`을 엽니다.

API 키가 포함된 `.env.local` 파일은 `.gitignore`에 등록되어 GitHub에 업로드되지 않습니다.

## 구현된 기능

- 5개 카테고리별 한국어 주요 뉴스 조회
- 현재 뉴스 목록의 제목·설명 키워드 검색
- 기사 북마크 추가·삭제 및 브라우저 저장
- 저장한 기사 모아보기
- 로딩, 빈 결과, API 오류 상태 안내
- 모바일 반응형 화면
- 서버 측 API 호출과 10분 캐시

## 프로젝트 문서

- `docs/project-plan.md`: 문제 정의, 사용자, 핵심 요구사항과 개발 범위
- `docs/development-log.md`: AI 활용 및 문제 해결 과정 기록
- `docs/final-report.md`: 제출용 개발 보고서 원본
- `docs/Briefly-개발보고서.pdf`: 제출용 PDF 보고서

