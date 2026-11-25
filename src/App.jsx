
import { useState } from 'react'
import './App.css'
import Auth from './pages/Auth'

function App() {
  const [authMode, setAuthMode] = useState(null)

  // Show Login or Register page
  if (authMode) {
    return (
      <Auth
        initialMode={authMode}
        onBack={() => setAuthMode(null)}
      />
    )
  }

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <a href="#home" className="logo">
          🌱 PerishLink
        </a>

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

      {/* Hero Section */}
      <section className="hero" id="home">
        <div className="hero-content">
          <span className="hero-tag">
            🌍 Together for a zero-waste future
          </span>

          <h1>
            Good Food.
            <br />
            <span>Zero Waste.</span>
            <br />
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

      {/* Impact Section */}
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

      {/* How It Works */}
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

      {/* Call To Action */}
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

      {/* Footer */}
      <footer className="footer">
        <a href="#home" className="logo">
          🌱 PerishLink
        </a>

        <p>
          Connecting surplus food with those who need it.
        </p>

        <p className="copyright">
          © {new Date().getFullYear()} PerishLink. All rights reserved.
        </p>
      </footer>
    </div>
  )
}

export default App
