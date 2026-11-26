import { useEffect, useState } from 'react';
import socket from '../socket';

const API = 'http://localhost:5000';

function VolunteerDashboard() {
  const [pickups, setPickups] = useState([]);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  const token = localStorage.getItem('perishlink.token');

  async function loadData() {
    try {
      const headers = {
        Authorization: `Bearer ${token}`
      };

      const [listingResponse, pickupResponse] = await Promise.all([
        fetch(`${API}/api/listings`, { headers }),
        fetch(`${API}/api/pickups`, { headers })
      ]);

      if (!listingResponse.ok || !pickupResponse.ok) {
        throw new Error('Unable to load food or pickup requests.');
      }

      const listingData = await listingResponse.json();
      const pickupData = await pickupResponse.json();

      setListings(listingData.listings || []);
      setPickups(pickupData);
    } catch (err) {
      setError(err.message);
    }
  }

  async function requestPickup(listingId) {
    try {
      const response = await fetch(`${API}/api/pickups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ listingId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Pickup request failed.');
      }

      alert(data.message);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function updateStatus(id, status) {
    try {
      const response = await fetch(
        `${API}/api/pickups/${id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Update failed');
      }

      alert(data.message);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  useEffect(() => {
    loadData();

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const refresh = setInterval(loadData, 10000);

    function handleUpdate(data) {
      setPickups(previous =>
        previous.map(item =>
          item.id === data.id ? { ...item, ...data } : item
        )
      );
    }

    socket.on('pickup-status-changed', handleUpdate);

    return () => {
      clearInterval(timer);
      clearInterval(refresh);
      socket.off('pickup-status-changed', handleUpdate);
    };
  }, []);

  function countdown(expiryTime) {
    const difference = new Date(expiryTime).getTime() - now;

    if (!Number.isFinite(difference) || difference <= 0) {
      return 'Expired';
    }

    const hours = Math.floor(difference / 3600000);
    const minutes = Math.floor((difference % 3600000) / 60000);
    const seconds = Math.floor((difference % 60000) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  }

  const availableListings = listings.filter(listing =>
    new Date(listing.expiryTime).getTime() > now &&
    new Date(listing.pickupBy).getTime() > now
  );

  return (
    <div style={{ padding: '25px' }}>
      <h1>🚚 Volunteer Dashboard</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2>🍱 Available Food</h2>

      {availableListings.length === 0 ? (
        <p>No available food listings.</p>
      ) : (
        availableListings.map(listing => {
          const alreadyRequested = pickups.some(
            pickup => Number(pickup.listing_id) === Number(listing.id)
          );

          return (
            <div
              key={listing.id}
              style={{
                border: '1px solid #ccc',
                padding: '15px',
                margin: '12px 0',
                borderRadius: '8px'
              }}
            >
              <h3>{listing.foodName}</h3>

              <p>
                Quantity: {listing.quantity} {listing.unit}
              </p>

              <p>Pickup location: {listing.pickupLocation}</p>

              <p>
                Expiry countdown:
                <strong> {countdown(listing.expiryTime)}</strong>
              </p>

              {alreadyRequested ? (
                <p>✓ Pickup request already exists</p>
              ) : (
                <button onClick={() => requestPickup(listing.id)}>
                  Request Pickup
                </button>
              )}
            </div>
          );
        })
      )}

      <hr />

      <h2>📦 My Pickup Management</h2>

      {pickups.length === 0 ? (
        <p>No pickup requests available.</p>
      ) : (
        pickups.map(pickup => (
          <div
            key={pickup.id}
            style={{
              border: '1px solid #ccc',
              padding: '15px',
              margin: '12px 0',
              borderRadius: '8px'
            }}
          >
            <h3>{pickup.food_name}</h3>

            <p>
              Quantity: {pickup.quantity} {pickup.unit}
            </p>

            <p>Pickup location: {pickup.pickup_location}</p>

            <p>
              Request status:
              <strong> {pickup.request_status}</strong>
            </p>

            <p>
              Pickup status:
              <strong> {pickup.status}</strong>
            </p>

            {pickup.request_status === 'approved' &&
              ['pending', 'assigned'].includes(pickup.status) && (
                <button
                  onClick={() => updateStatus(pickup.id, 'picked_up')}
                >
                  Mark Picked Up
                </button>
              )}

            {pickup.status === 'picked_up' && (
              <button
                onClick={() => updateStatus(pickup.id, 'delivered')}
              >
                Mark Delivered
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default VolunteerDashboard;