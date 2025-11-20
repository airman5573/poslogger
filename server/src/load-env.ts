import path from "path";
import dotenv from "dotenv";

const envPath = process.env.ENV_PATH || path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });
