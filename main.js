const axios = require('axios');
const express = require('express');
const cors = require('cors')
const app = express();

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function getBalance(clientPersonalAddress){
  let query = `query ($address: String!, $currency: String!) {
      ethereum(network: bsc) {
        address(address: {is: $address}) {
          balances(currency: {is: $currency}) {
            currency {
              address
              symbol
              tokenType
            }
            value
          }
        }
        dexTrades(
          baseCurrency: {is: "0xb7cef49d89321e22dd3f51a212d58398ad542640"}
          quoteCurrency: {is: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"}
          options: {desc: ["block.height", "transaction.index"], limit: 1}
        ) {
          block {
            height
            timestamp {
              time(format: "%Y-%m-%d %H:%M:%S")
            }
          }
          transaction {
            index
          }
          baseCurrency {
            symbol
          }
          quoteCurrency {
            symbol
          }
          quotePrice
        }
      }
    }
    `;

  let queryBNBVaue = `query {
      ethereum(network: bsc){
        dexTrades(
          baseCurrency: {is: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"}
          quoteCurrency: {is: "0x55d398326f99059ff775485246999027b3197955"}
          options: {desc: ["block.height","transaction.index"] limit:1}
         ) {
          block{
            height
            timestamp{
              time (format: "%Y-%m-%d %H:%M:%S")
            }
          }
          transaction {
            index
          }
          baseCurrency{
            symbol
          }
          quoteCurrency {
            symbol
          }
          quotePrice
        }
      }
    }`;
  let variables =  {
      "network":"bsc",
      "address": clientPersonalAddress,
      "currency" : "0xb7cef49d89321e22dd3f51a212d58398ad542640"
  }
  
  const promise1 = axios.post('https://graphql.bitquery.io/', {query: query, variables: variables});
  const promise2 = axios.post('https://graphql.bitquery.io/', {query: queryBNBVaue});

  let resPromises = await Promise.all([promise1, promise2]);

  let res = resPromises[0];
  let resBNBPrice = resPromises[1];

  let data = res.data.data;
  let dataPrice = resBNBPrice.data.data;

  let balance = data.ethereum.address[0].balances[0].value;
  let currentPrice = data.ethereum.dexTrades[0].quotePrice;
  let totalBNB = balance * currentPrice;
  let bnbPrice = dataPrice.ethereum.dexTrades[0].quotePrice;
  let totalValueInUSD = totalBNB * bnbPrice;
  let balanceToString = numberWithCommas(Math.trunc(balance));
  let totalToString = numberWithCommas(Math.trunc(totalValueInUSD));
  //console.log(balance, balanceToString,totalValueInUSD);

  return {
    success: true,
    tokenBalance : balanceToString,
    totalValue : totalToString,
    currency : "USDT"
  }
  
}

app.get('/balance', cors(),  async function (req, res) {

  try{
    if(!req.query)
      return res.send("NO PARAMS PASSED")

    if(!req.query.wallet)
      return res.send("NO wallet params PASSED")

    let contract = req.query.wallet;
    let data = await getBalance(contract)

    if(data.success){
      res.json(data);
    } else {
      return res.send("Please try again later")
    }

  } catch (err){
    res.json({"error" : "Try to check if your wallet address is valid."});
  }

})

const server = app.listen(3000, function () {
   var host = server.address().address
   var port = server.address().port
   console.log("App listening at http://localhost:%s", port)

})
