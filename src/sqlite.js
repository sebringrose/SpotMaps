/**
 * Module handles database management
 *
 * Server API calls the methods in here to query and update the SQLite database
 */

// Utilities we need
const fs = require("fs");

// Initialize the database
const dbFile = "./.data/sqlite3.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const dbWrapper = require("sqlite");
let db;

/* 
We're using the sqlite wrapper so that we can make async / await connections
- https://www.npmjs.com/package/sqlite
*/
dbWrapper
  .open({
    filename: dbFile,
    driver: sqlite3.Database
  })
  .then(async dBase => {
    db = dBase;

    // We use try and catch blocks throughout to handle any database errors
    try {
      // The async / await syntax lets us write the db operations in a way that won't block the app
      if (!exists) {
        // Database doesn't exist yet - create Users, Spots and Analytics tables
        await db.run(
          "CREATE TABLE Users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, code INTEGER, token TEXT)"
        );
        await db.run(
          "CREATE TABLE Spots (id INTEGER PRIMARY KEY AUTOINCREMENT, choice TEXT, time STRING)"
        );
        await db.run(
          "CREATE TABLE Analytics (id INTEGER PRIMARY KEY AUTOINCREMENT, choice TEXT, time STRING)"
        );
      } else {
        // We have a database already - write Choices records to log for info
        console.log(await db.all("SELECT * from Users"));
        console.log(await db.all("SELECT * from Spots"));
        console.log(await db.all("SELECT * from Analytics"));

        //If you need to remove a table from the database use this syntax
        // db.run("DROP TABLE Analyitics"); //will fail if the table doesn't exist
      }
    } catch (dbError) {
      console.error(dbError);
    }
  });

const getUser = async (email) => {
  try {
    // Return the array of log entries to admin page
    return await db.get(`SELECT * from Users WHERE email = '${email}'`);
  } catch (dbError) {
    console.error(dbError);
  }
}

const insertUserCode = async (email, code) => {
  if (!email || !code) return new Error("no email or code provided")
  const user = await getUser(email);
  
  if (user) {
    // UPDATE EXISTING USER WITH NEW CODE
    try {
      // Build the user data from the front-end and the current time into the sql query
      return await db.run(`UPDATE Users SET code = '${code}', token = '' WHERE email = '${email}' `);
    } catch (dbError) {
      return console.error(dbError);
    }
  }
  
  // INSERT NEW USER WITH CODE
  try {
    // Build the user data from the front-end and the current time into the sql query
    return await db.run("INSERT INTO Users (email, code) VALUES (?, ?)", [
      email,
      code
    ]);
  } catch (dbError) {
    return console.error(dbError);
  }
}

const verifyCode = async (email, code) => {
  const user = await getUser(email);
  console.log("verifying user: " + JSON.stringify(user) + " against code: " + code)
  return user && Number(user.code) === Number(code);
}

const insertUserToken = async (email, token) => {
  if (!email || !token) return new Error("no email or token provided")
  const user = await getUser(email);
  
  console.log("adding token: " + token + " to user: " + email)
  
  if (user) {
    try {
      // Build the user data from the front-end and the current time into the sql query
      return await db.run(`UPDATE Users SET code = '', token = '${token}' WHERE email = '${email}' `);
    } catch (dbError) {
      return console.error(dbError);
    }
  }
  
  return new Error("No user found with email provided.")
}

// Our server script will call these methods
module.exports = {
  getUser,
  insertUserCode,
  verifyCode,
  insertUserToken
};
