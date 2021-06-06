const { exec, spawn } = require("child_process");
const { streamWrite, streamEnd } = require("@rauschma/stringio");
const fs = require("fs");

/**
 * Run the java program
 * @param {String} filePath
 * @param {String} code
 * @param {String[]} inputs
 * @param {String} expOutput
 * @returns
 */
async function java(filePath, code, inputs, expOutput) {
  return new Promise(async (resolve, reject) => {
    resolve(await compile(filePath, code, inputs, expOutput));
  });
}

/**
 * Compile the java program
 * @param {path} path
 * @param {code} code
 * @param {inputs} inputs
 * @param {expOutput} expOutput
 * @returns
 */
async function compile(path, code, inputs, expOutput) {
  return new Promise(async (resolve, reject) => {
    fs.writeFileSync(path, code, { flag: "w+" });

    /// Compile java progam with file name Program.java
    exec(`javac ${path}`, { timeout: 4000 }, async (err, stdout, stderr) => {
      if (err) {
        return resolve({
          matches: false,
          message: "Program has errors",
          hasError: true,
          expected: expOutput.toString(),
          actual: "",
          outOfResources: false,
          errorMessage: err.toString(),
        });
      } else if (stderr) {
        return resolve({
          matches: false,
          message: "Program has errors",
          hasError: true,
          expected: expOutput.toString(),
          actual: "",
          outOfResources: false,
          errorMessage: stderr.toString(),
        });
      } else {
        /// This function executes java program
        let output = await run(inputs, expOutput);
        resolve(output);
      }
    });
  });
}

/**
 * Run the java program
 * @param {String[]} inputs
 * @param {String} expOutput
 * @returns
 */
async function run(inputs, expOutput) {
  return new Promise(async (resolve, reject) => {
    let p = spawn("java", ["Program"], { stdio: ["pipe"] });

    let timout = setTimeout(() => {
      if (!p.killed) {
        p.kill(); /// Kill after 4s
        resolve({
          matches: false,
          message: "Program was killed due to resource limits",
          hasError: false,
          expected: expOutput.toString(),
          actual: "",
          outOfResources: true,
        });
      }
    }, 4000);

    let result = "";

    /// Whenever data is received add to result
    p.stdout.on("data", (data) => {
      result += data.toString();
    });

    /// When output stream end
    p.stdout.on("end", () => {
      p.kill();
      clearInterval(timout);

      // result = result.split("\n");
      // result[result.length-1]==="" ? result.pop() : null;
      // result = result.join("\n");

      if (result.toString() == expOutput.toString())
        resolve({
          matches: true,
          message: "Program works correctly",
          hasError: false,
          expected: expOutput.toString(),
          actual: result.toString(),
          outOfResources: false,
          errorMessage: "",
        });
      else
        resolve({
          matches: false,
          message: `expected ${expOutput.toString()} but received ${result.toString()}`,
          hasError: false,
          expected: expOutput.toString(),
          actual: result.toString(),
          outOfResources: false,
          errorMessage: "",
        });
    });

    let error = "";

    /// Error occur in program
    p.stderr.on("data", (err) => {
      error += err.toString();
    });

    p.stderr.on("end", () => {
      if (error) {
        p.kill();
        clearInterval(timout);
        resolve({
          matches: false,
          message: "Program has errors",
          hasError: true,
          expected: expOutput.toString(),
          actual: "",
          outOfResources: false,
          errorMessage: error.toString(),
        });
      }
    });

    /// Pass input to process in STDIN if needs input
    try {
      if (inputs) {
        await streamWrite(p.stdin, inputs);
        await streamEnd(p.stdin);
      } else await streamEnd(p.stdin);
    } catch (e) {}
  });
}

exports.java = java;
