const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is not defined in environment variables');
      console.log('Current working directory:', process.cwd());
      console.log('Available env keys:', Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('PASS')));
      process.exit(1);
    }

    const options = {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    };
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
