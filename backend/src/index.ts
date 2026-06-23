import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import bcrypt from 'bcryptjs';
import { startCronJobs, getCurrentCycleStart, getNextCycleStart } from './cron';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');

// Start Cron Jobs
startCronJobs(io);

// Stripe webhook requires raw body
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(cors());
app.use(express.json());

// API Routes
app.post('/api/register', async (req, res) => {
  const { username, password, cityId } = req.body;
  if (!username || !password || !cityId) {
    return res.status(400).json({ error: "Kullanıcı adı, şifre ve şehir zorunludur." });
  }
  
  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: "Kullanıcı adı 2-20 karakter olmalıdır." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Şifre en az 6 karakter olmalıdır." });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: "Bu kullanıcı adı zaten alınmış!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, displayName: username, password: hashedPassword, cityId },
      include: { cosmetics: true }
    });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Kullanıcı adı ve şifre zorunludur." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { cosmetics: true }
    });

    if (!user) {
      return res.status(400).json({ error: "Kullanıcı bulunamadı." });
    }

    if (!user.password) {
       return res.status(400).json({ error: "Bu hesap eski sürümde (Google ile) oluşturulmuş." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Hatalı şifre." });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

app.post('/api/change-city', async (req, res) => {
  const { username, cityId } = req.body;
  if (!username || !cityId) return res.status(400).json({ error: "Invalid data" });
  try {
    const user = await prisma.user.update({
      where: { username },
      data: { cityId },
      include: { cosmetics: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to change city" });
  }
});

app.get('/api/cities', async (req, res) => {
  const cities = await prisma.city.findMany();
  res.json(cities);
});

app.get('/api/stats', async (req, res) => {
  // Aggregate stats
  const totalUsers = await prisma.user.count();
  const onlineUsers = io.engine.clientsCount;
  
  // Get city stats for leaderboard
  const cityStats = await prisma.city.findMany({
    include: {
      _count: {
        select: { pixels: true }
      }
    }
  });

  const leaderboard = cityStats
    .map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      pixelCount: c._count.pixels
    }))
    .sort((a, b) => b.pixelCount - a.pixelCount);

  const totalPixels = leaderboard.reduce((acc, curr) => acc + curr.pixelCount, 0);

  res.json({
    totalUsers,
    onlineUsers,
    totalPixels,
    leaderboard
  });
});

app.get('/api/map', async (req, res) => {
  const pixels = await prisma.pixel.findMany();
  res.json(pixels);
});

// Leaders API
app.get('/api/leaders', async (req, res) => {
  const currentCycle = getCurrentCycleStart();
  const leaders = await prisma.cityLeader.findMany({
    where: { cycleStart: currentCycle },
    include: { user: true, city: true }
  });
  
  res.json(leaders.map(l => ({
    cityId: l.cityId,
    cityName: l.city.name,
    userId: l.userId,
    username: l.user.username,
    displayName: l.user.displayName,
    cycleEnd: l.cycleEnd
  })));
});

// Store APIs (Temporarily Disabled)
/*
app.get('/api/products', async (req, res) => {
... (hidden)
});
*/

// Socket.IO
const connectedUsers = new Map<string, string>(); // email -> socket.id
const userLastChatTime = new Map<string, number>(); // username -> timestamp

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Extract username (email) from auth
  const username = socket.handshake.auth?.username;
  if (username) {
    // Check if user already connected elsewhere
    const existingSocketId = connectedUsers.get(username);
    if (existingSocketId && existingSocketId !== socket.id) {
      // Force logout the old socket
      io.to(existingSocketId).emit('force_logout');
      // Optionally disconnect the old socket after a short delay
      setTimeout(() => {
        const oldSocket = io.sockets.sockets.get(existingSocketId);
        if (oldSocket) oldSocket.disconnect(true);
      }, 500);
    }
    connectedUsers.set(username, socket.id);
  }

  // Broadcast updated online count
  io.emit('online_users', io.engine.clientsCount);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (username && connectedUsers.get(username) === socket.id) {
      connectedUsers.delete(username);
    }
    io.emit('online_users', io.engine.clientsCount);
  });

  // Chat message handler
  socket.on('chat_message', (data: { username: string; message: string }) => {
    if (!data.message || data.message.trim().length === 0) return;
    
    // Cooldown check (5 seconds)
    const now = Date.now();
    const lastTime = userLastChatTime.get(data.username);
    if (lastTime && now - lastTime < 5000) {
      socket.emit('error', 'Lütfen mesaj göndermeden önce 5 saniye bekleyin.');
      return;
    }
    
    userLastChatTime.set(data.username, now);

    const msg = {
      username: data.username,
      message: data.message.trim().slice(0, 200), // max 200 chars
      timestamp: now
    };
    io.emit('chat_message', msg);
  });

  socket.on('place_pixel', async (data) => {
    const { userId, x, y, cityId } = data;
    
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return socket.emit('error', 'User not found');

      // Cooldown check (30 seconds)
      const now = new Date();
      if (user.lastPlacedTime) {
        const diff = now.getTime() - user.lastPlacedTime.getTime();
        if (diff < 30000) {
          return socket.emit('error', 'Cooldown active');
        }
      }

      // Ensure pixel is a valid land pixel
      const pixel = await prisma.pixel.findUnique({
        where: { x_y: { x, y } }
      });

      if (!pixel) {
        return socket.emit('error', 'Invalid pixel location (Sea/Out of bounds)');
      }

      // Update pixel
      await prisma.pixel.update({
        where: { id: pixel.id },
        data: { cityId }
      });

      // Update user cooldown and increment total pixels placed
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { lastPlacedTime: now, totalPixelsPlaced: { increment: 1 } }
      });

      // Send updated pixel count back to this user
      socket.emit('user_update', { totalPixelsPlaced: updatedUser.totalPixelsPlaced });

      // Record Contribution for the current cycle
      const cycleStart = getCurrentCycleStart();
      await prisma.cityContribution.upsert({
        where: {
          userId_cityId_cycleStart: {
            userId,
            cityId,
            cycleStart
          }
        },
        update: {
          pixelsPlaced: { increment: 1 }
        },
        create: {
          userId,
          cityId,
          cycleStart,
          pixelsPlaced: 1
        }
      });

      // Broadcast pixel update
      io.emit('pixel_update', { x, y, cityId });

      const cityStats = await prisma.city.findMany({
        include: {
          _count: { select: { pixels: true } }
        }
      });
      const leaderboard = cityStats
        .map(c => ({
          id: c.id,
          name: c.name,
          color: c.color,
          pixelCount: c._count.pixels
        }))
        .sort((a, b) => b.pixelCount - a.pixelCount);
        
      io.emit('stats_update', { leaderboard });

    } catch (err) {
      console.error(err);
      socket.emit('error', 'Failed to place pixel');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
