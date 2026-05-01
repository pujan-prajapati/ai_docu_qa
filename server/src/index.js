import express from "express";
import "dotenv/config";
import cors from "cors";
import documentRouter from "./routes/document.routes.js";
import chatRouter from "./routes/chat.routes.js";
import { connectDB } from "./config/db.config.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api", documentRouter);
app.use("/api", chatRouter);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("Connection Failed : ", error);
  });
