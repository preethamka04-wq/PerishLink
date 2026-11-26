const crypto = require('node:crypto');
const { promisify } = require('node:util');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const scrypt = promisify(crypto.scrypt);

const PORT = Number(process.env.PORT || 5000);
const tokenSecret = process.env.AUTH_TOKEN_SECRET;

if (!tokenSecret || tokenSecret.length < 32) {
  throw new Error('Set AUTH_TOKEN_SECRET to a random value of at least 32 characters in backend/.env.');
}

app.use(cors());
app.use(express.json({ limit: '10kb' }));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'perishlink',
  waitForConnections: true,
  connectionLimit: 10,
});

// Generate authentication token
function signToken(user) {
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', tokenSecret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

// Verify authentication token
function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';

  const [payload, signature, extra] = token.split('.');

  if (!payload || !signature || extra) {
    return res.status(401).json({
      message: 'Please sign in to continue.',
    });
  }

  const expectedSignature = crypto
    .createHmac('sha256', tokenSecret)
    .update(payload)
    .digest();

  const suppliedSignature = Buffer.from(signature, 'base64url');

  if (
    suppliedSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return res.status(401).json({
      message: 'Your session is invalid.',
    });
  }

  try {
    const claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    );

    if (
      !claims.sub ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000
    ) {
      return res.status(401).json({
        message: 'Your session has expired.',
      });
    }

    req.authUserId = claims.sub;
    next();
  } catch {
    return res.status(401).json({
      message: 'Your session is invalid.',
    });
  }
}

// Public user information
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    organization: user.organization,
  };
}

// Validate registration and login details
function validateCredentials(req, res, includeProfile = false) {
  const {
    name,
    email,
    password,
    phone = '',
    organization = '',
  } = req.body || {};

  const normalizedEmail =
    typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (includeProfile && (typeof name !== 'string' || !name.trim())) {
    res.status(400).json({
      message: 'Please enter your full name.',
    });
    return null;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    res.status(400).json({
      message: 'Please enter a valid email address.',
    });
    return null;
  }

  if (
    typeof password !== 'string' ||
    password.length < (includeProfile ? 8 : 1)
  ) {
    res.status(400).json({
      message: includeProfile
        ? 'Password must contain at least 8 characters.'
        : 'Please enter your password.',
    });
    return null;
  }

  if (password.length > 128) {
    res.status(400).json({
      message: 'Password must be 128 characters or fewer.',
    });
    return null;
  }

  if (
    includeProfile &&
    (typeof phone !== 'string' || typeof organization !== 'string')
  ) {
    res.status(400).json({
      message: 'Please check your profile details.',
    });
    return null;
  }

  return {
    name: typeof name === 'string' ? name.trim() : '',
    email: normalizedEmail,
    password,
    phone: typeof phone === 'string' ? phone.trim() : '',
    organization:
      typeof organization === 'string' ? organization.trim() : '',
  };
}

// Test backend
app.get('/', (_req, res) => {
  res.json({
    message: 'PerishLink Backend is running!',
  });
});

