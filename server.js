require('dotenv').config();
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
    origin: "*",  // Adjust this to your frontend origin in production
    methods: ["GET", "POST"],
  }
});

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('chatappdb');
    const messagesCollection = db.collection('messages');

    app.use(express.static('../frontend')); // Serve frontend if needed

    // No /upload route needed anymore!

    io.on('connection', async (socket) => {
      console.log('a user connected');

      // Send chat history on new connection
      const messages = await messagesCollection.find({}).toArray();
      socket.emit('chat history', messages);

      // Handle new chat message with optional base64 file data
      socket.on('chat message', async (msg) => {
        const fullMsg = {
          sender: msg.sender || 'Anonymous',
          text: msg.text || '',
          fileData: msg.fileData || null, // base64 string or null
          fileType: msg.fileType || null, // mime type or null
          createdAt: new Date().toISOString(),
        };

        try {
          await messagesCollection.insertOne(fullMsg);
          io.emit('chat message', fullMsg);
        } catch (err) {
          console.error('Error saving message:', err);
        }
      });

      socket.on('typing', (name) => {
        socket.broadcast.emit('typing', name);
      });

      socket.on('stop typing', (name) => {
        socket.broadcast.emit('stop typing', name);
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
