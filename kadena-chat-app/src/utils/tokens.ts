interface TokenInfo {
  symbol: string;
  name: string;
  precision: number;
}

export const tokens: { [key: string]: TokenInfo } = {
  coin: {
    symbol: "KDA",
    name: "KDA",
    precision: 12,
  },
  "arkade.token": {
    symbol: "ARKD",
    name: "Arkade",
    precision: 12,
  },
  "free.maga": {
    symbol: "MAGA",
    name: "MAGA",
    precision: 12,
  },
  "free.crankk01": {
    symbol: "CRKK",
    name: "CRKK",
    precision: 12,
  },
  "free.cyberfly_token": {
    symbol: "CFLY",
    name: "CFLY",
    precision: 8,
  },
  "free.finux": {
    symbol: "FINX",
    name: "FINUX",
    precision: 12,
  },
  "free.kishu-ken": {
    symbol: "KISHK",
    name: "KISHK",
    precision: 12,
  },
  "kaddex.kdx": {
    symbol: "KDX",
    name: "KDX",
    precision: 12,
  },
  "n_625e9938ae84bdb7d190f14fc283c7a6dfc15d58.ktoshi": {
    symbol: "KTO",
    name: "KTO",
    precision: 15,
  },
  "n_b742b4e9c600892af545afb408326e82a6c0c6ed.zUSD": {
    symbol: "zUSD",
    name: "zUSD",
    precision: 18,
  },
  "n_e309f0fa7cf3a13f93a8da5325cdad32790d2070.heron": {
    symbol: "HERON",
    name: "HERON",
    precision: 12,
  },
  "n_582fed11af00dc626812cd7890bb88e72067f28c.bro": {
    symbol: "BRO",
    name: "BRO",
    precision: 12,
  },
  "runonflux.flux": {
    symbol: "FLUX",
    name: "FLUX",
    precision: 8,
  },
  "free.wiza": {
    symbol: "WIZA",
    name: "WIZA",
    precision: 12,
  },
  "hypercent.prod-hype-coin": {
    symbol: "HYPE",
    name: "HYPE",
    precision: 12,
  },
};
