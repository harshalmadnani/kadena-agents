import { ChainId, Pact, createClient } from "@kadena/client";
import { networkId } from "../services/magic";
import { tokens } from "./tokens";

interface GetBalanceTransaction {
  chainId: ChainId;
  accountName: string;
}

interface TokenInfo {
  symbol: string;
  precision: number;
}

interface DecimalBalance {
  decimal: string;
}

interface TokenBalance {
  symbol: string;
  balance: number;
}

const getKadenaClient = (chainId: ChainId) => {
  return createClient(
    `https://api.chainweb.com/chainweb/0.0/${networkId}/chain/${chainId}/pact`
  );
};

const getTokens = (): { [key: string]: TokenInfo } => {
  return Object.entries(tokens).reduce(
    (
      acc: { [key: string]: TokenInfo },
      [tokenName, tokenInfo]: [string, any]
    ) => {
      acc[tokenName] = {
        symbol: tokenInfo.symbol,
        precision: tokenInfo.precision,
      };
      return acc;
    },
    {}
  );
};

export const buildGetBalanceTransaction = ({
  chainId,
  accountName,
  tokenName = "coin",
}: GetBalanceTransaction & { tokenName?: string }) => {
  const moduleAndFunction =
    tokenName === "coin"
      ? `(coin.get-balance "${accountName}")`
      : `(${tokenName}.get-balance "${accountName}")`;

  return Pact.builder
    .execution(moduleAndFunction)
    .setMeta({ chainId })
    .setNetworkId(networkId)
    .createTransaction();
};

export const getBalance = async (
  accountName: string,
  chainId: ChainId,
  tokenName: string = "coin"
) => {
  const kadenaClient = getKadenaClient(chainId);
  try {
    const transaction = buildGetBalanceTransaction({
      chainId,
      accountName,
      tokenName,
    });
    const response = await kadenaClient.dirtyRead(transaction);
    if (response.result.status === "success") {
      console.log(`Balance of ${tokenName}:`, response.result.data);
      return (response.result as any).data as number | DecimalBalance;
    }
    return 0;
  } catch (error) {
    console.error(`Failed to get ${tokenName} balance:`, error);
    return 0;
  }
};

export const getAllBalances = async (
  accountName: string,
  chainId: ChainId
): Promise<TokenBalance[]> => {
  const balances = await Promise.all(
    Object.entries(tokens).map(async ([tokenName, tokenInfo]) => {
      const balance = await getBalance(accountName, chainId, tokenName);
      return {
        symbol: tokenInfo.symbol,
        balance:
          typeof balance === "object" && (balance as DecimalBalance)?.decimal
            ? parseFloat((balance as DecimalBalance).decimal)
            : (balance as number),
      };
    })
  );

  console.log(balances);
  // Filter out zero balances
  return balances.filter(({ balance }) => balance > 0);
};
