
const tmp = require("tmp");
const fs = require("fs");
const { spawn } = require("child_process");
const { streamWrite } = require("@rauschma/stringio");

/**
 * Executes JS, PYTHON programs
 * @param {String} lang - Language - python | go | js
 * @param {String} code - The code that to be execute
 * @param {String[]} inputs - The inputs that suuply in STDIN
 * @param {String} expOutput - The expected output
 * @returns {Promise<Object>} - Return output
 */
async function others(lang, code, inputs, expOutput) {
    return new Promise((resolve, reject) => {
        let command = ""; /// The command that we use to run the program
        let extension = ""; /// File extension from language

        switch(lang) {
        case "python":
            command = "python3";
            extension = ".py"
            break;
        case "go":
            command = "go";
            extension = ".go"
            break;
        case "js":
            command = "node";
            extension = ".js"
            break;
        case "shell":
            command = "sh";
            extension = ".sh"
            break;
        case "php":
            command = "php";
            extension = ".php";
        }

        let filePath = null;
        let file = null;

     
        file = tmp.fileSync({postfix: extension});
        filePath = file.name;
        code = code.replaceAll("↵", "\n");

        /// We also set limit to write size
        fs.writeFileSync(file.fd, code);
        
        let p = null;

        /// Other languages PYTHON | JS
        if(command !== "go")
            p = spawn(command, [filePath], {stdio: ["pipe"], shell: true, cwd: "/tmp"}); /// > command file.ext
        else 
            p = spawn(command, ["run", filePath], {stdio: ["pipe"], shell: true, cwd: "/tmp"}); /// > go run file.go

        let timeout = setTimeout(() => {
            if(!p.killed) {
                p.kill(); /// Kill after 4s
                /// Clear dir
                let regex = new RegExp("go-build.*");
                /// The go command caches build outputs for reuse in future builds
                fs.readdirSync("/tmp/").filter(f => regex.test(f)).map(f => fs.rmdirSync(`/tmp/${f}`, {force: true, recursive: true}));
                /// Deleted temp file
                file.removeCallback();
                resolve({matches: false, message: "Program was killed due to resource limits", hasError: false, expected: expOutput.toString(), actual: "", outOfResources: true, errorMessage: ""});
            } 
        }, 4000);

        let result = "";

        /// Whenever data is received add to result
        p.stdout.on("data", (data) => {
            result+=data.toString();
        });

        /// When output stream end
        p.stdout.on("end", () => {
            p.kill();
            file.removeCallback();
            clearInterval(timeout);
            
            /// In python after getting output append at last \n, It needs to remove
            result = result.split("\n"); 
            result[result.length-1]===""?result.pop():null;
            result = result.join("\n");

            if(result.toString() == expOutput.toString()) 
                resolve({matches: true, message: "Program works correctly", hasError: false, expected: expOutput.toString(), actual: result.toString(), outOfResources: false, errorMessage: ""});
            else 
                resolve({matches: false, message: `expected ${expOutput.toString().replace("\n", "↵")} but received ${result.toString().replace("\n", "↵")}`, hasError: false, expected: expOutput.toString(), actual: result.toString(), outOfResources: false, errorMessage: ""});
        });


        let error = "";

        /// Error occur in program
        p.stderr.on("data", (err) => {
            error += err.toString().replaceAll("\n", "↵");
        });

        p.stderr.on("end", () => {
            if(error) {
                p.kill();
                clearInterval(timeout);
                file.removeCallback();
                resolve({matches: false, message: "Program has errors", hasError: true, expected: expOutput.toString(), actual: "", outOfResources: false, errorMessage: error.toString()});
            }
        });

        /// Pass input to process in STDIN if needs input
        if(inputs.length > 0) {
            /// Supply inputs
            for(let i=0; i<inputs.length; i+=1) {
                streamWrite(p.stdin, `${inputs[i]}\n`);
            }
            p.stdin.end();
        }
        else 
            p.stdin.end();
    });
}

exports.others = others;