// Get pickup assignments for Volunteer and Shelter dashboards
app.get('/api/pickups', requireAuth, async (req, res) => {
  try {
    const [pickups] = await pool.query(`
      SELECT
        p.id,
        p.listing_id,
        p.volunteer_id,
        p.shelter_id,
        p.status,
        p.request_status,
        p.pickup_time,
        p.delivery_time,
        f.food_name,
        f.quantity,
        f.unit,
        f.pickup_location,
        f.pickup_by
      FROM pickups p
      JOIN food_listings f ON p.listing_id = f.id
      ORDER BY p.created_at DESC
    `);

    res.json(pickups);
  } catch (error) {
    console.error('Get pickups error:', error);
    res.status(500).json({
      message: 'Unable to retrieve pickups.'
    });
  }
});
// Get pickup requests for the logged-in donor
app.get('/api/donor/pickup-requests', requireAuth, async (req, res) => {
  try {
    const [pickups] = await pool.query(
      `SELECT
         p.id,
         p.listing_id,
         p.volunteer_id,
         p.shelter_id,
         p.status,
         p.request_status,
         p.pickup_time,
         p.delivery_time,
         f.food_name,
         f.quantity,
         f.unit,
         f.pickup_location,
         f.pickup_by,
         u.name AS volunteer_name
       FROM pickups p
       JOIN food_listings f ON p.listing_id = f.id
       LEFT JOIN users u ON p.volunteer_id = u.id
       WHERE f.user_id = ?
       ORDER BY p.created_at DESC`,
      [req.authUserId]
    );

    res.json(pickups);

  } catch (error) {
    console.error('Get donor pickup requests error:', error);

    res.status(500).json({
      message: 'Unable to retrieve pickup requests.'
    });
  }
});
// USER LOGIN
app.post('/api/auth/login', async (req, res, next) => {
  const credentials = validateCredentials(req, res);
  if (!credentials) return;

  try {
    const [rows] = await pool.execute(
      `SELECT id, name, email, password_hash, organization
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [credentials.email]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        message: 'Email or password is incorrect.',
      });
    }

    const [saltHex, hashHex] = user.password_hash.split(':');

    const expectedHash = Buffer.from(hashHex, 'hex');

    const actualHash = await scrypt(
      credentials.password,
      Buffer.from(saltHex, 'hex'),
      expectedHash.length
    );

    if (
      expectedHash.length !== actualHash.length ||
      !crypto.timingSafeEqual(expectedHash, actualHash)
    ) {
      return res.status(401).json({
        message: 'Email or password is incorrect.',
      });
    }

    res.json({
      message: 'You are signed in.',
      user: publicUser(user),
      token: signToken(user),
    });
  } catch (error) {
    next(error);
  }
});

// GET FOOD LISTINGS
app.get('/api/listings', requireAuth, async (_req, res, next) => {
  try {
    // Automatically mark expired food
    await pool.execute(`
      UPDATE food_listings
      SET status = 'expired'
      WHERE status = 'available'
        AND expiry_time IS NOT NULL
        AND expiry_time <= NOW()
    `);

    const [listings] = await pool.execute(`
      SELECT
        l.id,
        l.food_name AS foodName,
        l.quantity,
        l.unit,
        l.pickup_location AS pickupLocation,
        l.pickup_by AS pickupBy,
        l.preparation_time AS preparationTime,
        l.expiry_time AS expiryTime,
        l.storage_instructions AS storageInstructions,
        l.allergen_info AS allergenInfo,
        l.notes,
        l.created_at AS createdAt,
        u.name AS donorName,
        u.organization
      FROM food_listings l
      JOIN users u ON u.id = l.user_id
      WHERE l.status = 'available'
        AND (
          l.expiry_time > NOW()
          OR (
            l.expiry_time IS NULL
            AND l.pickup_by > NOW()
          )
        )
      ORDER BY l.expiry_time ASC, l.created_at DESC
    `);

    res.json({ listings });
  } catch (error) {
    next(error);
  }
});
const EARTH_RADIUS_KM = 6371;

app.get('/api/matching/:listingId', requireAuth, async (req, res) => {
  try {
    const { listingId } = req.params;

    // Get food listing and donor location
    const [listings] = await pool.query(
      `SELECT
         l.id,
         l.food_name,
         l.quantity,
         l.unit,
         l.expiry_time,
         l.pickup_by,
         u.latitude,
         u.longitude
       FROM food_listings l
       JOIN users u ON u.id = l.user_id
       WHERE l.id = ? AND l.status = 'available'`,
      [listingId]
    );

    if (listings.length === 0) {
      return res.status(404).json({
        message: 'Available food listing not found.'
      });
    }

    const food = listings[0];

    if (food.latitude == null || food.longitude == null) {
      return res.status(400).json({
        message: 'Donor location is not available.'
      });
    }

    // Find shelters and cold storages
    const [facilities] = await pool.query(
      `SELECT
         id,
         name,
         organization,
         latitude,
         longitude,
         storage_capacity,
         facility_type
       FROM users
       WHERE facility_type IN ('shelter', 'cold_storage')
         AND latitude IS NOT NULL
         AND longitude IS NOT NULL`
    );

    // Calculate distance and filter by capacity
    const matches = facilities
      .filter((facility) =>
        Number(facility.storage_capacity) >= Number(food.quantity)
      )
      .map((facility) => {
        const lat1 = Number(food.latitude) * Math.PI / 180;
        const lat2 = Number(facility.latitude) * Math.PI / 180;
        const dLat = lat2 - lat1;
        const dLon =
          (Number(facility.longitude) - Number(food.longitude)) *
          Math.PI / 180;

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) *
          Math.sin(dLon / 2) ** 2;

        const distance =
          2 * EARTH_RADIUS_KM *
          Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return {
          id: facility.id,
          name: facility.name,
          organization: facility.organization,
          facilityType: facility.facility_type,
          capacity: Number(facility.storage_capacity),
          distanceKm: Number(distance.toFixed(2))
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({
      food: {
        id: food.id,
        name: food.food_name,
        quantity: Number(food.quantity),
        unit: food.unit,
        expiryTime: food.expiry_time || food.pickup_by
      },
      matches
    });

  } catch (error) {
    console.error('Geospatial matching error:', error);
    res.status(500).json({
      message: 'Unable to find matching facilities.'
    });
  }
});
// CREATE FOOD LISTING
app.post('/api/listings', requireAuth, async (req, res, next) => {

  // DEBUG: Check received food information
  console.log('FOOD LISTING DATA:', {
    foodName: req.body.foodName,
    preparationTime: req.body.preparationTime,
    expiryTime: req.body.expiryTime,
    pickupBy: req.body.pickupBy,
  });

  const {
    foodName,
    quantity,
    unit,
    pickupLocation,
    pickupBy,
    preparationTime,
    expiryTime,
    storageInstructions = '',
    allergenInfo = '',
    notes = '',
  } = req.body || {};

  const parsedQuantity = Number(quantity);

  const pickupDate =
    typeof pickupBy === 'string' ? new Date(pickupBy) : null;

  const preparationDate =
    typeof preparationTime === 'string'
      ? new Date(preparationTime)
      : null;

  const expiryDate =
    typeof expiryTime === 'string'
      ? new Date(expiryTime)
      : null;

  const allowedUnits = [
    'servings',
    'kg',
    'boxes',
    'items',
  ];

  if (
    typeof foodName !== 'string' ||
    !foodName.trim() ||
    foodName.trim().length > 120
  ) {
    return res.status(400).json({
      message: 'Enter a valid food name.',
    });
  }

  if (
    !Number.isFinite(parsedQuantity) ||
    parsedQuantity <= 0 ||
    parsedQuantity > 100000
  ) {
    return res.status(400).json({
      message: 'Quantity must be greater than zero.',
    });
  }

  if (!allowedUnits.includes(unit)) {
    return res.status(400).json({
      message: 'Choose a valid quantity unit.',
    });
  }

  if (
    typeof pickupLocation !== 'string' ||
    !pickupLocation.trim() ||
    pickupLocation.trim().length > 255
  ) {
    return res.status(400).json({
      message: 'Enter a valid pickup location.',
    });
  }

  if (
    !preparationDate ||
    !Number.isFinite(preparationDate.getTime())
  ) {
    return res.status(400).json({
      message: 'Enter a valid preparation date and time.',
    });
  }

  if (
    !expiryDate ||
    !Number.isFinite(expiryDate.getTime()) ||
    expiryDate <= new Date()
  ) {
    return res.status(400).json({
      message: 'Choose a food expiry time in the future.',
    });
  }

  if (
    !pickupDate ||
    !Number.isFinite(pickupDate.getTime()) ||
    pickupDate <= new Date() ||
    pickupDate > expiryDate
  ) {
    return res.status(400).json({
      message: 'Pickup deadline must be in the future and no later than expiry.',
    });
  }

  if (preparationDate > expiryDate) {
    return res.status(400).json({
      message: 'Preparation time cannot be later than expiry time.',
    });
  }

  if (
    [storageInstructions, allergenInfo, notes].some(
      value => typeof value !== 'string' || value.length > 1000
    )
  ) {
    return res.status(400).json({
      message: 'Optional details must be 1,000 characters or fewer.',
    });
  }

  try {
    // SAVE FOOD LISTING INCLUDING PREPARATION AND EXPIRY TIME
    const [result] = await pool.execute(
      `INSERT INTO food_listings
       (
         user_id,
         food_name,
         quantity,
         unit,
         pickup_location,
         pickup_by,
         preparation_time,
         expiry_time,
         storage_instructions,
         allergen_info,
         notes
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.authUserId,
        foodName.trim(),
        parsedQuantity,
        unit,
        pickupLocation.trim(),
        pickupDate,
        preparationDate,
        expiryDate,
        storageInstructions.trim(),
        allergenInfo.trim(),
        notes.trim(),
      ]
    );

    // GET SAVED LISTING
    const [rows] = await pool.execute(
      `SELECT
         l.id,
         l.food_name AS foodName,
         l.quantity,
         l.unit,
         l.pickup_location AS pickupLocation,
         l.pickup_by AS pickupBy,
         l.preparation_time AS preparationTime,
         l.expiry_time AS expiryTime,
         l.storage_instructions AS storageInstructions,
         l.allergen_info AS allergenInfo,
         l.notes,
         l.created_at AS createdAt,
         u.name AS donorName,
         u.organization
       FROM food_listings l
       JOIN users u ON u.id = l.user_id
       WHERE l.id = ?`,
      [result.insertId]
    );

    console.log('SAVED FOOD LISTING:', {
      id: rows[0].id,
      preparationTime: rows[0].preparationTime,
      expiryTime: rows[0].expiryTime,
    });

    res.status(201).json({
      message: 'Food listing published successfully.',
      listing: rows[0],
    });

  } catch (error) {
    next(error);
  }
});

