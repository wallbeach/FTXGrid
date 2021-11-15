import sqlite3 from "sqlite3";

class Database {
    _path: string;
    _database!: sqlite3.Database;
    _tables: string[];

    constructor() {
        this._path = "./database/data.sqlite3";
        this._tables = [];

        this._tables.push(`
            CREATE TABLE IF NOT EXISTS "Position" (
                "market"   TEXT    NOT NULL,
                "price"    REAL    NOT NULL,
                "size"     REAL    NOT NULL,

                PRIMARY KEY ("market", "price")
            );
        `);

        this._tables.push(`
            CREATE TABLE IF NOT EXISTS "Portfolio" (
                "market"        TEXT    NOT NULL,		
                "timestamp"     TEXT    NOT NULL,		
                "btc"   		REAL    NULL,		
                "eth"           REAL    NULL,		
                "curr_bid"      REAL    NOT NULL,		
                "total_btc"     REAL    NOT NULL,		
                PRIMARY KEY ("timestamp")
            );
            `);

    }

    public async open(): Promise<boolean> {
        // Check if the database is already open.
        if (this._database) {
            return true;
        }

        // Open a new database,
        this._database = new sqlite3.Database(this._path);
        console.log(`[Database] Opened ${this._path}`);

        // Put the database into Write Ahead Log mode.
        const walModeActivated = await this.execute({ command: "PRAGMA journal_mode = WAL;" })

        if (!walModeActivated) {
            return false;
        }

        console.log(`[Database] Journal Mode for ${this._path} changed to WAL`);

        // Put the database into normal synchronisation mode.
        const normalSyncModeActivated = await this.execute({ command: "PRAGMA synchronous = normal;" })

        if (!normalSyncModeActivated) {
            return false;
        }

        console.log(`[Database] Synchronisation Mode for ${this._path} changed to NORMAL`);

        // Save temporary indices in memory instead of disk.
        const memoryTempStoreActivated = await this.execute({ command: "PRAGMA temp_store = memory;" })

        if (!memoryTempStoreActivated) {
            return false;
        }

        console.log(`[Database] Temporary index storage for ${this._path} changed to MEMORY`);

        // Change the page size to 32KB.
        const pageSizeChanged = await this.execute({ command: "PRAGMA page_size = 32768;" });

        if (!pageSizeChanged) {
            return false;
        }

        console.log(`[Database] Page Size for ${this._path} changed to 32KB`);

        // Make sure the table structure of the database is created.
        const databaseStructureCreated = await this.create();

        if (!databaseStructureCreated) {
            return false;
        }

        console.log(`[Database] ${this._path} is ready`);

        return true;
    }

    public close(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            if (this._database) {
                this._database.close((err) => {
                    if (err) {
                        console.log(err);
                        resolve(false);
                    }
                    else {
                        console.log(`[Database] Closed ${this._path}`);
                        resolve(true);
                    }
                });
            }
            else {
                resolve(true);
            }
        });
    }

    public execute(executeOptions: { command: string, params?: any }): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            this._database.run(executeOptions.command, executeOptions.params, (err) => {
                if (err) {
                    console.log(err);
                    resolve(false);
                }
                else {
                    resolve(true);
                }
            });
        });
    }

    public get(getOptions: { command: string, params: any }): Promise<any | null> {
        return new Promise<any | null>((resolve) => {
            this._database.get(getOptions.command, getOptions.params, async (err, sqliteData) => {
                if (err) {
                    console.log(err);
                    resolve(null);
                }
                else {
                    resolve(sqliteData);
                }
            });
        });
    }

    public all(allOptions: { command: string, params: any }): Promise<any[] | null> {
        return new Promise<any[] | null>((resolve) => {
            this._database.all(allOptions.command, allOptions.params, async (err, sqliteData) => {
                if (err) {
                    console.log(err);
                    resolve(null);
                }
                else {
                    resolve(sqliteData);
                }
            });
        });
    }

    private async create(): Promise<boolean> {
        for (const table of this._tables) {
            const created = await this.execute({ command: table });

            if (!created) {
                return false;
            }
        }

        return true;
    }
}

const _Database = new Database();
export { _Database as Database }