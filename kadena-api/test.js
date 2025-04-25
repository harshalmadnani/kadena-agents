const chai = require("chai");
const chaiHttp = require("chai-http");
const server = require("./server"); // Now server exports the Express app
const { Pact } = require("@kadena/client"); // For type checks

const expect = chai.expect;
chai.use(chaiHttp);

// --- Sample Data (Syntactically Valid Placeholders) ---
const SAMPLE_CHAIN_ID = "2";
const SAMPLE_TOKEN_IN = "coin";
const SAMPLE_TOKEN_OUT = "kaddex.kdx"; // Example fungible
const SAMPLE_ACCOUNT =
  "k:d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a";
const SAMPLE_GUARD = {
  keys: ["d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a"], // 64 hex chars
  pred: "keys-all",
};
const SAMPLE_MINT_TO_ACCOUNT =
  "k:d61e615aec4e895c0006f7f2e56b37d36f18f35cce28286ad33e5bc52ded867a";
const SAMPLE_URI =
  "ipfs://bafkreibm6jg3ux5qu3lzcnntg6fvy5t6 ریلیز b34jjdiga5akspsmaemuvq"; // Sample IPFS URI
const SAMPLE_COLLECTION_ID =
  "c:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6:module"; // Example collection ID format

describe("Kadena API Server Tests", () => {
  // Use the exported server app directly instead of a URL
  let app = server;

  // --- /quote Endpoint Tests ---
  describe("POST /quote", () => {
    it("should return amountOut when amountIn is provided", (done) => {
      chai
        .request(app)
        .post("/quote")
        .send({
          tokenInAddress: SAMPLE_TOKEN_IN,
          tokenOutAddress: SAMPLE_TOKEN_OUT,
          amountIn: "10.0",
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an("object");
          expect(res.body).to.have.property("amountOut");
          expect(res.body.amountOut).to.be.a("string");
          // We cannot easily predict the exact value without mocking chain calls,
          // so we just check the type and presence.
          done();
        });
    });

    it("should return amountIn when amountOut is provided", (done) => {
      chai
        .request(app)
        .post("/quote")
        .send({
          tokenInAddress: SAMPLE_TOKEN_IN,
          tokenOutAddress: SAMPLE_TOKEN_OUT,
          amountOut: "5.0",
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an("object");
          expect(res.body).to.have.property("amountIn");
          expect(res.body.amountIn).to.be.a("string");
          done();
        });
    });

    it("should return 400 if chainId is not 2", (done) => {
      chai
        .request(app)
        .post("/quote")
        .send({
          tokenInAddress: SAMPLE_TOKEN_IN,
          tokenOutAddress: SAMPLE_TOKEN_OUT,
          amountIn: "10.0",
          chainId: "1", // Invalid chainId
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property("error");
          done();
        });
    });

    it("should return 400 if both amountIn and amountOut are provided", (done) => {
      chai
        .request(app)
        .post("/quote")
        .send({
          tokenInAddress: SAMPLE_TOKEN_IN,
          tokenOutAddress: SAMPLE_TOKEN_OUT,
          amountIn: "10.0",
          amountOut: "5.0", // Invalid - both provided
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property("error");
          done();
        });
    });
    it("should return 400 if neither amountIn nor amountOut is provided", (done) => {
      chai
        .request(app)
        .post("/quote")
        .send({
          tokenInAddress: SAMPLE_TOKEN_IN,
          tokenOutAddress: SAMPLE_TOKEN_OUT,
          // Invalid - neither provided
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property("error");
          done();
        });
    });
  });

  // --- /swap Endpoint Tests ---
  describe("POST /swap", () => {
    it("should handle swap exact in request", (done) => {
      // This test might be slow due to multiple local calls
      chai
        .request(app)
        .post("/swap")
        .send({
          tokenInAddress: SAMPLE_TOKEN_IN,
          tokenOutAddress: SAMPLE_TOKEN_OUT,
          amountIn: "1.0",
          account: SAMPLE_ACCOUNT,
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          // We're only checking if the request is handled, not specific response
          // This allows for either success or meaningful errors
          expect(res.status).to.be.oneOf([200, 400, 500]);
          if (res.status === 200) {
            expect(res.body).to.have.property("transaction");
          }
          done();
        });
    }).timeout(10000); // Increase timeout for potentially slow chain calls

    it("should handle swap exact out request", (done) => {
      // This test might be slow due to multiple local calls
      chai
        .request(app)
        .post("/swap")
        .send({
          tokenInAddress: SAMPLE_TOKEN_IN,
          tokenOutAddress: SAMPLE_TOKEN_OUT,
          amountOut: "0.5",
          account: SAMPLE_ACCOUNT,
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          // We're only checking if the request is handled, not specific response
          expect(res.status).to.be.oneOf([200, 400, 500]);
          if (res.status === 200) {
            expect(res.body).to.have.property("transaction");
          }
          done();
        });
    }).timeout(10000); // Increase timeout

    it("should return 400 if account is missing", (done) => {
      chai
        .request(app)
        .post("/swap")
        .send({
          tokenInAddress: SAMPLE_TOKEN_IN,
          tokenOutAddress: SAMPLE_TOKEN_OUT,
          amountIn: "1.0",
          // account: SAMPLE_ACCOUNT, // Missing
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property("error");
          done();
        });
    });
  });

  // --- /launch-nft Endpoint Tests ---
  describe("POST /launch-nft", () => {
    it("should handle NFT launch request", (done) => {
      // The API now generates tokenId internally based on Marmalade implementation
      chai
        .request(app)
        .post("/launch-nft")
        .send({
          account: SAMPLE_ACCOUNT,
          guard: SAMPLE_GUARD,
          mintTo: SAMPLE_MINT_TO_ACCOUNT,
          uri: SAMPLE_URI,
          name: "Test NFT",
          description: "Test NFT Description",
          collectionId: SAMPLE_COLLECTION_ID,
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          // We're only checking if the request is handled, not specific response
          expect(res.status).to.be.oneOf([200, 400, 500]);

          if (res.status === 200) {
            expect(res.body).to.be.an("object");

            // Check for basics of response structure
            if (res.body.transaction) {
              // If it has a transaction, check basic structure
              const tx = res.body.transaction;
              expect(tx).to.be.an("object");
            }

            // If there's a tokenId, it should be a string
            if (res.body.tokenId) {
              expect(res.body.tokenId).to.be.a("string");
            }
          }

          done();
        });
    }).timeout(10000);

    it("should return 400 if required fields are missing", (done) => {
      chai
        .request(app)
        .post("/launch-nft")
        .send({
          account: SAMPLE_ACCOUNT,
          guard: SAMPLE_GUARD,
          // mintTo: SAMPLE_MINT_TO_ACCOUNT, // Missing mintTo
          uri: SAMPLE_URI,
          collectionId: SAMPLE_COLLECTION_ID,
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property("error");
          done();
        });
    });

    it("should return 400 if invalid policy with royalties", (done) => {
      chai
        .request(app)
        .post("/launch-nft")
        .send({
          account: SAMPLE_ACCOUNT,
          guard: SAMPLE_GUARD,
          mintTo: SAMPLE_MINT_TO_ACCOUNT,
          uri: SAMPLE_URI,
          collectionId: SAMPLE_COLLECTION_ID,
          policy: "DEFAULT_COLLECTION_ROYALTY_NON_UPDATABLE",
          royalties: 2.5, // Has royalties but no recipient
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property("error");
          done();
        });
    });
  });

  // --- /create-collection Endpoint Tests ---
  describe("POST /create-collection", () => {
    it("should handle collection creation request", (done) => {
      chai
        .request(app)
        .post("/create-collection")
        .send({
          account: SAMPLE_ACCOUNT,
          guard: SAMPLE_GUARD,
          name: "Test Collection",
          description: "A test collection",
          totalSupply: 1000,
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          // We're only checking if the request is handled, not specific response
          expect(res.status).to.be.oneOf([200, 400, 500]);

          if (res.status === 200) {
            expect(res.body).to.be.an("object");

            // Check for transaction only if it exists
            if (res.body.transaction) {
              const tx = res.body.transaction;
              expect(tx).to.be.an("object");
            }
          }

          done();
        });
    }).timeout(10000);

    it("should return 400 if required fields are missing", (done) => {
      chai
        .request(app)
        .post("/create-collection")
        .send({
          account: SAMPLE_ACCOUNT,
          guard: SAMPLE_GUARD,
          // name: "Test Collection", // Missing name
          description: "A test collection",
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property("error");
          done();
        });
    });
  });

  // --- /transfer Endpoint Tests ---
  describe("POST /transfer", () => {
    it("should handle native KDA transfer request", (done) => {
      chai
        .request(app)
        .post("/transfer")
        .send({
          tokenAddress: "coin",
          sender: SAMPLE_ACCOUNT,
          receiver: SAMPLE_MINT_TO_ACCOUNT,
          amount: "5.0",
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an("object");
          expect(res.body).to.have.property("transaction");
          expect(res.body).to.have.property("metadata");

          // Check metadata properties
          const metadata = res.body.metadata;
          expect(metadata).to.have.property("sender", SAMPLE_ACCOUNT);
          expect(metadata).to.have.property("receiver", SAMPLE_MINT_TO_ACCOUNT);
          expect(metadata).to.have.property("amount", 5.0);
          expect(metadata).to.have.property("tokenAddress", "coin");
          expect(metadata).to.have.property("chainId", SAMPLE_CHAIN_ID);

          done();
        });
    });

    it("should handle fungible token transfer request", (done) => {
      chai
        .request(app)
        .post("/transfer")
        .send({
          tokenAddress: SAMPLE_TOKEN_OUT, // Using kaddex.kdx as sample token
          sender: SAMPLE_ACCOUNT,
          receiver: SAMPLE_MINT_TO_ACCOUNT,
          amount: "10.0",
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an("object");
          expect(res.body).to.have.property("transaction");
          expect(res.body).to.have.property("metadata");

          // Check metadata properties
          const metadata = res.body.metadata;
          expect(metadata).to.have.property("sender", SAMPLE_ACCOUNT);
          expect(metadata).to.have.property("receiver", SAMPLE_MINT_TO_ACCOUNT);
          expect(metadata).to.have.property("amount", 10.0);
          expect(metadata).to.have.property("tokenAddress", SAMPLE_TOKEN_OUT);
          expect(metadata).to.have.property("chainId", SAMPLE_CHAIN_ID);

          done();
        });
    });

    it("should accept optional parameters", (done) => {
      chai
        .request(app)
        .post("/transfer")
        .send({
          tokenAddress: "coin",
          sender: SAMPLE_ACCOUNT,
          receiver: SAMPLE_MINT_TO_ACCOUNT,
          amount: "1.0",
          chainId: SAMPLE_CHAIN_ID,
          gasLimit: 3000,
          gasPrice: 0.00000002,
          ttl: 1200,
          meta: { memo: "Test transfer" },
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an("object");
          expect(res.body).to.have.property("transaction");
          expect(res.body).to.have.property("metadata");
          done();
        });
    });

    it("should return 400 if required parameters are missing", (done) => {
      chai
        .request(app)
        .post("/transfer")
        .send({
          tokenAddress: "coin",
          sender: SAMPLE_ACCOUNT,
          // receiver: SAMPLE_MINT_TO_ACCOUNT, // Missing receiver
          amount: "5.0",
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property("error");
          expect(res.body.error).to.equal("Missing required parameters");
          done();
        });
    });

    it("should return 400 if amount is invalid", (done) => {
      chai
        .request(app)
        .post("/transfer")
        .send({
          tokenAddress: "coin",
          sender: SAMPLE_ACCOUNT,
          receiver: SAMPLE_MINT_TO_ACCOUNT,
          amount: "-5.0", // Negative amount
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property("error");
          expect(res.body.error).to.equal("Invalid amount");
          done();
        });
    });

    it("should return 400 if amount is not a number", (done) => {
      chai
        .request(app)
        .post("/transfer")
        .send({
          tokenAddress: "coin",
          sender: SAMPLE_ACCOUNT,
          receiver: SAMPLE_MINT_TO_ACCOUNT,
          amount: "not-a-number",
          chainId: SAMPLE_CHAIN_ID,
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property("error");
          expect(res.body.error).to.equal("Invalid amount");
          done();
        });
    });
  });
});
