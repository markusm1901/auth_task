const express = require("express");
const cors = require("cors");
const session = require("express-session");
const app = express();
const auth = require("otplib");
const totp = require("totp-generator").TOTP;
const { v4: uuidv4 } = require('uuid');
app.use(express.json());

app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  })
)

app.options('*', cors({
  origin: 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));

app.use(session(
  {
    secret: "ASDF23HUAWEF",
    saveUninitialized: false,
    cookie: { maxAge: 100000000 * 60 * 60, httpOnly: false },
    resave: false
  }
));

let data = [];
let posts =[
  { id: 1, content: "content", user: "user", date: new Date(), comments: [{user: "user", content: "content"}] }
];

app.post("/add", (req, res) => {
  const { login, password } = req.body;

  const userExists = data.some(el => {
    return el.login === login && el.password === password;
  });
  if (userExists) {
    res.sendStatus(250).send("user already exists");
  } else {
    const secret = auth.authenticator.generateSecret();
    const url = auth.authenticator.keyuri(login, password, secret);
    const record = {
      login: login,
      password: password,
      RKey: secret
    }
    data.push(record);
    res.send({ message: "user added", info: record, url: url });
  }
});

app.post("/checkusersession", (req, res) => {
  if (!req.session || !req.session.user) {
    res.status(401).send({
      message: "User is not logged in",
    });
  } else {
    res.status(200).send({
      message: "User " + req.session.user.login + " is logged in",
      user: req.session.user,
      posts: posts
    });
  }
})

app.post("/login", (req, res) => {
  const { login, password } = req.body;
  const userExists = data.find(el => {
    return el.login === login && el.password === password;
  });
  if (userExists) {
    req.session.user = userExists;
    req.session.logged_in = true;
    res.sendStatus(200);
  } else {
    res.sendStatus(401);
  }
});

app.post("/checktotp", (req, res) => {
  const { code } = req.body;
  // console.log(code);

  const userExists = req.session.user;
  if (userExists) {
    const secret = userExists.RKey;
    const topt = totp.generate(secret);
    // console.log("Expected TOTP:", topt);

    if (auth.authenticator.verify({ secret, token: code })) {
      res.sendStatus(200);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(401);
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy();
  res.send({ message: "session destroyed" });
})
app.post("/add_post",(req,res)=>{
    const {user, content, date } = req.body;
    const postId = uuidv4(); 
    posts.push({ id: postId, content: content, user: user, date: date, comments: [] });
    res.send({ message: "Post successfully added with ID: " + postId });
})
app.post("/add_comment",(req,res)=>{
  console.log(posts);
  console.log(req.body);
  const {id, user, comment} = req.body;
  const found = posts.find((el) => el.id.toString() === id.toString());
  console.log(found)
  if (!found) {
    return res.status(404).send({ error: "Post not found" });
  }
  found.comments.push({ user: user, content: comment });
  res.send({ comment_in_array: found });
})
app.listen(5000, () => {
  // console.log("server:5000");
})