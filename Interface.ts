import { text } from "stream/consumers"

interface IPosition {
    market: string;
    price:   number;
    size: number;
}

interface IPortfolio {
    market:     string;
    timestamp:  string;
    btc:        number;
    eth:        number;
    curr_bid:   number;
    total_btc:  number;

}

export { IPosition, IPortfolio }