import { useCallback, useEffect, useMemo, useState } from 'react';
import './ListingBoard.css';

const API_BASE = 'http://localhost:5000';

const emptyForm = {
  foodName: '',
  quantity: '',
  unit: 'servings',
  pickupLocation: '',
  pickupBy: '',
  preparationTime: '',
  expiryTime: '',
  storageInstructions: '',
  allergenInfo: '',
  notes: '',
};

function localDateTimeMinimum() {
  const date = new Date(Date.now() + 60000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time not available'
    : date.toLocaleString();
}

function getCountdown(value, now) {
  const difference = new Date(value).getTime() - now;

  if (!Number.isFinite(difference) || difference <= 0) {
    return 'Expired';
  }

  const days = Math.floor(difference / 86400000);
  const hours = Math.floor((difference % 86400000) / 3600000);
  const minutes = Math.floor((difference % 3600000) / 60000);
  const seconds = Math.floor((difference % 60000) / 1000);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function ListingBoard({ user, onSignOut, onSessionExpired }) {
  const [listings, setListings] = useState([]);
  const [pickupRequests, setPickupRequests] = useState([]);
  const [requestError, setRequestError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());

  // Load pickup requests belonging to the logged-in donor.
  const loadPickupRequests = useCallback(async () => {
    setRequestError('');

    try {
      const token = window.localStorage.getItem('perishlink.token');

      const response = await fetch(
        `${API_BASE}/api/donor/pickup-requests`,
        {
          headers: {
            Authorization: `Bearer ${token || ''}`,
          },
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message || 'Could not load pickup requests.'
        );
      }

      if (!Array.isArray(result)) {
        throw new Error('Invalid pickup requests response from server.');
      }

      setPickupRequests(result);
    } catch (err) {
      setRequestError(err.message);
    }
  }, [onSessionExpired]);

  // Load pickup requests when the donor dashboard opens.
  useEffect(() => {
    loadPickupRequests();

    const timer = window.setInterval(() => {
      loadPickupRequests();
    }, 10000);

    return () => window.clearInterval(timer);
  }, [loadPickupRequests]);

  // Update countdown every second.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  // Load available food listings.
  const loadListings = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/listings`, {
        headers: {
          Authorization: `Bearer ${
            window.localStorage.getItem('perishlink.token') || ''
          }`,
        },
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message || 'Could not load available food.'
        );
      }

      setListings(result.listings || []);
    } catch (loadError) {
      setError(
        loadError instanceof TypeError
          ? 'Could not reach PerishLink. Make sure the backend is running.'
          : loadError.message
      );
    } finally {
      setLoading(false);
    }
  }, [onSessionExpired]);

  useEffect(() => {
    const timer = window.setTimeout(loadListings, 0);
    return () => window.clearTimeout(timer);
  }, [loadListings]);

  // Refresh food listings periodically.
  useEffect(() => {
    const timer = window.setInterval(() => {
      loadListings();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [loadListings]);

  // Approve or reject volunteer requests.
  async function updateRequestStatus(id, requestStatus) {
    try {
      const token = window.localStorage.getItem('perishlink.token');

      const response = await fetch(
        `${API_BASE}/api/pickups/${id}/request-status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token || ''}`,
          },
          body: JSON.stringify({ requestStatus }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || 'Could not update request.'
        );
      }

      setNotice(result.message);
      await loadPickupRequests();
    } catch (err) {
      setRequestError(err.message);
    }
  }

  function updateForm(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  // Publish a new food listing.
  async function createListing(event) {
    event.preventDefault();

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      const preparationDate = new Date(form.preparationTime);
      const expiryDate = new Date(form.expiryTime);
      const pickupDate = new Date(form.pickupBy);

      if (
        Number.isNaN(preparationDate.getTime()) ||
        Number.isNaN(expiryDate.getTime()) ||
        Number.isNaN(pickupDate.getTime())
      ) {
        throw new Error(
          'Please enter valid preparation, expiry, and pickup times.'
        );
      }

      if (preparationDate > expiryDate) {
        throw new Error(
          'Preparation time cannot be later than expiry time.'
        );
      }

      if (expiryDate <= new Date()) {
        throw new Error('Food expiry time must be in the future.');
      }

      if (pickupDate <= new Date() || pickupDate > expiryDate) {
        throw new Error(
          'Pickup deadline must be in the future and no later than expiry time.'
        );
      }

      const response = await fetch(`${API_BASE}/api/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${
            window.localStorage.getItem('perishlink.token') || ''
          }`,
        },
        body: JSON.stringify({
          ...form,
          pickupBy: pickupDate.toISOString(),
          preparationTime: preparationDate.toISOString(),
          expiryTime: expiryDate.toISOString(),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message || 'Could not publish this listing.'
        );
      }

      setListings((previous) => [result.listing, ...previous]);
      setForm(emptyForm);
      setNotice(
        'Your food listing is now available to the PerishLink community.'
      );
    } catch (submitError) {
      setError(
        submitError instanceof TypeError
          ? 'Could not reach PerishLink. Make sure the backend is running.'
          : submitError.message
      );
    } finally {
      setSubmitting(false);
    }
  }

  const visibleListings = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return listings;

    return listings.filter((listing) =>
      [
        listing.foodName,
        listing.pickupLocation,
        listing.donorName,
        listing.organization,
        listing.allergenInfo,
      ].some((value) => value?.toLowerCase().includes(query))
    );
  }, [listings, search]);

  return (
    <main className="listing-page">
      <header className="listing-topbar">
        <a href="#listings" className="listing-brand">
          🌱 PerishLink
        </a>

        <div className="listing-account">
          <span>Welcome, {user.name}</span>
          <button type="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <section className="listing-welcome">
        <div>
          <span className="listing-eyebrow">FOOD RESCUE BOARD</span>
          <h1>Good food, ready to be rescued.</h1>
          <p>
            Share surplus food or find a nearby pickup. Check storage,
            allergen details, and expiry time before arranging collection.
          </p>
        </div>

        <a className="listing-jump" href="#post-listing">
          + Post food
        </a>
      </section>

      {error && (
        <div className="listing-alert error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="listing-alert success" role="status">
          {notice}
        </div>
      )}

      {/* Volunteer pickup requests for this donor */}
      <section
        style={{
          margin: '20px 0',
          padding: '20px',
          border: '1px solid #ddd',
          borderRadius: '12px',
        }}
      >
        <h2>Volunteer Pickup Requests</h2>

        {requestError && (
          <p style={{ color: 'red' }}>{requestError}</p>
        )}

        {pickupRequests.length === 0 ? (
          <p>No volunteer requests yet.</p>
        ) : (
          pickupRequests.map((request) => (
            <div
              key={request.id}
              style={{
                padding: '15px',
                margin: '12px 0',
                border: '1px solid #ccc',
                borderRadius: '8px',
              }}
            >
              <h3>{request.food_name}</h3>

              <p>
                Quantity: {request.quantity} {request.unit}
              </p>

              <p>
                Volunteer: {request.volunteer_name || 'Not assigned'}
              </p>

              <p>Pickup location: {request.pickup_location}</p>

              <p>
                Request status:{' '}
                <strong>{request.request_status}</strong>
              </p>

              {request.request_status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      updateRequestStatus(request.id, 'approved')
                    }
                  >
                    Approve
                  </button>

                  {' '}

                  <button
                    type="button"
                    onClick={() =>
                      updateRequestStatus(request.id, 'rejected')
                    }
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </section>

      <div className="listing-layout">
        <section
          className="available-panel"
          id="listings"
          aria-labelledby="available-title"
        >
          <div className="panel-heading">
            <div>
              <span className="listing-eyebrow">COMMUNITY OFFERS</span>
              <h2 id="available-title">Available food</h2>
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={loadListings}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          <label className="search-label">
            <span className="visually-hidden">
              Search food listings
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search food, location, or donor"
            />
          </label>

          {loading ? (
            <p className="listing-empty">
              Loading available food…
            </p>
          ) : visibleListings.length ? (
            <div className="food-list">
              {visibleListings.map((listing) => {
                const expired =
                  new Date(listing.expiryTime).getTime() <= now;

                return (
                  <article className="food-card" key={listing.id}>
                    <div className="food-card-top">
                      <div>
                        <h3>{listing.foodName}</h3>
                        <p className="food-quantity">
                          {Number(listing.quantity)} {listing.unit}
                        </p>
                      </div>

                      <span
                        className={
                          expired ? 'expired-pill' : 'available-pill'
                        }
                      >
                        {expired ? 'Expired' : 'Available'}
                      </span>
                    </div>

                    <dl className="food-details">
                      <div>
                        <dt>Pickup location</dt>
                        <dd>{listing.pickupLocation}</dd>
                      </div>

                      <div>
                        <dt>Preparation time</dt>
                        <dd>{formatDate(listing.preparationTime)}</dd>
                      </div>

                      <div>
                        <dt>Expiry time</dt>
                        <dd>{formatDate(listing.expiryTime)}</dd>
                      </div>

                      <div>
                        <dt>Live expiry countdown</dt>
                        <dd
                          className={
                            expired
                              ? 'expired-countdown'
                              : 'expiry-countdown'
                          }
                        >
                          {getCountdown(listing.expiryTime, now)}
                        </dd>
                      </div>

                      <div>
                        <dt>Pickup by</dt>
                        <dd>{formatDate(listing.pickupBy)}</dd>
                      </div>

                      <div>
                        <dt>Shared by</dt>
                        <dd>
                          {listing.organization || listing.donorName}
                        </dd>
                      </div>

                      {listing.storageInstructions && (
                        <div>
                          <dt>Storage</dt>
                          <dd>{listing.storageInstructions}</dd>
                        </div>
                      )}

                      <div>
                        <dt>Allergen information</dt>
                        <dd>
                          {listing.allergenInfo || 'Not provided'}
                        </dd>
                      </div>

                      {listing.notes && (
                        <div>
                          <dt>Notes</dt>
                          <dd>{listing.notes}</dd>
                        </div>
                      )}
                    </dl>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="listing-empty">
              <span>🥕</span>
              <h3>
                {search ? 'No matching food' : 'No food listed yet'}
              </h3>
              <p>
                {search
                  ? 'Try a different search.'
                  : 'Post a surplus food offer and it will appear here for the community.'}
              </p>
            </div>
          )}
        </section>

        <aside className="post-panel" id="post-listing">
          <span className="listing-eyebrow">DONATE SURPLUS</span>
          <h2>Post a food offer</h2>
          <p className="post-intro">
            Add preparation, expiry, pickup, storage, and allergen details.
          </p>

          <form onSubmit={createListing}>
            <label>
              Food name
              <input
                name="foodName"
                value={form.foodName}
                onChange={updateForm}
                placeholder="e.g. Vegetable rice bowls"
                maxLength={120}
                required
              />
            </label>

            <div className="quantity-row">
              <label>
                Quantity
                <input
                  name="quantity"
                  type="number"
                  value={form.quantity}
                  onChange={updateForm}
                  min="0.1"
                  max="100000"
                  step="0.1"
                  placeholder="20"
                  required
                />
              </label>

              <label>
                Unit
                <select
                  name="unit"
                  value={form.unit}
                  onChange={updateForm}
                >
                  <option value="servings">Servings</option>
                  <option value="kg">kg</option>
                  <option value="boxes">Boxes</option>
                  <option value="items">Items</option>
                </select>
              </label>
            </div>

            <label>
              Pickup location
              <input
                name="pickupLocation"
                value={form.pickupLocation}
                onChange={updateForm}
                placeholder="Street, area, city"
                maxLength={255}
                required
              />
            </label>

            <label>
              Food preparation date and time
              <input
                name="preparationTime"
                type="datetime-local"
                value={form.preparationTime}
                onChange={updateForm}
                required
              />
            </label>

            <label>
              Food expiry date and time
              <input
                name="expiryTime"
                type="datetime-local"
                value={form.expiryTime}
                onChange={updateForm}
                min={localDateTimeMinimum()}
                required
              />
            </label>

            <label>
              Pickup deadline
              <input
                name="pickupBy"
                type="datetime-local"
                value={form.pickupBy}
                onChange={updateForm}
                min={localDateTimeMinimum()}
                required
              />
            </label>

            <label>
              Storage instructions{' '}
              <span className="optional-label">Optional</span>
              <input
                name="storageInstructions"
                value={form.storageInstructions}
                onChange={updateForm}
                placeholder="Keep refrigerated, contains dairy…"
                maxLength={1000}
              />
            </label>

            <label>
              Allergen information{' '}
              <span className="optional-label">Optional</span>
              <textarea
                name="allergenInfo"
                value={form.allergenInfo}
                onChange={updateForm}
                placeholder="List known allergens or state if unknown"
                rows="2"
                maxLength={1000}
              />
            </label>

            <label>
              Additional notes{' '}
              <span className="optional-label">Optional</span>
              <textarea
                name="notes"
                value={form.notes}
                onChange={updateForm}
                placeholder="Packaging, serving details, or pickup contact"
                rows="2"
                maxLength={1000}
              />
            </label>

            <button
              className="post-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Publishing…' : 'Publish food offer →'}
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}

export default ListingBoard;