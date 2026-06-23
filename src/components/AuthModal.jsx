import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { X, Eye, EyeOff } from 'lucide-react'

export default function AuthModal({ onClose, onSuccess }) {
  const { login, register } = useAuth()
  const [tab, setTab]         = useState('login')
  const [email, setEmail]     = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let result
      if (tab === 'login') {
        result = await login(email.trim(), password)
      } else {
        result = await register(email.trim(), password, username.trim())
      }
      setLoading(false)
      if (result && result.ok) {
        if (onSuccess) {
          onSuccess()
        } else {
          onClose()
        }
      } else if (result) {
        setError(result.msg || 'Something went wrong')
      }
    } catch (err) {
      setLoading(false)
      setError(err.message || 'Something went wrong')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={16} /></button>

        <div className="modal-tabs">
          <button className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); setError('') }}>login</button>
          <button className={tab === 'register' ? 'active' : ''} onClick={() => { setTab('register'); setError('') }}>register</button>
        </div>

        <form onSubmit={submit} className="modal-form">
          <div className="field">
            <label>email</label>
            <input
              type="email" value={email} autoFocus
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>
          {tab === 'register' && (
            <div className="field">
              <label>username</label>
              <input
                type="text" value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your username"
                autoComplete="username"
              />
            </div>
          )}
          <div className="field">
            <label>password</label>
            <div className="password-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(prev => !prev)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="modal-error">{error}</p>}
          <button type="submit" className="modal-submit" disabled={loading}>
            {loading ? '...' : tab === 'login' ? 'sign in' : 'create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
