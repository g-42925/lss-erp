import { NextRequest } from "next/server";
import { GET } from "./app/api/web/inventory/stock-report/route.ts";

async function run() {
  const req = new NextRequest("http://localhost:3000/api/web/inventory/stock-report?id=MASTER123&startDate=2024-05-01&endDate=2024-06-30");
  
  // mock Companie.findOne somehow, or connect to db using real master account
  // wait, from the user's workspaces, we don't know the masterAccountId.
  // let's grab it from database
  const mongoose = require("mongoose");
  require("dotenv").config({ path: ".env.local" });
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lss-erp");
  const Companie = require("./models/Companie.js").default;
  const comp = await Companie.findOne();
  if (!comp) return console.log("No company");

  const req2 = new NextRequest("http://localhost:3000/api/web/inventory/stock-report?id=" + comp.masterAccountId + "&startDate=2024-05-01&endDate=2026-12-31");
  const res = await GET(req2);
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
  process.exit(0);
}

run();
