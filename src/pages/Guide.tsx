import { Link } from 'react-router-dom'
import './Guide.css'

export function Guide() {
  return (
    <div className="guide">
      <div className="guide-inner">
        <Link className="guide-back" to="/">
          ← Home
        </Link>
        <p className="guide-eyebrow">Host tip</p>
        <h1>Screen share: controls ≠ display</h1>
        <p className="guide-lead">
          On Mac (Zoom, FaceTime, AirPlay), do not share the host console. This app splits{' '}
          <strong>controls</strong> and the <strong>public board</strong> into different URLs.
        </p>

        <ol className="guide-steps">
          <li>
            Open a table with <strong>Open Voting Table</strong>. The host console (
            <code>/host/seed</code>) opens.
          </li>
          <li>
            Click <strong>Open Display Board</strong> for a new window (<code>/display/seed</code>
            ). No control buttons there.
          </li>
          <li>
            In your meeting app choose <strong>Share → Window</strong> and pick{' '}
            <em>only the display board</em>. Avoid sharing the whole desktop.
          </li>
          <li>
            Enter topics, start votes, and END VOTE from the host console. The shared board updates
            live.
          </li>
        </ol>

        <div className="guide-callout">
          <h2>Mac-friendly setups</h2>
          <ul>
            <li>
              Keep the host console on your laptop; move the display window to a projector or second
              monitor and share that display.
            </li>
            <li>
              Or open the host console on a phone and AirPlay only the Mac Safari display board.
              (Host permission stays on the browser that opened the table.)
            </li>
            <li>
              You can copy the display link to another browser profile or device. It is read-only.
            </li>
          </ul>
        </div>

        <div className="guide-diagram" aria-hidden>
          <div className="guide-box">
            <span>You only</span>
            <strong>Host console</strong>
            <small>Topic · Vote · END</small>
          </div>
          <div className="guide-arrow">share →</div>
          <div className="guide-box guide-box--public">
            <span>Everyone</span>
            <strong>Display board</strong>
            <small>Names · LEDs · Results</small>
          </div>
        </div>
      </div>
    </div>
  )
}
