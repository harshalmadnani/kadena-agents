/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { getPairList } from '../../api/pact';
import CommonTable from '../shared/CommonTable';
import { humanReadableNumber, reduceBalance } from '../../utils/reduceBalance';
import AppLoader from '../shared/AppLoader';
import { AddIcon, BoosterIcon, TradeUpIcon } from '../../assets';
import {DEFAULT_ICON_URL} from '../../constants/cryptoCurrencies';
import { ROUTE_LIQUIDITY_TOKENS, ROUTE_TOKEN_INFO } from '../../router/routes';
import { CryptoContainer, FlexContainer } from '../shared/FlexContainer';
import Label from '../shared/Label';
import { getAllPairsData } from '../../utils/token-utils';
import { useApplicationContext, usePactContext } from '../../contexts';
import { commonColors, theme } from '../../styles/theme';
import styled from 'styled-components';
import useWindowSize from '../../hooks/useWindowSize';
import DecimalFormatted from '../shared/DecimalFormatted';
import Search from '../shared/Search';

const LiquidityTokensTable = () => {
  const history = useHistory();
  const { themeMode } = useApplicationContext();
  const [loading, setLoading] = useState(true);
  const [allTokensList, setAllTokensList] = useState([]);
  const [searchValue, setSearchValue] = useState('');

  const { tokensUsdPrice, allTokens, allPairs } = usePactContext();

  const [width] = useWindowSize();

  const fetchData = async () => {
    const pairsList = await getPairList(allPairs);
    if (pairsList?.length) {
      const pairsData = await getAllPairsData(tokensUsdPrice, allTokens, allPairs, pairsList);
      const tokens = Object.values(allTokens);
      const result = [];
      // calculate sum of liquidity in usd and volumes in usd for each token in each pair
      for (const token of tokens) {
        const volume24UsdSum = pairsData
          .filter((t) => t.token0 === token.name || t.token1 === token.name)
          .reduce((total, v) => total + v.volume24HUsd, 0);

        const tokenPairs = pairsList.filter((p) => p.token0 === token.name || p.token1 === token.name);
        const tokenUsdPrice = tokensUsdPrice?.[token.code] ? tokensUsdPrice?.[token.code] : 0;
        
        const liquidityUSD = pairsData
          .filter((t) => t.token0 === token.name || t.token1 === token.name)
          .reduce((total, v) => total + (v.token0 === token.name ? v.liquidity0 : v.liquidity1), 0);

        let liquidity = 0;
        for (const tokenPair of tokenPairs) {
          liquidity += token.name === tokenPair.token0 ? reduceBalance(tokenPair.reserves[0]) : reduceBalance(tokenPair.reserves[1]);
        }

        const volume24H = volume24UsdSum / 2;
        let tokenInfo = pairsData
      .filter((d) => d.token0 === token.name || d.token1 === token.name)
      .sort((x, y) => (y.apr || 0) * (y.multiplier || 1) - (x.apr || 0) * (x.multiplier || 1));
    let apr = tokenInfo?.[0]?.apr || 0;
    let multiplier = tokenInfo?.[0]?.multiplier || 1;

    result.push({
      ...token,
      volume24HUsd: volume24H,
      volume24H,
      apr,
      liquidityUSD,
      liquidity,
      tokenUsdPrice,
      multiplier,
    });
  }
      setAllTokensList(result.sort((x, y) => y.liquidityUSD - x.liquidityUSD));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tokensUsdPrice) {
      fetchData();
    }
  }, [tokensUsdPrice, allTokens, allPairs]);

  const tokenList = allTokensList.filter((c) => {
    const code = c.code !== 'coin' ? c.code.split('.')[1] : c.code;
    return code.toLocaleLowerCase().includes(searchValue?.toLocaleLowerCase()) || c.name.toLowerCase().includes(searchValue?.toLowerCase());
  });

  return !loading ? (
    <CommonTable
      items={tokenList}
      columns={renderColumns(history, allTokens, width, searchValue, setSearchValue)}
      actions={[
       
        {
          icon: () => (
            <FlexContainer
              className="align-ce"
              style={{
                background: theme(themeMode).colors.white,
                padding: '8px 4px',
                borderRadius: 100,
                width: 24,
                height: 24,
              }}
            >
              <TradeUpIcon className="svg-app-inverted-color" />
            </FlexContainer>
          ),
          onClick: (item) => {
            history.push(ROUTE_TOKEN_INFO.replace(':token', item.name));
          },
        },
      ]}
    />
  ) : (
    <AppLoader className="h-100 w-100 align-ce justify-ce" />
  );
};

