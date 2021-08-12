process.env.NODE_ENV = "test";

const chai = require("chai");
const chaiHttp = require("chai-http");
const expect = chai.expect;
chai.use(chaiHttp);

const server = require("../server.js");

describe("/ API", () => {
  it("should return 404 on /", async () => {
    chai
      .request(server)
      .get("/")
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(404);
      });
  });
});

describe("Check programs for Python lang", () => {
  it("should successfully run the program", done => {
    chai.request(server)
      .post('/run')
      .send({
        "language": "python",
        "code": "print(\"Hello\", end=\"\")",
        "input": "Hello",
        "eo": "Hello"
      })
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.be.json
        expect(res).to.have.status(200)
        expect(res.body.matches).to.be.true
        expect(res.body.message).to.equal("Program works correctly")
        expect(res.body.expected).to.equal("Hello")
        expect(res.body.actual).to.equal("Hello")
        expect(res.body.hasError).to.be.false
        expect(res.body.outOfResources).to.be.false
        expect(res.body.errorMessage).to.equal("")
        done()
      })
  })
});
