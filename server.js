/* eslint-disable @typescript-eslint/no-var-requires */
/// Packages
const express = require("express");
const cors = require("cors");
const terminate = require("terminate");
const { snapshot } = require("process-list");
const { java, others, cpp, c } = require("./languages/index.js");
const logger = require("pino")();
const pino = require("pino-http")();

const SUPPORTED_LANGUAGES = [
  "objective-c",
  "cpp",
  "java",
  "python",
  "go",
  "javascript",
  "php",
];

///////////// Polyfills /////////////////

if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (str, newStr) {
    // If a regex pattern
    if (
      Object.prototype.toString.call(str).toLowerCase() === "[object regexp]"
    ) {
      return this.replace(str, newStr);
    }

    // If a string
    return this.replace(new RegExp(str, "g"), newStr);
  };
}

//////////// Polyfills Ends ///////////////

/// Declarations
const app = express();

/// Middleware
app.use(express.json());

/// Add host in PRODUCTION
app.use(cors());

/// Log
app.use(pino);

/// APIs
app.post("/run", async (req, res) => {
  let startTime = Date.now();
  let lang = req.body.language;
  let code = req.body.code;
  let input = req.body.input;
  let eo = req.body.eo;

  if (!lang || !code || !input || !eo) {
    return res.status(400).json({
      success: false,
      message: "Please suuply needed fields",
      totalTime: Date.now() - startTime,
    });
  }

  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    return res.status(400).json({
      success: false,
      message: "Invalid language",
      totalTime: Date.now() - startTime,
    });
  }

  /// Run program
  /// Return time in milliseconds
  let result = await run(lang, code, input, eo);
  return res
    .status(200)
    .json({ ...result, ...{ totalTime: Date.now() - startTime } });
});

/// Functions

/**
 * Executes ANY programs
 * @param {String} lang - Language
 * @param {String} code - The code that to be execute
 * @param {String[]} inputs - The inputs that suuply in STDIN
 * @param {String} expOutput - The expected output
 * @returns {Promise<Object>} - Return output
 */
async function run(lang, code, inputs, expOutput) {
  return new Promise((resolve) => {
    /// Execution of JAVA
    /// Before run java program set default classpath
    if (lang === "java") {
      /// It will create file if not exist ; if exist then overwrite
      let output = java(code, inputs, expOutput);
      resolve(output);
    } else if (lang === "cpp") {
      let output = cpp(code, inputs, expOutput);
      resolve(output);
    } else if (lang === "objective-c") {
      let output = c(code, inputs, expOutput);
      resolve(output);
    } else {
      /// All Interpreters type languages
      let output = others(lang, code, inputs, expOutput);
      resolve(output);
    }
  });
}

app.use("*", (req, res) => {
  res.status(404).send("Page not found!");
});

let cleanup = null;

/// Server
const server = app.listen(5124, "0.0.0.0", () => {
  logger.info("Server is started!");
  // Start 10s cleanup
  cleanup = setInterval(() => {
    psList();
  }, 10000);
});

async function psList() {
  const APP_PID = process.id;
  const tasks = await snapshot("pid", "starttime");
  for (const task of tasks) {
    // Process is 10s old
    if (new Date().getTime() - new Date(task.starttime).getTime() > 10000) {
      if (task.pid !== APP_PID) {
        terminate(task.pid, (err) => {
          if (err) {
            logger.info("Server is closed due to error in process!");
            logger.error(err);
            process.exit(1);
          }
        });
      }
    }
  }
}

process.on("SIGINT", () => {
  logger.info("Server is closing due to SIGINT!");
  server.close((err) => {
    if (err) {
      logger.fatal(err);
      process.exit(1);
    }
  });
  clearInterval(cleanup);

  //  In production Graceful ShutDown
  setTimeout(() => {
    logger.fatal("Server is closed due to SIGINT!");
    process.exit(0);
  }, 10000); /// 10s
});

process.on("SIGTERM", () => {
  logger.error("Server is closing due to SIGTERM!");
  server.close((err) => {
    if (err) {
      logger.fatal(err);
      process.exit(1);
    }
  });
  clearInterval(cleanup);
  // In production Graceful ShutDown
  setTimeout(() => {
    logger.fatal("Server is closed due to SIGTERM!");
    process.exit(0);
  }, 10000); /// 10s
});

module.exports = app;
