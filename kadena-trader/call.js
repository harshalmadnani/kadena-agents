import dotenv from "dotenv";
import { baselineFunction } from "./baseline.js";

dotenv.config();

async function main() {
  console.log(await baselineFunction());
}

main();
