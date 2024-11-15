import mongoose from "mongoose";

mongoose.connect(process.env.MONGODB_URL);

const userSchema = mongoose.Schema({
  username: String,
  name: String,
  age: Number,
  email: String,
  password: String,
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post",
    },
  ],
});

export const userModel = mongoose.model("user", userSchema);
