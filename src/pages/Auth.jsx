
import { useState } from 'react'
import './Auth.css'

function Auth({ initialMode = 'register', onBack }) {
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    organization: ''
  })

  const [message, setMessage] = useState('')

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (mode === 'register' && !form.name.trim()) {
      setMessage('Please enter your full name.')
      return
    }

    if (!form.email.trim() || !form.password) {
      setMessage('Please enter your email and password.')
      return
    }

    if (mode === 'register' && form.password.length < 8) {
      setMessage('Password must contain at least 8 characters.')
      return
    }

    setMessage(
      mode === 'register'
        ? 'Registration form validated! Backend connection is coming next.'
        : 'Login form validated! Backend connection is coming next.'
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <button className="back-btn" onClick={onBack}>
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
            onClick={() => {
              setMode('login')
              setMessage('')
            }}
          >
            Login
          </button>

          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => {
              setMode('register')
              setMessage('')
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
              />

              <label>Organization / Restaurant</label>
              <input
                name="organization"
                value={form.organization}
                onChange={handleChange}
                placeholder="Enter organization name"
              />

              <label>Phone Number</label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
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
            <div className="auth-message" role="status">
              {message}
            </div>
          )}

          <button className="auth-submit" type="submit">
            {mode === 'register' ? 'Create Account →' : 'Login →'}
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
