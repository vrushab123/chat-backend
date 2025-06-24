const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('chatappdb');  // Database name you want
    const messagesCollection = db.collection('messages');

    app.use(express.static('../frontend')); // Serve frontend static files

    io.on('connection', async (socket) => {
      console.log('a user connected');

      // Send previous messages to new client
      const messages = await messagesCollection.find({}).toArray();
      socket.emit('chat history', messages.map(m => ({ text: m.text, sender: m.sender })));

      // Listen for new messages
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
