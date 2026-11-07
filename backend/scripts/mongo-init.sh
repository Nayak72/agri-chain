#!/bin/bash
# MongoDB Replica Set Initialization Script
# This script runs inside the mongo-init container

set -e

echo "Waiting for MongoDB to be ready..."
sleep 10

echo "Initializing replica set rs0..."

mongosh --host mongodb:27017 --quiet << 'EOF'
try {
  rs.initiate({
    _id: "rs0",
    members: [
      { _id: 0, host: "mongodb:27017", priority: 1 }
    ]
  });
  print("Replica set initiated successfully");
} catch (e) {
  if (e.codeName === "ReplicaSetAlreadyInitialized") {
    print("Replica set already initialized");
  } else {
    print("Error initiating replica set: " + e.message);
  }
}
EOF

echo "Waiting for replica set to stabilize..."
sleep 5

echo "Checking replica set status..."
mongosh --host mongodb:27017 --quiet --eval 'rs.status().members.forEach(m => print(m.name + " - " + m.stateStr))'

echo "MongoDB replica set ready!"