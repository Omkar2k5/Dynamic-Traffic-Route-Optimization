#!/usr/bin/env python3
"""
test_mongodb_integration.py - Test script for MongoDB integration with traffic detection
"""

import sys
import time
from datetime import datetime
from detection import MongoDBHandler, CongestionLevel

def test_mongodb_connection():
    """Test MongoDB connection and basic operations."""
    print("🧪 Testing MongoDB Integration")
    print("=" * 50)
    
    # Initialize MongoDB handler
    mongo_handler = MongoDBHandler(
        host='localhost',
        port=17017,
        database_name='Traffic',
        collection_name='cctv'
    )
    
    if not mongo_handler.connected:
        print("❌ MongoDB connection failed!")
        print("Make sure MongoDB is running on localhost:17017")
        return False
    
    print("✅ MongoDB connection successful!")
    
    # Test document structure
    print("\n📄 Testing document structure...")
    
    # Simulate some congestion data
    test_scenarios = [
        {
            "level": CongestionLevel.FREE_FLOW,
            "score": 0.1,
            "vehicles": 2,
            "speed": 15.0,
            "stopped": 0
        },
        {
            "level": CongestionLevel.MODERATE,
            "score": 0.5,
            "vehicles": 8,
            "speed": 8.0,
            "stopped": 3
        },
        {
            "level": CongestionLevel.HEAVY,
            "score": 0.75,
            "vehicles": 15,
            "speed": 3.0,
            "stopped": 8
        }
    ]
    
    success_count = 0
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\nTest {i}: {scenario['level'].name} congestion")
        print(f"  Score: {scenario['score']:.2f}")
        print(f"  Vehicles: {scenario['vehicles']}")
        print(f"  Speed: {scenario['speed']:.1f} px/f")
        print(f"  Stopped: {scenario['stopped']}")
        
        # Update traffic status
        success = mongo_handler.update_traffic_status(
            congestion_level=scenario['level'],
            congestion_score=scenario['score'],
            vehicle_count=scenario['vehicles'],
            average_speed=scenario['speed'],
            stopped_count=scenario['stopped']
        )
        
        if success:
            print(f"  ✅ Update successful")
            success_count += 1
        else:
            print(f"  ❌ Update failed")
        
        # Small delay between tests
        time.sleep(1)
    
    print(f"\n📊 Test Results: {success_count}/{len(test_scenarios)} successful")
    
    # Test document retrieval
    print("\n📖 Testing document retrieval...")
    try:
        if mongo_handler.collection:
            doc = mongo_handler.collection.find_one({"_id": "cctv1"})
            if doc:
                print("✅ Document retrieved successfully:")
                print(f"  ID: {doc.get('_id')}")
                print(f"  Traffic Status: {doc.get('traffic_status')}")
                print(f"  Vehicle Count: {doc.get('vehicle_count')}")
                print(f"  Congestion Score: {doc.get('congestion_score')}")
                print(f"  Coordinates: {doc.get('coordinates')}")
                print(f"  Last Updated: {doc.get('updated_at')}")
            else:
                print("❌ Document not found!")
    except Exception as e:
        print(f"❌ Document retrieval failed: {e}")
    
    # Cleanup
    mongo_handler.disconnect()
    print("\n🔌 Disconnected from MongoDB")
    
    return success_count == len(test_scenarios)

def test_dependencies():
    """Test if required dependencies are available."""
    print("🔍 Checking dependencies...")
    
    try:
        import pymongo
        print("✅ pymongo is available")
        return True
    except ImportError:
        print("❌ pymongo is not installed")
        print("Install with: pip install pymongo")
        return False

def main():
    """Main test function."""
    print("MongoDB Integration Test Suite")
    print("=" * 50)
    
    # Test dependencies first
    if not test_dependencies():
        print("\n❌ Missing dependencies. Please install pymongo.")
        sys.exit(1)
    
    # Test MongoDB integration
    success = test_mongodb_connection()
    
    if success:
        print("\n🎉 All tests passed! MongoDB integration is working correctly.")
        print("\nNext steps:")
        print("1. Start MongoDB: mongod --dbpath /path/to/db --port 17017")
        print("2. Run detection: python detection.py")
        print("3. Verify data in MongoDB Compass or via command line")
    else:
        print("\n❌ Some tests failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main()