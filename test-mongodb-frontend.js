// Simple test to check MongoDB connectivity from frontend
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'Traffic';
const COLLECTION_NAME = 'cctv';

async function testMongoDB() {
  console.log('🔍 Testing MongoDB connection...');
  console.log('URI:', MONGODB_URI);
  
  try {
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // Test query
    const data = await collection.find({}).toArray();
    console.log(`📊 Found ${data.length} documents in collection`);
    
    if (data.length > 0) {
      console.log('📝 Sample document:', JSON.stringify(data[0], null, 2));
    }
    
    await client.close();
    console.log('🔒 MongoDB connection closed');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Full error:', error);
  }
}

testMongoDB();