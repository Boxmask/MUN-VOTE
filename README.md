# MUN Voting

모의유엔(위원회)용 **실시간 전자투표** 웹앱입니다.  
호스트가 Seed를 만들고, 대표단이 입장해 찬성·반대·기권을 **한 번만** 행사합니다.  
전광판 UI는 국회 전자투표판 스타일(어두운 배경 + LED 점등)을 참고했습니다.

- **화면 호스팅:** Vercel (무료)
- **실시간 데이터:** Firebase Realtime Database (무료 Spark 플랜)

---

## 화면이 나뉘는 이유 (Mac 화면 공유)

호스트가 Apple/Mac에서 Zoom·AirPlay로 공유할 때, **조작 UI와 공유 화면이 같으면** Seed·버튼까지 노출됩니다.

| URL | 용도 | 공유? |
|-----|------|-------|
| `/host/시드` | Topic 입력, Vote, END VOTE, 명단 | ❌ 본인만 |
| `/display/시드` | 전광판 (이름 + LED + 결과) | ✅ 이 창만 공유 |
| `/join/시드` | 대표단 입장·투표 | 각자 폰/노트북 |

**권장:** 호스트 콘솔에서 **전광판 열기** → Zoom에서 **창(Window) 공유**로 전광판만 선택.

자세한 안내는 앱의 `/guide` 페이지에도 있습니다.

---

## Firebase 처음 쓰는 분 — 순서대로

### 1) Node.js 설치

[https://nodejs.org](https://nodejs.org) 에서 LTS 설치 후 터미널을 **새로** 엽니다.

```bash
node -v
npm -v
```

### 2) 이 프로젝트 의존성 설치

```bash
cd "C:\Users\USER\Desktop\MUN voting"
npm install
```

### 3) Firebase 프로젝트 만들기

1. [Firebase Console](https://console.firebase.google.com/) 접속 (Google 계정)
2. **프로젝트 추가** → 이름 예: `mun-voting` → Analytics는 꺼도 됨
3. 왼쪽 **빌드 → Realtime Database** → **데이터베이스 만들기**
   - 위치: `us-central1` 등 아무거나
   - 시작 모드: 처음엔 **테스트 모드**로 시작 (나중에 규칙 조이더라도 MUN용으로는 테스트 모드로도 충분)
4. 위쪽 **프로젝트 설정(톱니바퀴) → 일반 → 내 앱 → 웹(`</>`)** 추가
   - 앱 닉네임: `mun-web`
   - Firebase Hosting 체크는 필요 없음
5. 나오는 `firebaseConfig` 객체의 값을 복사

### 4) `.env` 파일 만들기

프로젝트 폴더에 `.env.example`을 복사해 `.env`로 저장합니다.

```bash
copy .env.example .env
```

`.env`를 열어 Firebase 값을 채웁니다.

| `.env` 키 | Firebase 설정 필드 |
|-----------|-------------------|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_DATABASE_URL` | `databaseURL` (Realtime Database URL, 예: `https://xxxx.firebaseio.com`) |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

> `databaseURL`이 안 보이면 Realtime Database를 먼저 생성했는지 확인하세요.

### 5) (선택) 데이터베이스 규칙

테스트 모드면 이미 읽기/쓰기가 열려 있습니다.  
콘솔 **Realtime Database → 규칙**에 `database.rules.json` 내용을 붙여도 됩니다.

> 이 규칙은 **누구나 읽고 쓸 수 있음**입니다. 학교 MUN·지인 행사처럼 Seed를 아는 사람만 쓰는 용도로는 괜찮고, 공개 인터넷에 민감 정보를 넣지 마세요.

### 6) 로컬 실행

```bash
npm run dev
```

브라우저에서 표시되는 주소(보통 `http://localhost:5173`)로 접속합니다.

`.env`를 안 채우면 **「Firebase를 연결해 주세요」** 안내 화면이 뜹니다.

---

## 사용 흐름

1. **Voting Table 열기** → 6자리 Seed 발급 → 호스트 콘솔
2. 대표단은 **Join Table**에 Seed 입력 → ID(국가명 등) 등록 (중복 불가)
3. 호스트가 Topic 입력 후 **Vote 시작**
4. 대표단이 찬성/반대/기권 중 하나 선택 (**번복 불가**, 이름 옆 LED 색 변경)
5. 전원이 투표하면 자동으로 결과(원형 차트) / 호스트가 **END VOTE**로 조기 종료 가능
6. **새 Topic으로** → 다시 Topic 입력 단계

호스트 권한은 Table을 연 브라우저의 `localStorage`에 저장됩니다. 다른 PC에서는 호스트 조작이 안 됩니다.

---

## Vercel에 올리기 (무료)

1. GitHub에 이 폴더를 푸시 (`.env`는 올리지 마세요 — `.gitignore`에 포함됨)
2. [vercel.com](https://vercel.com) → Import Project
3. **Environment Variables**에 `.env`와 같은 `VITE_FIREBASE_…` 키 7개를 모두 등록
4. Deploy

배포 후에도 Firebase Console에서 데이터가 오가는지만 확인하면 됩니다.

---

## 폴더 구조 (요약)

```
src/
  pages/       Home, Host, Display, Join, Guide
  components/  전광판·통계·결과 차트
  lib/         Firebase 연결 + 방/투표 로직
```

문제 생기면: Firebase `.env` 값 / Realtime Database 생성 여부 / Vercel 환경변수 재배포를 먼저 확인하세요.
