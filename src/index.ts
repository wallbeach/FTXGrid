import { DefaultLogger, RestClient, WebsocketClient } from "ftx-api";
import { Database } from "./Database.js";
import { Position } from "./Position.js";
import { Config } from "./Config.js";

const config = new Config();

const key             = config.key;
const secret          = config.secret;
const subAccountName  = config.subAccountName;
const market          = config.market;

const _stepDistance   = config._stepDistance;
const _usedEquity     = config._usedEquity;
const _minEquity      = config._minEquity;
const _takeProfit     = config._takeProfit;

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


  // 4. Calculate buy / sell price
  let lastPos = await Position.get(market).catch(console.error);


  let buyPrice = currPrice - currPrice * _stepDistance;
  let buyAmount = totalBalanceBTC * _usedEquity / currPrice;
  let buyAmountRnd = +buyAmount.toFixed(3);
  let sellPrice = -1;
  let sellAmount = -1;

  if (lastPos) {
    sellPrice = lastPos.price + lastPos.price * _takeProfit;
    sellAmount = lastPos.size;

    if (sellPrice < currBid) {
      sellPrice = currBid;
    }
  }

  if (buyAmountRnd < _minEquity) {
    buyAmountRnd = _minEquity;
  }

  // If there is not enough ETH to sell, buy market first
  if (freeBalanceETH < buyAmountRnd || lastPos === undefined) {
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
      return;
    } catch (err) {
      console.warn(`[ALERT] Market order not successful ${err}`)
    }
  }

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

async function connect() {

  await Database.open();
  await start();

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
  ws.subscribe('fills');

}

async function handleResponse(msg: any) {


  if (msg.data != undefined) {
    //   console.log('Message: ', msg);
    console.log(`[ORDER FILLED] ${msg.data.market}: ${msg.data.side} of ${msg.data.size} ${msg.data.baseCurrency} for ${msg.data.price} ${msg.data.quoteCurrency} filled`)

    if (msg.data.side === 'buy') {
      await Position.set(msg.data.market, msg.data.price, msg.data.size);
    } else if (msg.data.side === 'sell') {
      await Position.deleteLast();
    }
    start();
  }

}

connect();




