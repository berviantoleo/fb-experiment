import axios from "axios";
import express from "express";
import passport from "passport";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Connection, createConnection } from "typeorm";
import { UserSessions, UserSessionsEntity } from "./models/UserSessions";
import { FbList } from "./responses/fblist";
import { Posts } from "./responses/posts";

let dbConnection: Connection;
const port = 8000;

function processData(posts: Posts[], userId: String, accessToken: String)
{
  // console.log(JSON.stringify(posts));
  const requests = [];
  for (let post of posts) {
    console.log(`Will delete: ${post.id}`);
    const req = axios.delete(`https://graph.facebook.com/v11.0/${post.id}?access_token=${accessToken}`);
    requests.push(req);
  }
  Promise.allSettled
  (requests).then(res => {
    console.log(JSON.stringify(res));
  }).catch((err) => {
    console.error(JSON.stringify(err));
    console.error(err.message);
  });
}


createConnection({
  type: "sqlite",
  database: "test.db",
  entities: [UserSessionsEntity],
  synchronize: true,
  logging: true,
})
  .then((connection) => {
    // here you can start to work with your entities
    dbConnection = connection;
  })
  .catch((error) => console.log(error));

const app = express();

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.CLIENT_ID || "",
      clientSecret: process.env.CLIENT_SECRET || "",
      callbackURL: `http://localhost:${port}/auth/facebook/callback`,
    },
    function (
      accessToken: string,
      refreshToken: string,
      profile: any,
      cb: any
    ) {
      console.log(JSON.stringify(profile));
      if (dbConnection) {
        const userSessionRepo =
          dbConnection.getRepository<UserSessions>(UserSessionsEntity);
        userSessionRepo
          .findOne({ where: { userId: profile.id } })
          .then((result) => {
            if (result) {
              userSessionRepo.update(result.id, { accessToken: accessToken });
            } else {
              userSessionRepo.insert({
                accessToken: accessToken,
                userId: profile.id
              });
            }
          });
      }
    }
  )
);

app.get("/", (req: express.Request, res: express.Response) => {
  if (dbConnection) {
    const userSessionRepo =
      dbConnection.getRepository<UserSessions>(UserSessionsEntity);
    userSessionRepo
      .findOne(1)
      .then((result) => {
        if (result) {
          res.send("Logged in!");
        } else {
          res.send("Hello World!");
        }
      });
  } else {
    res.send("Server not ready");
  }
});

app.get("/login", (req: express.Request, res: express.Response) => {
  res.send("Not implemented");
});

app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["user_posts"] })
);

app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    console.log("Go home");
    res.redirect("/");
  }
);

app.get("/posts", function (req, res) {
  if (dbConnection) {
    const userSessionRepo =
      dbConnection.getRepository<UserSessions>(UserSessionsEntity);
    userSessionRepo
      .findOne(1)
      .then((result) => {
        if (result) {
          axios
          .get(
            `https://graph.facebook.com/v11.0/${result.userId}/posts?access_token=${result.accessToken}`
          )
          .then((response) => {
            // console.log(JSON.stringify(result.data));
            console.log(JSON.stringify(response.headers));
            const fbResponse = response.data as FbList<Posts>;
            processData(fbResponse.data, result.userId, result.accessToken);
            res.send(response.data);
          })
          .catch((err) => {
            console.log(JSON.stringify(err));
            res.sendStatus(500);
          });
        } else {
          res.json({});
        }
      });
  } else {
    res.send("Server not ready");
  }
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});