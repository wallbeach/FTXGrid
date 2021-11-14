# FTXGrid
**FTXGrid is a grid trading bot designed to trade sideways markets.**


## Requirements

### FTX exchange
The bot is based on ftx.com exchange. In order to run the bot you need a trading account for which you can sign up here: https://ftx.com/referrals#a=ftxgrid (with this link you get a 5% discount on your trading fees, which makes a huge difference in sideways markets!)

### NodeJS
The bot is running on NodeJS and it is presumed you will want to run it with a process manager such as PM2, to automatically restart it in case of failure and keep it running when you detach from the terminal session. The following steps will make sure you have all prerequisits installed and the repository downloaded.
##### Install NodeJS
Both the bot itself as well as the process manager will be run on NodeJS. You can install NodeJS with `apt-get install nodejs`.

After NodeJS is installed, check the version with `node -v`. The required minimum version is 14. If the version shown is lower than that, you can upgrade it by executing the following command:

`curl -sL https://deb.nodesource.com/setup_14.x | sudo bash -`

After you have done that, you can install the new NodeJS version by executing `apt-get install nodejs` again.
##### Install NPM
The Node Package Manager (NPM) is required to install package requirements for the bot and can be installed with `apt-get install npm`, if it has no been installed already.
##### Install PM2
PM2 is a process manager that will keep your bot running as well as restart it after failure. It can be installed with `npm install pm2 -g`.
##### Install Git
Git will be used to clone the repository and keep the bot up to date. You can install it with `apt-get install git`.

## Setup
We now need to download and compile the source code and install the package requirements. The following steps will lead you through that process.
##### Clone FTXGrid
Navigate to the folder you want FTXGrid to be located in. Then run `git clone https://github.com/wallbeach/FTXGrid.git` to clone the repository.
##### Compile the Bot
Navigate into the bot folder and run `sh install.sh` to download all package requirements and compile the source code. You will be asked to give this bot a unique name, so the process manager can tell them apart, in case you want to run more than one.

## Configuration
To configure the bot, open the `config.ts` file with your favorite file editor and you should see the following list of configuration options.

| Option                     | Type     | Description
| -------------------------- | -------- | ---
| key                        | string   | The API key from the ftx.com exchange.
| secret                     | string   | The secret key from the ftx.com exchange.
| subAccountName             | string   | Name of the subaccount on ftx.com (optional)
| market                     | string   | Market to trade on (currently only designed for ETH/BTC pair)
| stepDistance               | number   | Distance to the next trade (0.005 means every 0.5%)
| usedEquity                 | number   | Used equity of the portfolio per trade (0.01 uses 1% of your portfolio)
| minEquity                  | number   | Minimum equity used per trade even if it's more than the percentage used in usedEquity
| takeProfit                 | number   | Sell position with that amound of profit (0.001 means 0.1% higher than the buy price)

## Starting, Restarting and Stopping
You can easily start, restart and stop the bot by executing the corresponding scripts, either with `sh start.sh`, `sh restart.sh` or `sh stop.sh`.

## Monitoring and Logs
To monitor your currently running bot, enter `pm2 monit` and select it with the arrow keys in the list on the left.
If you would like to check the log files, you can usually find them under `/root/.pm2/logs/` or you can check the latest log lines with `pm2 logs <BotName>`. For more PM2 commands, visit the [Quick Start Page](https://pm2.keymetrics.io/docs/usage/quick-start/).

## Updating the Bot
To update the bot to the newest version, execute `sh update.sh`. This will also automatically restart your bot after the update. Your current configuration will remain the same.
