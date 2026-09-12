require("dotenv").config();

const mongoose = require("mongoose");
const { explainMongoError } = require("../mongoError");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI missing in .env");
  process.exit(1);
}

async function test() {
  console.log("Testing Atlas connection (no local mongod needed)...");
  await mongoose.connect(MONGO_URI);
  const dbName = mongoose.connection.name;
  console.log("OK: connected to Atlas database:", dbName);
  await mongoose.disconnect();
}

test().catch((err) => {
  console.error("FAIL:", explainMongoError(err));
  process.exit(1);
});
