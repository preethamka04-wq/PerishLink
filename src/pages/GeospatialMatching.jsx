import { useState } from 'react';

function GeospatialMatching() {
  const [listingId, setListingId] = useState('');
  const [food, setFood] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const findMatches = async () => {
    if (!listingId.trim()) {
      setError('Please enter a food listing ID.');
      return;
    }

    setLoading(true);
    setError('');
    setFood(null);
    setMatches([]);

    try {
      const token = localStorage.getItem('perishlink.token');

      const response = await fetch(
        `http://localhost:5000/api/matching/${listingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to find matches.');
      }

      setFood(data.food);
      setMatches(data.matches || []);

      if (!data.matches || data.matches.length === 0) {
        setError('No suitable shelters or cold storage facilities found.');
      }
    } catch (err) {
      setError(err.message || 'Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: '30px',
      minHeight: '80vh',
      background: '#f5f8f5',
      color: '#222'
    }}>
      <h1>📍 Geospatial Food Matching</h1>

      <p>
        Find nearby shelters and cold storage facilities
        for available food donations.
      </p>

      <div style={{
        background: 'white',
        padding: '25px',
        marginTop: '20px',
        borderRadius: '12px',
        maxWidth: '500px'
      }}>
        <h3>Find Suitable Facilities</h3>

        <label>Food Listing ID</label>

        <input
          type="number"
          value={listingId}
          onChange={(e) => setListingId(e.target.value)}
          placeholder="Enter food listing ID"
          style={{
            display: 'block',
            width: '100%',
            padding: '12px',
            marginTop: '10px',
            marginBottom: '15px',
            boxSizing: 'border-box'
          }}
        />

        <button
          type="button"
          onClick={findMatches}
          disabled={loading}
          style={{
            padding: '12px 20px',
            background: '#16834a',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Finding Matches...' : 'Find Matches'}
        </button>
      </div>

      {error && (
        <p style={{
          marginTop: '20px',
          color: '#c62828',
          fontWeight: 'bold'
        }}>
          {error}
        </p>
      )}

      {food && (
        <div style={{
          background: 'white',
          padding: '20px',
          marginTop: '25px',
          borderRadius: '12px'
        }}>
          <h2>🍱 Food Details</h2>
          <p><strong>Food:</strong> {food.name}</p>
          <p><strong>Quantity:</strong> {food.quantity} {food.unit}</p>
          <p>
            <strong>Expiry / Pickup deadline:</strong>{' '}
            {food.expiryTime
              ? new Date(food.expiryTime).toLocaleString()
              : 'Not available'}
          </p>
        </div>
      )}

      {matches.length > 0 && (
        <div style={{ marginTop: '25px' }}>
          <h2>🏠 Suitable Facilities</h2>

          {matches.map((facility) => (
            <div
              key={facility.id}
              style={{
                background: 'white',
                padding: '20px',
                marginBottom: '15px',
                borderRadius: '12px',
                borderLeft: '5px solid #16834a'
              }}
            >
              <h3>{facility.name}</h3>

              <p>
                <strong>Organization:</strong>{' '}
                {facility.organization || 'Not provided'}
              </p>

              <p>
                <strong>Facility Type:</strong>{' '}
                {facility.facilityType}
              </p>

              <p>
                <strong>Storage Capacity:</strong>{' '}
                {facility.capacity}
              </p>

              <p>
                <strong>Distance:</strong>{' '}
                {facility.distanceKm} km
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GeospatialMatching;