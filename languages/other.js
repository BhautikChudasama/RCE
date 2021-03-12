
const tmp = require("tmp");
const fs = require("fs");
const { spawn } = require("child_process");
const { streamWrite } = require("@rauschma/stringio");


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
            p = spawn(command, [filePath], {stdio: ["pipe"], shell: true, cwd: "/tmp"});
        else 
            p = spawn(command, ["run", filePath], {stdio: ["pipe"], shell: true, cwd: "/tmp"});

        let timout = setTimeout(() => {
            if(!p.killed) {
                p.kill(); /// Kill after 4s
                file.removeCallback();
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
            p.kill();
            file.removeCallback();
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
                if(command != "java")
                file.removeCallback();
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

exports.others = others;

