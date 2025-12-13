import mongoose from "mongoose";

mongoose
  .connect("mongodb+srv://new-user-31:Yntktsx1@cluster0.qwxmz.mongodb.net/erp")
  .then(() => console.log("Connected!"))
  .catch(err => console.error(err));
