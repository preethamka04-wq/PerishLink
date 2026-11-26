import { useCallback, useState } from 'react'
import './App.css'
import Auth from './pages/Auth'
import ListingBoard from './pages/ListingBoard'
import VolunteerDashboard from './pages/VolunteerDashboard'
import ShelterDashboard from './pages/ShelterDashboard'
import GeospatialMatching from './pages/GeospatialMatching'

function App() {
  const [authMode, setAuthMode] = useState(null)

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('perishlink.user') || 'null')
    } catch {
      return null
    }
  })

  const [dashboard, setDashboard] = useState('donor')

  const signOut = useCallback(() => {
    window.localStorage.removeItem('perishlink.token')
    window.localStorage.removeItem('perishlink.user')
    setCurrentUser(null)
    setDashboard('donor')
  }, [])

  const expireSession = useCallback(() => {
    signOut()
    setAuthMode('login')
  }, [signOut])

  if (currentUser) {
    return (
      <div>
        <nav className="navbar">
          <a href="#home" className="logo">🌱 PerishLink</a>

          <div className="nav-buttons">
            <button onClick={() => setDashboard('donor')}>
              Donor
            </button>

            <button onClick={() => setDashboard('volunteer')}>
              Volunteer
            </button>

            <button onClick={() => setDashboard('shelter')}>
              Shelter
            </button>

            <button onClick={() => setDashboard('matching')}>
              Geospatial Matching
            </button>

            <button onClick={signOut}>
              Logout
            </button>
          </div>
        </nav>

        {dashboard === 'donor' && (
          <ListingBoard
            user={currentUser}
            onSignOut={signOut}
            onSessionExpired={expireSession}
          />
        )}

        {dashboard === 'volunteer' && (
          <VolunteerDashboard />
        )}

        {dashboard === 'shelter' && (
          <ShelterDashboard />
        )}

        {dashboard === 'matching' && (
          <GeospatialMatching />
        )}
      </div>
    )
  }

  if (authMode) {
    return (
      <Auth
        initialMode={authMode}
        onBack={() => setAuthMode(null)}
        onAuthenticated={setCurrentUser}
      />
    )
  }

  return (
    <div className="app">
      <nav className="navbar">
        <a href="#home" className="logo">🌱 PerishLink</a>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#impact">Our Impact</a>
        </div>

        <div className="nav-buttons">
          <button
            type="button"
            className="login-btn"
            onClick={() => setAuthMode('login')}
          >
            Login
          </button>

          <button
            type="button"
            className="nav-cta"
            onClick={() => setAuthMode('register')}
          >
            Register ↗
          </button>
        </div>
      </nav>

      <section className="hero" id="home">
        <div className="hero-content">
          <span className="hero-tag">
            🌍 Together for a zero-waste future
          </span>

          <h1>
            Good Food.<br />
            <span>Zero Waste.</span><br />
            Better Tomorrow.
          </h1>

          <p>
            PerishLink connects food donors with people and
            organizations in need. Rescue surplus food, reduce
            waste, and make every meal count.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-btn"
              onClick={() => setAuthMode('register')}
            >
              Donate Food →
            </button>

            <button
              className="secondary-btn"
              onClick={() => setAuthMode('register')}
            >
              Find Food
            </button>
          </div>
        </div>

        <div className="hero-image">
          <div className="hero-image-card">
            <div className="food-emoji">🥗</div>
            <h3>Save Food. Share Hope.</h3>
            <p>Every rescued meal makes a difference.</p>
          </div>
        </div>
      </section>

      <section className="impact-section" id="impact">
        <div className="section-heading">
          <span>OUR IMPACT</span>
          <h2>Small Actions, Big Impact</h2>
          <p>
            Together, we can make sure good food reaches people
            instead of landfills.
          </p>
        </div>

        <div className="stats-container">
          <div className="stat-card">
            <h2>2,500+</h2>
            <p>Meals Rescued</p>
          </div>
          <div className="stat-card">
            <h2>150+</h2>
            <p>Food Donors</p>
          </div>
          <div className="stat-card">
            <h2>80+</h2>
            <p>Partner Shelters</p>
          </div>
          <div className="stat-card">
            <h2>500+</h2>
            <p>Volunteers</p>
          </div>
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-heading">
          <span>HOW IT WORKS</span>
          <h2>Food Rescue Made Simple</h2>
          <p>
            Three simple steps to turn surplus food into
            meaningful impact.
          </p>
        </div>

        <div className="steps-container">
          <div className="step-card">
            <div className="step-icon">🍱</div>
            <h3>1. Donate Food</h3>
            <p>
              Restaurants, stores, and individuals list their
              surplus food on PerishLink.
            </p>
          </div>

          <div className="step-card">
            <div className="step-icon">📍</div>
            <h3>2. Connect & Match</h3>
            <p>
              Our network helps connect available food with
              nearby shelters and communities.
            </p>
          </div>

          <div className="step-card">
            <div className="step-icon">🚚</div>
            <h3>3. Rescue & Deliver</h3>
            <p>
              Coordinate pickups and help good food reach
              people who need it.
            </p>
          </div>
        </div>
      </section>

      <section className="cta-section" id="donate">
        <h2>Be Part of the Food Rescue Movement</h2>
        <p>
          Your contribution can help reduce food waste and
          feed communities.
        </p>
        <button
          className="cta-button"
          onClick={() => setAuthMode('register')}
        >
          Join PerishLink Today →
        </button>
      </section>

      <footer className="footer">
        <a href="#home" className="logo">🌱 PerishLink</a>
        <p>Connecting surplus food with those who need it.</p>
        <p className="copyright">
          © {new Date().getFullYear()} PerishLink. All rights reserved.
        </p>
      </footer>
    </div>
  )
}

export default App