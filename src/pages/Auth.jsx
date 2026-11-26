
import { useState } from 'react'
import './Auth.css'

function Auth({ initialMode = 'register', onBack, onAuthenticated }) {
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    organization: ''
  })

  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isSubmitting) return

    if (mode === 'register' && !form.name.trim()) {
      setMessage('Please enter your full name.')
      setMessageType('error')
      return
    }

    if (!form.email.trim() || !form.password) {
      setMessage('Please enter your email and password.')
      setMessageType('error')
      return
    }

    if (mode === 'register' && form.password.length < 8) {
      setMessage('Password must contain at least 8 characters.')
      setMessageType('error')
      return
    }

    setIsSubmitting(true)
    setMessage('')
    setMessageType('')

    try {
      const response = await fetch(`http://localhost:5000/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          organization: form.organization,
        }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.message || 'We could not complete your request. Please try again.')
      }

      window.localStorage.setItem('perishlink.token', result.token)
      window.localStorage.setItem('perishlink.user', JSON.stringify(result.user))
      onAuthenticated?.(result.user)
      setMessage(result.message)
      setMessageType('success')
    } catch (error) {
      setMessage(error instanceof TypeError
        ? 'Could not reach PerishLink. Check that the backend is running and try again.'
        : error.message)
      setMessageType('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <button className="back-btn" type="button" onClick={onBack}>
          ← Back to Home
        </button>

        <div className="auth-logo">🌱 PerishLink</div>

        <h1>
          {mode === 'register' ? 'Join PerishLink' : 'Welcome Back'}
        </h1>

        <p className="auth-subtitle">
          {mode === 'register'
            ? 'Help us rescue surplus food and feed communities.'
            : 'Sign in to continue your food rescue journey.'}
        </p>

        <div className="auth-tabs">
          <button
            className={mode === 'login' ? 'active' : ''}
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setMode('login')
              setMessage('')
              setMessageType('')
            }}
          >
            Login
          </button>

          <button
            className={mode === 'register' ? 'active' : ''}
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setMode('register')
              setMessage('')
              setMessageType('')
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>

          {mode === 'register' && (
            <>
              <label>Full Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                maxLength={120}
              />

              <label>Organization / Restaurant</label>
              <input
                name="organization"
                value={form.organization}
                onChange={handleChange}
                placeholder="Enter organization name"
                maxLength={160}
              />

              <label>Phone Number</label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                maxLength={40}
              />
            </>
          )}

          <label>Email Address</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
          />

          <label>Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Minimum 8 characters"
            minLength={mode === 'register' ? 8 : undefined}
            required
          />

          {message && (
            <div className={`auth-message ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>
              {message}
            </div>
          )}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? (mode === 'register' ? 'Creating account…' : 'Signing in…')
              : (mode === 'register' ? 'Create Account →' : 'Login →')}
          </button>

        </form>

        <p className="auth-footer">
          Together we can reduce food waste and fight hunger. 💚
        </p>

      </div>
    </div>
  )
}

export default Auth
