import { DefaultLogger, RestClient, WebsocketClient } from "ftx-api";
import { Database } from "./Database.js";
import { Position } from "./Position.js";
import { IPortfolio, IPosition } from "./Interface.js";
import { Config } from "./Config.js";
import { Portfolio } from "./Portfolio.js";

const config = new Config();

const key             = config.key;
const secret          = config.secret;
const subAccountName  = config.subAccountName;
const market          = config.market;

const _stepDistance   = config.stepDistance;
const _usedEquity     = config.usedEquity;
const _minEquity      = config.minEquity;
const _takeProfit     = config.takeProfit;

const restClientOptions = { subAccountName: subAccountName };

async function start() {
  const client = new RestClient(key, secret, restClientOptions);

  let totalBalanceBTC;
  let freeBalanceBTC;
  let totalBalanceETH;
  let freeBalanceETH;
  let lastPrice;
  let currBid;
  let currAsk;
  let currPrice;
  let totalinbtc;

  // 1. Cancel all Orders
  await client.cancelAllOrders({ market: market }).catch(console.error);

  // 2. Get total balance
  let _balance = await client.getBalances().catch(console.error);

  for (const balance of _balance.result) {
    if (balance.coin === "BTC") {
      totalBalanceBTC = balance.total;
      freeBalanceBTC = balance.free;
    } else if (balance.coin === "ETH") {
      totalBalanceETH = balance.total;
      freeBalanceETH = balance.free;
    }
  }

  // console.log(`[INFO] Total Balance BTC: ${totalBalanceBTC} - Free Balance BTC: ${freeBalanceBTC}`);
  // console.log(`[INFO] Total Balance ETH: ${totalBalanceETH} - Free Balance ETH: ${freeBalanceETH}`);


  // 3. Get current market prices
  let _marketBTC = await client.getMarket(market).catch(console.error);



  lastPrice = _marketBTC.result.last;
  currBid = _marketBTC.result.bid;
  currAsk = _marketBTC.result.ask;
  currPrice = _marketBTC.result.price;

  totalinbtc = totalBalanceBTC + totalBalanceETH * currBid;

  const utcDate = new Date(Date.now());

  // Store Portfolio value
  let portfolio: IPortfolio = {market: market, timestamp: Date.now().toLocaleString(), btc: totalBalanceBTC, eth: totalBalanceETH, curr_bid: currBid, total_btc: totalinbtc};

  await Portfolio.save(portfolio);

  //console.log(`[PORTFOLIO] ${utcDate.toUTCString()} Total Balance BTC: ${totalBalanceBTC}, Total Balance ETH ${totalBalanceETH}, current bid price: ${currBid}, Total Value in BTC: ${totalinbtc}`);

  // 4. Calculate buy / sell price
  let sellPos = await Position.get(market).catch(console.error);


  let buyPrice = currPrice - currPrice * _stepDistance;
  let buyAmount = totalBalanceBTC * _usedEquity / currPrice;
  let buyAmountRnd = +buyAmount.toFixed(3);
  let sellPrice = -1;
  let sellAmount = -1;

  if (sellPos) {
    sellPrice = sellPos.price + sellPos.price * _takeProfit;
    sellAmount = sellPos.size;

    if (sellPrice < currBid) {
      sellPrice = currBid;
    }
  }
 /**
  // max drawdown
  let simBtc = totalBalanceBTC / currPrice;
  let simCnt = 0;
  let simPrice = currPrice;
  while(simBtc > 0) {
    simBtc = simBtc - buyAmountRnd;
    simPrice = simPrice - simPrice * _stepDistance;
    simCnt++;
  }

  console.log(`Max drawdown: ${simCnt} Positions until Price ${simPrice}`)
*/


  if (buyAmountRnd < _minEquity) {
    buyAmountRnd = _minEquity;
  }

  let buyPos: IPosition = {market: market, price: buyPrice, size: buyAmountRnd};

  // If there is not enough ETH to sell, buy market first
  if (freeBalanceETH < buyAmountRnd || sellPos === undefined) {
    try {
      await client.placeOrder({
        market,
        side: 'buy',
        price: null,
        type: 'market',
        size: buyAmountRnd
      }).catch(console.error);

      console.log(`[MARKET ORDER] BUY order: ${buyAmountRnd} ETH for ${currAsk}`);
      await Position.set(market, currAsk, buyAmountRnd);
      start();
    } catch (err) {
      console.warn(`[ALERT] Market order not successful ${err}`)
    }
  }else {

    // 5. Place limit buy order
    try {
      await client.placeOrder({
        market,
        side: 'buy',
        price: buyPrice,
        type: 'limit',
        size: buyAmountRnd
      });
    //  console.log(`[LIMIT ORDER] BUY order placed: ${buyAmountRnd} for ${buyPrice}`);

    } catch (err) {
      console.warn(`[ALERT] Limit buy order not successful ${err}`)
    }



    // 6. Place limit sell order
    if (sellPrice > 0 && sellAmount > 0) {
      try {
        await client.placeOrder({
          market,
          side: 'sell',
          price: sellPrice,
          type: 'limit',
          size: sellAmount
        });

    //    console.log(`[LIMIT ORDER] SELL order placed: ${sellAmount} for ${sellPrice}`);
      } catch (err) {
        console.warn(`[ALERT] Limit sell order not successful ${err}`)
      }

    }
  }
}  

async function connect() {

  // Turn debugging off
  DefaultLogger.silly = () => { };
  DefaultLogger.debug = () => { };
  DefaultLogger.notice = () => { };
  DefaultLogger.info = () => { };

  // Prepare a ws connection (connection init is automatic once ws client is instanced)
  const ws = new WebsocketClient({ key: key, secret: secret, subAccountName: subAccountName },
    DefaultLogger);

  // append event listeners
  ws.on('update', msg => handleResponse(msg));
  ws.on('error', msg => console.log('err: ', msg));

  // Subscribe to to topics
  // ws.subscribe(['fills', 'orders']);
  ws.subscribe(['orders']);

  await Database.open();
  await start();

}

async function handleResponse(msg: any) {


  if (msg.data != undefined) {
    // console.log('Message: ', msg);
    if (msg.channel === 'orders'){

      if (msg.data.status === 'closed' && msg.data.size === msg.data.filledSize){

        if (msg.data.side === 'buy') {
          if (msg.data.type === 'limit'){
            await Position.set(msg.data.market, msg.data.price, msg.data.size);
            console.log(`[ORDER FILLED] ${msg.data.market}: ${msg.data.side} of ${msg.data.size} ETH for ${msg.data.price} BTC filled`)
            start();
          }
        } else if (msg.data.side === 'sell') {
          await Position.deleteLast();
          console.log(`[ORDER FILLED] ${msg.data.market}: ${msg.data.side} of ${msg.data.size} ETH for ${msg.data.price} BTC filled`)
          start();
        }
      }
    }
  }

}

connect();