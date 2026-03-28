const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error(`MONGODB_URI: ${process.env.MONGODB_URI ? '***' : 'NOT SET'}`);
    
    // Don't exit immediately - try to start the server anyway
    // It will return 503 on database operations
    console.warn('⚠️  Server starting without database connection...');
    
    // Setup connection event handlers for automatic reconnection
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });
    
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
    return null;
  }
};

module.exports = connectDB;
