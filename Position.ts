import { Database } from "./Database.js";
import { IPosition } from "./Interface.js";

class Position {
    constructor() {}

    public async get(market: string) {
        const positions: IPosition = await Database.get({
            command: `
                SELECT
                    "market",
                    "price",
                    "size"
                FROM "Position"
                WHERE
                    "market"   = $market
                ORDER BY
                    "price" ASC
                LIMIT 1;`,
            params: {
                $market:   market
            }
        });

        return positions;
    }

    public async set(market: string, price: number, size: number) {
        await Database.execute({
            command: `
                INSERT INTO "Position" (
                    "market",
                    "price",
                    "size"
                ) VALUES (
                    $market,
                    $price,
                    $size
                )
                ON CONFLICT ("market", "price")
                DO UPDATE SET
                    "size"          = $size;`,
            params: {
                $market:   market,
                $price:    price,
                $size:     size
            }
        });
    }

    public async delete(market: string, price: number) {
        await Database.execute({
            command: `
                DELETE FROM "Position"
                WHERE
                    "market"   = $market AND
                    "price"    = $price;`,
            params: {
                $market:   market,
                $price:    price
            }
        });
    }

    public async deleteLast() {
        await Database.execute({
            command: `
                DELETE FROM Position
                WHERE price  = 
                (select min(price) from Position);`
        });
    }

}

const _Position = new Position();
export { _Position as Position }