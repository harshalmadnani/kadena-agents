// Mock Pact implementation for testing
const Pact = {
  fetch: {
    local: async (cmd, network) => ({
      result: {
        status: 'success',
        data: [100000.0, 50000.0, 'swap-account']
      }
    })
  },
  lang: {
    mkMeta: (sender, chainId, gasPrice, gasLimit, creationTime, ttl) => ({
      sender,
      chainId,
      gasPrice,
      gasLimit,
      creationTime,
      ttl
    }),
    mkCap: (name, desc, type, args) => ({
      name,
      description: desc,
      type,
      args
    })
  }
};

export default Pact;
