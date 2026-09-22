import { Link } from 'react-router-dom'
import './SetupGate.css'

export function SetupGate() {
  return (
    <div className="setup-gate">
      <div className="setup-card">
        <p className="setup-eyebrow">설정 필요</p>
        <h1>Firebase를 연결해 주세요</h1>
        <p className="setup-lead">
          이 앱은 무료 Firebase Realtime Database로 실시간 투표를 동기화합니다.
          처음이어도 README의 단계만 따라하면 됩니다.
        </p>
        <ol className="setup-steps">
          <li>
            <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">
              Firebase Console
            </a>
            에서 프로젝트 만들기
          </li>
          <li>Realtime Database 생성 (테스트 모드로 시작해도 됨)</li>
          <li>프로젝트 설정 → 웹 앱 추가 → 설정값 복사</li>
          <li>
            프로젝트 폴더에 <code>.env</code> 파일을 만들고 값을 붙여넣기
          </li>
          <li>
            터미널에서 <code>npm run dev</code> 다시 실행
          </li>
        </ol>
        <p className="setup-note">
          자세한 한글 가이드는 프로젝트의 <strong>README.md</strong>에 있습니다.
        </p>
        <Link className="setup-link" to="/">
          홈으로
        </Link>
      </div>
    </div>
  )
}
