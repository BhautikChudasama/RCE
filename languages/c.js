
/// Compiled language


/// Compiled language

const { exec, spawn } = require("child_process");
const { streamWrite } = require("@rauschma/stringio");
const fs = require("fs");
const tmp = require("tmp");

/**
 * Run the java program
 * @param {String} filePath 
 * @param {String} code 
 * @param {String[]} inputs 
 * @param {String} expOutput 
 * @returns 
 */
async function c(code, inputs, expOutput) {
  return new Promise(async(resolve, reject) => {
    resolve( await compile(code, inputs, expOutput) );
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
async function compile(code, inputs, expOutput) {
  return new Promise((resolve, reject) => {
    
    let file = tmp.fileSync({postfix: ".c"});
    let filePath = file.name;
    code = code.replaceAll("↵", "\n");

    fs.writeFileSync(filePath, code, {flag: "w+"});

    /// Compile java progam with file name Program.java
    exec(`g++ -o ${file.name.split(".")[0]} ${filePath}`, {timeout: 4000}, async(err, stdout, stderr) => {
    
      if(err) {
        file.removeCallback();
        return resolve({success: false, message: err.toString().replaceAll("↵", "\n")});
      }
      else if(stderr) {
        file.removeCallback();
        return resolve({success: false, message: stderr.toString().replaceAll("↵", "\n")});
      }
      else {
        /// This function executes java program
        let output = await run(file.name.split(".")[0], inputs, expOutput);
        file.removeCallback();
        fs.unlinkSync(file.name.split(".")[0]);
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
async function run(path, inputs, expOutput) {
  return new Promise((resolve, reject) => {
    let p = spawn(path, {stdio: ["pipe"]});
      
    let timout = setTimeout(() => {
      if(!p.killed) {
        p.kill(); /// Kill after 4s
        resolve({success: false, message: `Program killed due to time`});
      } 
    }, 4000);

    let result = "";
    expOutput+="\n";

    /// Whenever data is received add to result
    p.stdout.on("data", (data) => {
      result+=data.toString();
    });

    /// When output stream end
    p.stdout.on("end", () => {
      clearInterval(timout);

      if(result.toString() == expOutput.toString()) 
        resolve({success: true});
      else 
        resolve({success: false, message: `expected ${expOutput.toString().replace("\n", "")} but received ${result.toString().replace("\n", "")}`})
      
    });


    let error = "";

    /// Error occur in program
    p.stderr.on("data", (err) => {
      error += err.toString().replaceAll("\n", "↵");
    });

    p.stderr.on("end", () => {
      if(error) {
        p.kill();
        clearInterval(timout);
        resolve({success: false, message: "Error in program!", err: error});
      }
    });

    /// Pass input to process in STDIN if needs input
    if(inputs.length > 0) {
      /// Supply inputs
      for(let i=0; i<inputs.length; i+=1) {
        streamWrite(p.stdin, `${inputs[i]}\n`);
      }
    }
  });
}

exports.c = c;



