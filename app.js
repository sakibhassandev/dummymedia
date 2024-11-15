import express from "express";
const app = express();
import "dotenv/config";

import { userModel } from "./models/user.js";
import { postModel } from "./models/post.js";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

app.set("views", "./views");
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("./public"));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/register", async (req, res) => {
  const { username, name, email, password, age } = req.body;
  let user = await userModel.findOne({ email });
  if (user) return res.status(500).send("User already exists");

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      const createdUser = await userModel.create({
        username,
        name,
        email,
        password: hash,
        age,
      });

      let token = jwt.sign(
        { email: email, userId: createdUser._id },
        process.env.JWT_SECRET
      );

      res.cookie("token", token);

      res.redirect("/profile");
    });
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (!user) return res.status(500).send("User does not exist");

  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      let token = jwt.sign(
        { email: email, userId: user._id },
        process.env.JWT_SECRET
      );
      res.cookie("token", token);
      return res.status(200).redirect("/profile");
    } else res.redirect("/login");
  });
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

app.get("/profile", isLoggedIn, async (req, res) => {
  let user = await userModel
    .findOne({ email: req.user.email })
    .populate("posts");
  res.render("profile", { user });
});

function isLoggedIn(req, res, next) {
  if (!req.cookies.token) {
    return res.redirect("/login");
  } else {
    let data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    req.user = data;
    next();
  }
}

app.post("/post", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });

  const createdPost = await postModel.create({
    user: user._id,
    content: req.body.content,
  });

  user.posts.push(createdPost._id);
  await user.save();
  res.redirect("/profile");
});

app.get("/like/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");
  if (post.likes.indexOf(req.user.userId) === -1) {
    post.likes.push(req.user.userId);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userId), 1);
  }
  await post.save();
  res.redirect("/profile");
});

app.get("/delete/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findByIdAndDelete(req.params.id);
  res.redirect("/profile");
});

app.get("/edit/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id });

  res.render("edit", { post });
});

app.post("/update/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOneAndUpdate(
    { _id: req.params.id },
    { content: req.body.content }
  );

  res.redirect("/profile");
});

app.get("/media", isLoggedIn, async (req, res) => {
  const posts = await postModel.find().populate("user");

  //   res.send(posts);
  res.render("media", { posts });
});

app.listen(3000);
