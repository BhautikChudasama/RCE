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