export default LiquidityTokensTable;

const ScalableCryptoContainer = styled(FlexContainer)`
  transition: all 0.3s ease-in-out;

  :hover {
    transform: scale(1.18);
  }
`;

const renderColumns = (history, allTokens, width, searchValue, setSearchValue) => {
  return [
    {
  name: (
    <Search
      containerStyle={{
        marginBottom: '-10px',
        marginTop: '-8px',
        border: 'none',
        width: '100px',
      }}
      iconFirst
      fluid
      placeholder="Search"
      value={searchValue}
      onChange={(e, { value }) => setSearchValue(value)}
    />
  ),
  width: width <= theme().mediaQueries.mobilePixel ? 80 : 100,
  render: ({ item }) => {
    const token = allTokens[item.name] || Object.values(allTokens).find(t => t.name === item.name || t.code === item.name);

    if (!token) {
      console.warn(`Token not found for ${item.name}`);
      return null;
    }

    return (
      <ScalableCryptoContainer 
        className="pointer" 
        onClick={() => history.push(ROUTE_TOKEN_INFO.replace(':token', item.statsId))}
        style={{ 
          flexDirection: width <= theme().mediaQueries.mobilePixel ? 'column' : 'row',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <CryptoContainer style={{ zIndex: 2 }}>
          <img
            alt={`${item.name} icon`}
            src={token.icon}
            style={{ 
              width: 20, 
              height: 20, 
              marginRight: width <= theme().mediaQueries.mobilePixel ? 0 : '8px'
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DEFAULT_ICON_URL;
            }}
          /> 
        </CryptoContainer>
        <span style={{ 
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: width <= theme().mediaQueries.mobilePixel ? 'wrap' : 'nowrap',
          maxWidth: width <= theme().mediaQueries.mobilePixel ? '70px' : 'none',
          fontSize: width <= theme().mediaQueries.mobilePixel ? '12px' : 'inherit',
          textAlign: width <= theme().mediaQueries.mobilePixel ? 'left' : 'left',
          lineHeight: width <= theme().mediaQueries.mobilePixel ? '1.2' : 'inherit'
        }}>
          {item.name}
        </span>
      </ScalableCryptoContainer>
    );
  },
},
    {
      name: 'price',
      width: width <= theme().mediaQueries.mobilePixel ? 120 : 100,
      sortBy: 'tokenUsdPrice',
      render: ({ item }) => (
        <ScalableCryptoContainer className="align-ce pointer h-100" onClick={() => history.push(ROUTE_TOKEN_INFO.replace(':token', item.statsId))}>
          <DecimalFormatted value={item.tokenUsdPrice} />
        </ScalableCryptoContainer>
      ),
    },
    {
      name: 'liquidity',
      width: 160,
      sortBy: 'liquidityUSD',
      render: ({ item }) => {
        if (item.liquidityUSD) {
          return `$ ${humanReadableNumber(item.liquidityUSD)}`;
        }
        return humanReadableNumber(item.liquidity);
      },
    },
    {
      name: '24h Volume',
      width: 160,
      sortBy: 'volume24HUsd',
      render: ({ item }) => {
        if (item.volume24HUsd) {
          return `$ ${humanReadableNumber(item.volume24HUsd)}`;
        } else {
          if (item.volume24H > 0) {
            return humanReadableNumber(item.volume24H);
          }
        }
        return '$ 0.00';
      },
    },

    {
      name: 'APR',
      width: 100,
      sortBy: 'apr',
      multiplier: 'multiplier',
      render: ({ item }) => {
        if (item.apr === undefined || item.apr === null) {
          return 'N/A';
        }
        
        const aprValue = Number(item.apr);
        const multiplierValue = Number(item.multiplier) || 1;
        
        if (isNaN(aprValue) || isNaN(multiplierValue)) {
          return 'N/A';
        }
        
        const totalApr = (aprValue * multiplierValue).toFixed(2);
        
        return multiplierValue > 1 ? (
          <FlexContainer className="align-ce svg-pink">
            <BoosterIcon style={{ width: 16, height: 16 }} />
            <Label labelStyle={{ fontWeight: 600, marginLeft: 6 }} fontSize={14} color={commonColors.pink}>
              {totalApr} %
            </Label>
          </FlexContainer>
        ) : (
          `${totalApr} %`
        );
      },
    },
  ];
};