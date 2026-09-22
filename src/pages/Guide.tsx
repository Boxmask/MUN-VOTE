import { Link } from 'react-router-dom'
import './Guide.css'

export function Guide() {
  return (
    <div className="guide">
      <div className="guide-inner">
        <Link className="guide-back" to="/">
          ← 홈
        </Link>
        <p className="guide-eyebrow">Host tip</p>
        <h1>화면 공유: 조작창 ≠ 전광판</h1>
        <p className="guide-lead">
          Mac에서 Zoom·FaceTime·AirPlay로 공유할 때, 호스트 콘솔까지 보이면 안 됩니다.
          이 앱은 <strong>조작용</strong>과 <strong>공유용</strong> URL을 나눠 두었습니다.
        </p>

        <ol className="guide-steps">
          <li>
            <strong>Voting Table 열기</strong>로 방을 만듭니다. 호스트 콘솔(
            <code>/host/시드</code>)이 열립니다.
          </li>
          <li>
            왼쪽의 <strong>전광판 열기</strong>를 눌러 새 창(
            <code>/display/시드</code>)을 띄웁니다. 이 창에는 버튼·명단 조작이 없습니다.
          </li>
          <li>
            Zoom / 미팅 앱에서 <strong>화면 공유 → 창(Window)</strong>을 고르고,{' '}
            <em>전광판 창만</em> 선택합니다. (전체 화면·데스크톱 공유는 피하세요.)
          </li>
          <li>
            Topic 입력·Vote·END VOTE는 호스트 콘솔 창에서만 합니다. 공유 중인 전광판은
            자동으로 따라갑니다.
          </li>
        </ol>

        <div className="guide-callout">
          <h2>애플(Mac)에서 잘 되는 패턴</h2>
          <ul>
            <li>
              호스트 콘솔은 노트북에 두고, 전광판 창을 프로젝터/외부 모니터로 옮긴 뒤 그
              디스플레이만 공유해도 됩니다.
            </li>
            <li>
              iPhone/iPad로 호스트 콘솔을 열고, Mac Safari의 전광판만 AirPlay하는 방법도
              있습니다. (같은 Seed, 다만 호스트 권한은 Table을 연 브라우저에만 있습니다.)
            </li>
            <li>
              전광판 링크를 복사해 별도 브라우저 프로필·기기에서 열어도 됩니다. 읽기 전용
              전광판이라 조작 권한이 없습니다.
            </li>
          </ul>
        </div>

        <div className="guide-diagram" aria-hidden>
          <div className="guide-box">
            <span>당신만 봄</span>
            <strong>호스트 콘솔</strong>
            <small>Topic · Vote · END</small>
          </div>
          <div className="guide-arrow">공유 →</div>
          <div className="guide-box guide-box--public">
            <span>모두가 봄</span>
            <strong>전광판</strong>
            <small>이름 · LED · 결과</small>
          </div>
        </div>
      </div>
    </div>
  )
}
