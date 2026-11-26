import { useEffect, useState } from 'react';
import socket from '../socket';

const API = 'http://localhost:5000';

function ShelterDashboard() {
  const [pickups, setPickups] = useState([]);
  const [error, setError] = useState('');

  async function confirmReceived(id) {
    try {
      const token = localStorage.getItem('perishlink.token');

      const response = await fetch(
        `${API}/api/pickups/${id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            status: 'received_confirmed'
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Confirmation failed');
      }

      setPickups((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, ...data.pickup } : item
        )
      );

      alert('Food receipt confirmed successfully!');
    } catch (err) {
      alert(err.message);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('perishlink.token');

    async function loadPickups() {
      try {
        const response = await fetch(`${API}/api/pickups`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Unable to load deliveries');
        }

        const data = await response.json();
        setPickups(data);
      } catch (err) {
        setError(err.message);
      }
    }

    function handleUpdate(data) {
      setPickups((previous) =>
        previous.map((item) =>
          item.id === data.id ? { ...item, ...data } : item
        )
      );
    }

    loadPickups();
    socket.on('pickup-status-changed', handleUpdate);

    return () => {
      socket.off('pickup-status-changed', handleUpdate);
    };
  }, []);

  return (
    <div style={{ padding: '25px' }}>
      <h1>🏠 Shelter Dashboard</h1>
      <h3>Incoming Food Deliveries</h3>

      {error && <p>{error}</p>}

      {pickups.length === 0 ? (
        <p>No incoming food deliveries.</p>
      ) : (
        pickups.map((pickup) => (
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
              Delivery status: <strong>{pickup.status}</strong>
            </p>

            {pickup.status === 'delivered' && (
              <button onClick={() => confirmReceived(pickup.id)}>
                Confirm Received
              </button>
            )}

            {pickup.status === 'received_confirmed' && (
              <p style={{ color: 'green', fontWeight: 'bold' }}>
                ✓ Food Receipt Confirmed
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default ShelterDashboard;