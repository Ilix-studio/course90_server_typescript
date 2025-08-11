import mongoose from "mongoose";
import dotenv from "dotenv";
import { seedSuperAdmin } from "../SuperAdmin/Seeder";

dotenv.config();

const connectionString = process.env.MONGO_URI;
const connectDB = async () => {
  try {
    await mongoose.connect(connectionString as string);
    console.log(
      `Mongo DB is connected successfully 🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟🐟`
    );
    // await seedSuperAdmin();
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
};

export default connectDB;
