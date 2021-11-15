import { Database } from "./Database.js";
import { IPortfolio } from "./Interface.js";

class Portfolio {
    constructor() {}

    public async save(portfolio: IPortfolio) {
        await Database.execute({
            command: `
                INSERT INTO "Portfolio" (
                    "market",
                    "timestamp",
                    "btc",
                    "eth",
                    "curr_bid",
                    "total_btc"
                ) VALUES (
                    $market,
                    $timestamp,
                    $btc,
                    $eth,
                    $curr_bid,
                    $total_btc
                )`,
            params: {
                $market:       portfolio.market,
                $timestamp:    portfolio.timestamp,
                $btc:          portfolio.btc,
                $eth:          portfolio.eth,
                $curr_bid:     portfolio.curr_bid,
                $total_btc:    portfolio.total_btc
            }
        });
}


}

const _Portfolio = new Portfolio();
export { _Portfolio as Portfolio }