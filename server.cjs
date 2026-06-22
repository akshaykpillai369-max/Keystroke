require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const db = require('./lib/db.cjs');
const { seed } = require('./lib/seed.cjs');

const webRoutes = require('./routes/webRoutes.cjs');
const apiRoutes = require('./routes/apiRoutes.cjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('io', io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/Keystroke', express.static(path.join(__dirname, 'dist')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    status: 'ok',
    dbConnected: dbState === 1,
    dbState: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown',
    storage: dbState === 1 ? 'MongoDB' : 'JSON file'
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lumina-ai';
const PORT = process.env.PORT || 3000;

async function start() {
  mongoose.set('bufferCommands', false);
  mongoose.set('bufferTimeoutMS', 3000);

  if (process.env.MONGO_URI !== 'none') {
    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000 });
      console.log('Connected to MongoDB');
    } catch (err) {
      console.log('MongoDB unavailable — using JSON file storage');
    }
  } else {
    console.log('MongoDB disabled — using JSON file storage');
  }

  db.init(MONGO_URI);
  // Seed disabled — start with clean data
  // await seed();

  app.use('/', webRoutes);
  app.use('/api', apiRoutes);

  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  server.listen(PORT, () => {
    console.log(`Lumina AI running on http://localhost:${PORT}`);
  });
}

start();
