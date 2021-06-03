
/// Packages
const express = require("express");
const cors = require("cors");
const { java, others, cpp, c } = require("./languages/index.js");

///////////// Polyfills /////////////////

if (!String.prototype.replaceAll) {
	String.prototype.replaceAll = function(str, newStr){

		// If a regex pattern
		if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
			return this.replace(str, newStr);
		}

		// If a string
		return this.replace(new RegExp(str, 'g'), newStr);

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
app.post("/run", async(req, res) => {
    let startTime = Date.now();
    let lang = req.body.language;
    let code = req.body.code;
    let input = req.body.input;
    let eo = req.body.eo;

    if(!lang || !code || !input || !eo) {
        return res.status(401).json({
            success: false,
            message: "Unexpected inputs",
            totalTime: Date.now() - startTime
        });
    }

    /// Run program
    /// Return time in milliseconds
    let result = await run(lang, code, input, eo);
    return res.status(200).json({...result, ...{totalTime: Date.now() - startTime}});
    
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
    if(lang === "java") {
      let filePath = `/tmp/Program.java`;
      /// It will create file if not exist ; if exist then overwrite
      let output = await java(filePath, code, inputs, expOutput);
      resolve(output);
    }
    else if(lang === "cpp") {
      let output = await cpp(code, inputs, expOutput);
      resolve(output);
    }
    else if(lang === "objective-c") {
      let output = await c(code, inputs, expOutput);
      resolve(output);
    }
    else {
      /// All Interpreters type languages
      let output = await others(lang, code, inputs, expOutput);
      resolve(output);
    }

  });
}

app.use("*", (req, res) => {
  res.status(404).send("Page not found!");
});

/// Server
const server = app.listen(5124, () => console.log("app is listening!"));

process.on("SIGINT", (si) => {
  server.close((err) => {
    if(err) {
      console.error(err);
      process.exit(1);
    }
  });
  process.exit(0);
  /// TODO: In production Graceful ShutDown
  // setTimeout(() => {
  //   process.exit(0);
  // }, 1000); /// 10s
});

process.on("SIGTERM", (si) => {
  server.close((err) => {
    if(err) {
      console.error(err);
      process.exit(1);
    }
  });
  process.exit(0);
  /// TODO: In production Graceful ShutDown
  // setTimeout(() => {
  //   process.exit(0);
  // }, 1000); /// 10s
});



