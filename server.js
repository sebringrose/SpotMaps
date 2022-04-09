/**
 * This is the main server script that provides the API endpoints
 * The script uses the database helper in /src
 * The endpoints retrieve, update, and return data to the page handlebars files
 *
 * The API returns the front-end UI handlebars pages, or
 * Raw json if the client requests it with a query parameter ?raw=json
 */

// Utilities we need
const fs = require("fs");
const path = require("path");
const { CourierClient } = require("@trycourier/courier");
const jwt = require('jsonwebtoken');
const db = require("./src/sqlite.js");

const courier = CourierClient({ authorizationToken: process.env.COURIER_API_KEY });

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: false
});

// Setup our static files
fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
  prefix: "/" // optional: default '/'
});

// fastify-formbody lets us parse incoming forms
fastify.register(require("fastify-formbody"));

// point-of-view is a templating manager for fastify
fastify.register(require("point-of-view"), {
  engine: {
    handlebars: require("handlebars")
  }
});

// Load and parse SEO data
const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

/**
 * Home route for the app
 *
 * Return the poll options from the database helper script
 * The home route may be called on remix in which case the db needs setup
 *
 * Client can request raw data using a query parameter
 */
fastify.get("/", async (request, reply) => {
  /* 
  Params is the data we pass to the client
  - SEO values for front-end UI but not for raw data
  */
  let params = request.query.raw ? {} : { seo: seo };

  // Send the page options or raw JSON data if the client requested it
  request.query.raw
    ? reply.send(params)
    : reply.view("/src/pages/index.hbs", params);
});

/**
 * Post email route for user auth
 *
 * emails a code to the user to enter and confirm email adress
 */
fastify.post("/postEmail", async (request, reply) => { 
  const email = JSON.parse(request.body).email
  
  if (!email) return reply.send({
    message: "No valid email provided",
    statusCode: 403
  })
  
  // generate the users access code and store alongside email in database
  const code = Math.floor(1000 + Math.random() * 9000);
  db.insertUserCode(email, code)
  
  // email that code to our new boi/gurl
  try {
      const { requestId } = await courier.send({
        message: {
          to: {
            data: {
              name: "Spot Hunter",
            },
            email,
          },
          content: {
            title: "Your SpotMaps Access Code",
            body: `Hello {{name}}, \n\n Your SpotMaps access code is: ${code}`,
          },
          routing: {
            method: "single",
            channels: ["email"],
          },
        },
      });
  } catch (err) {
    return reply.send({
      message: "Error sending email.",
      statusCode: 500
    })
  }

  // Return the info to the client
  return reply.send({
    message: "Code send to user email",
    statusCode: 200
  })
});

/**
 * Post email & code route for user auth
 *
 * returns a jwt auth token for associated email if correct code provided
 */
fastify.post("/postCode", async (request, reply) => { 
  const email = JSON.parse(request.body).email
  const code = JSON.parse(request.body).code
  
  if (!email) return reply.statusCode = 403
  if (!code) return reply.statusCode = 403
  
  // verify code matches users code in db
  if (await db.verifyCode(email, code)) {
    // generate a 14 day JWT and send in reponse
    const expirationDate = new Date();
    expirationDate.setHours(new Date().getHours() + 24 * 14);
    const token = jwt.sign({ email, expirationDate }, process.env.JWT_SECRET_KEY);
    
    // set user JWT in db
    db.insertUserToken(email, token)

    // Return the info to the client
    return reply.send({ token })
    
  } else {
    return reply.statusCode = 401
  }
});

fastify.post("/authMe", async (request, reply) => {
  if (!request.headers.authorization) {
    reply.statusCode = 403
    reply.send("Not Authorization Header provided.")
  }
  // authenticate bearer in request headers against user with email from request body
  const token = request.headers.authorization.substring(7)
  const email = JSON.parse(request.body).email
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)
  if (!decoded.email || decoded.email !== email || !decoded.expirationDate || decoded.expirationDate < new Date()) {
    reply.statusCode = 401
    return reply.send("Token is invalid for provided email address.")
  }
  reply.send("Token is valid for provided email address.")
})

/**
 * Admin endpoint returns log of votes
 *
 * Send raw json or the admin handlebars page
 */
fastify.get("/logs", async (request, reply) => {
  let params = request.query.raw ? {} : { seo: seo };

  // Get the log history from the db
  params.optionHistory = await db.getLogs();

  // Let the user know if there's an error
  params.error = params.optionHistory ? null : "Error";

  // Send the log list
  request.query.raw
    ? reply.send(params)
    : reply.view("/src/pages/admin.hbs", params);
});

/**
 * Admin endpoint to empty all logs
 *
 * Requires authorization (see setup instructions in README)
 * If auth fails, return a 401 and the log list
 * If auth is successful, empty the history
 */
fastify.post("/reset", async (request, reply) => {
  let params = request.query.raw ? {} : { seo: seo };

  /* 
  Authenticate the user request by checking against the env key variable
  - make sure we have a key in the env and body, and that they match
  */
  if (
    !request.body.key ||
    request.body.key.length < 1 ||
    !process.env.ADMIN_KEY ||
    request.body.key !== process.env.ADMIN_KEY
  ) {
    console.error("Auth fail");

    // Auth failed, return the log data plus a failed flag
    params.failed = "You entered invalid credentials!";

    // Get the log list
    params.optionHistory = await db.getLogs();
  } else {
    // We have a valid key and can clear the log
    params.optionHistory = await db.clearHistory();

    // Check for errors - method would return false value
    params.error = params.optionHistory ? null : "Error";
  }

  // Send a 401 if auth failed, 200 otherwise
  const status = params.failed ? 401 : 200;
  // Send an unauthorized status code if the user credentials failed
  request.query.raw
    ? reply.status(status).send(params)
    : reply.status(status).view("/src/pages/admin.hbs", params);
});

// Run the server and report out to the logs
fastify.listen(process.env.PORT, '0.0.0.0', function(err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
});
