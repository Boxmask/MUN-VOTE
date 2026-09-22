import { Link } from 'react-router-dom'
import './SetupGate.css'

export function SetupGate() {
  return (
    <div className="setup-gate">
      <div className="setup-card">
        <p className="setup-eyebrow">Setup required</p>
        <h1>Connect Firebase</h1>
        <p className="setup-lead">
          This app syncs live votes with a free Firebase Realtime Database. Follow the README if
          this is your first time.
        </p>
        <ol className="setup-steps">
          <li>
            Create a project in the{' '}
            <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">
              Firebase Console
            </a>
          </li>
          <li>Create a Realtime Database (test mode is fine to start)</li>
          <li>Project settings → add a web app → copy the config</li>
          <li>
            Add a <code>.env</code> file (or Vercel env vars) with those values
          </li>
          <li>
            Run <code>npm run dev</code> again / Redeploy on Vercel
          </li>
        </ol>
        <p className="setup-note">
          Details are in <strong>README.md</strong>.
        </p>
        <Link className="setup-link" to="/">
          Home
        </Link>
      </div>
    </div>
  )
}
