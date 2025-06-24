const cors = require('cors');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');

const app = express();

// Enable CORS for all origins
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",  // Allow all origins (or restrict to your frontend URL)
    methods: ["GET", "POST"],
  }
});

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('chatappdb');
    const messagesCollection = db.collection('messages');

    app.use(express.static('../frontend'));

    io.on('connection', async (socket) => {
      console.log('a user connected');

      const messages = await messagesCollection.find({}).toArray();
      socket.emit('chat history', messages.map(m => ({ text: m.text, sender: m.sender })));

      socket.on('chat message', async (msg) => {
        await messagesCollection.insertOne({ ...msg, createdAt: new Date() });
        io.emit('chat message', msg);
      });

      socket.on('disconnect', () => {
        console.log('user disconnected');
      });
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error(err);
  }
}

run();