// ERROR HANDLER
app.use((error, req, res, next) => {
  console.error('PerishLink API error:', error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    message: 'Something went wrong on the server.',
  });
});

// START SERVER
async function startServer() {
  try {
    await pool.query('SELECT 1');

    server.listen(PORT, () => {
      console.log(`PerishLink server running on http://localhost:${PORT}`);
      console.log('MySQL database connected successfully.');
    });
  } catch (error) {
    console.error('Unable to start PerishLink backend:', error.message);
    process.exit(1);
  }
}
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Volunteer connected:', socket.id);

  socket.on('pickup-update', (data) => {
    io.emit('pickup-status-changed', data);
  });

  socket.on('disconnect', () => {
    console.log('Volunteer disconnected');
  });
});
startServer();
// MODULE 3: VOLUNTEER PICKUP API

// Volunteer requests a food pickup
app.post('/api/pickups', requireAuth, async (req, res) => {
  try {
    const { listingId } = req.body;

    if (!listingId) {
      return res.status(400).json({
        message: 'Food listing ID is required.'
      });
    }

    const [listings] = await pool.query(
      'SELECT id, status FROM food_listings WHERE id = ?',
      [listingId]
    );

    if (listings.length === 0) {
      return res.status(404).json({
        message: 'Food listing not found.'
      });
    }

    if (listings[0].status !== 'available') {
      return res.status(400).json({
        message: 'This food listing is not available.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO pickups
       (listing_id, volunteer_id, shelter_id, status, request_status)
       VALUES (?, ?, NULL, 'pending', 'pending')`,
      [listingId, req.authUserId]
    );

    res.status(201).json({
      message: 'Pickup request sent to donor for approval.',
      pickupId: result.insertId,
      status: 'pending',
      requestStatus: 'pending'
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'A pickup request already exists for this food listing.'
      });
    }

    console.error('Pickup request error:', error);

    res.status(500).json({
      message: 'Unable to create pickup request.'
    });
  }
});


// Donor approves or rejects a volunteer pickup request
app.patch('/api/pickups/:id/request-status', requireAuth, async (req, res) => {
  try {
    const pickupId = req.params.id;
    const { requestStatus } = req.body;

    if (!['approved', 'rejected'].includes(requestStatus)) {
      return res.status(400).json({
        message: 'Invalid request status.'
      });
    }

    const [rows] = await pool.query(
      `SELECT p.id, p.request_status, f.user_id AS donor_id
       FROM pickups p
       JOIN food_listings f ON p.listing_id = f.id
       WHERE p.id = ?`,
      [pickupId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Pickup request not found.'
      });
    }

    if (Number(rows[0].donor_id) !== Number(req.authUserId)) {
      return res.status(403).json({
        message: 'Only the food donor can approve this request.'
      });
    }

    if (rows[0].request_status !== 'pending') {
      return res.status(400).json({
        message: 'This request has already been processed.'
      });
    }

    await pool.query(
      `UPDATE pickups
       SET request_status = ?,
           status = ?
       WHERE id = ?`,
      [
        requestStatus,
        requestStatus === 'approved' ? 'assigned' : 'cancelled',
        pickupId
      ]
    );

    res.json({
      message: `Pickup request ${requestStatus} successfully.`,
      pickupId,
      requestStatus
    });

  } catch (error) {
    console.error('Donor approval error:', error);

    res.status(500).json({
      message: 'Unable to process pickup request.'
    });
  }
});
    // Donor approves or rejects a volunteer pickup request
app.patch('/api/pickups/:id/request-status', requireAuth, async (req, res) => {
  try {
    const pickupId = req.params.id;
    const { requestStatus } = req.body;

    if (!['approved', 'rejected'].includes(requestStatus)) {
      return res.status(400).json({
        message: 'Invalid request status.'
      });
    }

    const [rows] = await pool.query(
      `SELECT p.id, p.request_status, f.user_id AS donor_id
       FROM pickups p
       JOIN food_listings f ON p.listing_id = f.id
       WHERE p.id = ?`,
      [pickupId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Pickup request not found.'
      });
    }

    if (Number(rows[0].donor_id) !== Number(req.authUserId)) {
      return res.status(403).json({
        message: 'Only the food donor can approve this request.'
      });
    }

    if (rows[0].request_status !== 'pending') {
      return res.status(400).json({
        message: 'This request has already been processed.'
      });
    }

    await pool.query(
      'UPDATE pickups SET request_status = ? WHERE id = ?',
      [requestStatus, pickupId]
    );

    res.json({
      message: `Pickup request ${requestStatus} successfully.`,
      pickupId,
      requestStatus
    });

  } catch (error) {
    console.error('Donor approval error:', error);
    res.status(500).json({
      message: 'Unable to process pickup request.'
    });
  }
});

    
      
      

// Get all pickup assignments
app.get('/api/pickups', requireAuth, async (req, res) => {
  try {
    console.log('Logged-in donor ID:', req.authUserId);
    const [pickups] = await pool.query(`
      SELECT
        p.id,
        p.listing_id,
        p.volunteer_id,
        p.shelter_id,
        p.status,
        p.pickup_time,
        p.delivery_time,
        f.food_name,
        f.quantity,
        f.unit,
        f.pickup_location,
        f.pickup_by
      FROM pickups p
      JOIN food_listings f ON p.listing_id = f.id
      ORDER BY p.created_at DESC
    `);
    console.log('Pickup requests found:', pickups.length);

    res.json(pickups);

  } catch (error) {
    console.error('Get pickups error:', error);
    res.status(500).json({
      message: 'Unable to retrieve pickups.'
    });
  }
});
// Update pickup status and send live Socket.IO notification
app.patch('/api/pickups/:id/status', requireAuth, async (req, res) => {
  try {
    const pickupId = req.params.id;
    const { status } = req.body;

   const allowedStatuses = [
  'picked_up',
  'delivered',
  'cancelled',
  'received_confirmed'
];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid pickup status.'
      });
    }

    // Find the pickup
    const [rows] = await pool.query(
      'SELECT id, status FROM pickups WHERE id = ?',
      [pickupId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Pickup not found.'
      });
    }

    const currentStatus = rows[0].status;

    // Validate status transitions
    if (status === 'received_confirmed' && currentStatus !== 'delivered') {
  return res.status(400).json({
    message: 'Food must be delivered before the shelter can confirm receipt.'
  });
}

    if (status === 'delivered' && currentStatus !== 'picked_up') {
      return res.status(400).json({
        message: 'Pickup must be collected before delivery.'
      });
    }

    if (
      status === 'cancelled' &&
      !['pending', 'assigned'].includes(currentStatus)
    ) {
      return res.status(400).json({
        message: 'This pickup cannot be cancelled.'
      });
    }

    // Save status in MySQL
    await pool.query(
      `UPDATE pickups
       SET status = ?,
           pickup_time = CASE
             WHEN ? = 'picked_up' THEN NOW()
             ELSE pickup_time
           END,
           delivery_time = CASE
             WHEN ? = 'delivered' THEN NOW()
             ELSE delivery_time
           END
       WHERE id = ?`,
      [status, status, status, pickupId]
    );

    // Get updated pickup details
    const [updatedRows] = await pool.query(
      `SELECT
         p.id,
         p.listing_id,
         p.volunteer_id,
         p.shelter_id,
         p.status,
         p.pickup_time,
         p.delivery_time,
         f.food_name,
         f.quantity,
         f.unit,
         f.pickup_location
       FROM pickups p
       JOIN food_listings f ON p.listing_id = f.id
       WHERE p.id = ?`,
      [pickupId]
    );

    const updatedPickup = updatedRows[0];

    // Notify connected dashboards
    io.emit('pickup-status-changed', updatedPickup);

    res.json({
      message: 'Pickup status updated successfully.',
      pickup: updatedPickup
    });

  } catch (error) {
    console.error('Pickup status update error:', error);

    res.status(500).json({
      message: 'Unable to update pickup status.'
    });
  }
});