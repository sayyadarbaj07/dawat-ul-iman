const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/userModel");
const connectDB = require("./config/db");

dotenv.config({ path: "../.env" });

const seedUsers = async () => {
  try {
    await connectDB();
    await User.deleteMany(); // Clear existing users

    const users = [
      {
        username: "admin",
        password: "admin123",
        name: "Head Administrator",
        role: "admin",
        initials: "HA",
      },
      {
        username: "teacher",
        password: "teacher123",
        name: "Mufti Abdul Kareem",
        role: "teacher",
        initials: "MA",
      },
      {
        username: "accountant",
        password: "accounts123",
        name: "Muhammad Bilal",
        role: "accountant",
        initials: "MB",
      },
      {
        username: "viewer",
        password: "viewer123",
        name: "Observer",
        role: "viewer",
        initials: "OB",
      },
    ];

    for (const user of users) {
      await User.create(user);
    }
    console.log("Users seeded successfully");
    process.exit();
  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  }
};

seedUsers();
