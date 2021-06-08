/// Packages
const express = require("express");
const cors = require("cors");
const terminate = require("terminate");
const { snapshot } = require("process-list");
const { java, others, cpp, c } = require("./languages/index.js");

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

/// TODO: Add host in PRODUCTION
app.use(cors());

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
  return new Promise(async (resolve, reject) => {
    /// Execution of JAVA
    /// Before run java program set default classpath
    if (lang === "java") {
      /// It will create file if not exist ; if exist then overwrite
      let output = await java(code, inputs, expOutput);
      resolve(output);
    } else if (lang === "cpp") {
      let output = await cpp(code, inputs, expOutput);
      resolve(output);
    } else if (lang === "objective-c") {
      let output = await c(code, inputs, expOutput);
      resolve(output);
    } else {
      /// All Interpreters type languages
      let output = await others(lang, code, inputs, expOutput);
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
  console.log(`App is listening on ::5124`);
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
          if (err) console.error(err);
        });
      }
    }
  }
}

process.on("SIGINT", (si) => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
  });
  clearInterval(cleanup);
  process.exit(0);
  /// TODO: In production Graceful ShutDown
  // setTimeout(() => {
  //   process.exit(0);
  // }, 1000); /// 10s
});

process.on("SIGTERM", (si) => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
  });
  clearInterval(cleanup);
  process.exit(0);
  /// TODO: In production Graceful ShutDown
  // setTimeout(() => {
  //   process.exit(0);
  // }, 1000); /// 10s
});

module.exports = app;
