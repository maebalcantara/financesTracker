//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

// let sampleCapital = 100000;
var today = new Date();
var date = today.toLocaleString('default', { month: 'long' }) + ' ' + today.getDate() + ' '+ today.getFullYear() + ', ' + today.getHours() + ":" + today.getMinutes();
let loginUsername ="app.js"
//Initializing mongoose
mongoose.connect('mongodb://localhost:27017/InvestmentDB');

//Portfolio DB
const stockEntrySchema = new mongoose.Schema({
  stockCode: String,
  purchasePrice: Number,
  marketPrice: Number,
  totalShares: Number,
  totalPrice: Number,
  glPercentage: Number,
  glMonetary: Number
});

const Stock = new mongoose.model("Stock", stockEntrySchema);

// History DB
const historySchema = new mongoose.Schema({
  datePosted: String,
  stockCode: String,
  action: String,
  quantity: Number,
  price: Number,
  total: Number
});

const History = new mongoose.model("History", historySchema);

const accountSchema = new mongoose.Schema({
  username: String,
  password: String,
  capital: Number,
  stocks: [stockEntrySchema],
  history: [historySchema]
});

const Account = new mongoose.model("Account", accountSchema);

//Home
app.get("/home", function(req, res) {
  let finalPrice = 0;
  let finalGLPercentage = 0;
  let finalGLMonetary = 0;
  
  // Stock.find({}, function(err, stockItem) {
  //   History.find({}, function(err, historyItem){

  //     //To get the total price, gain/loss
  //     stockItem.map((stockValue) => {
  //       finalPrice = finalPrice + stockValue.totalPrice;
  //       finalGLPercentage = finalGLPercentage + stockValue.glPercentage;
  //       finalGLMonetary = finalGLMonetary + stockValue.glMonetary;
  //     });
  //     let finalCapital = sampleCapital - finalPrice;
  //     if(!err){
  //       res.render("home.ejs", {
  //         historyEntryLoop: historyItem,
  //         stockEntryLoop: stockItem,
  //         sampleCapital: sampleCapital,
  //         finalPrice: finalPrice,
  //         finalGLPercentage: finalGLPercentage,
  //         finalGLMonetary: finalGLMonetary,
  //         finalCapital: finalCapital
  //       });
  //     }
  //     else{
  //       console.log(err)
  //     }
  //   });
  // });
  
});

app.post("/home", function(req, res) {
  let finalPrice = 0;
  let finalGLPercentage = 0;
  let finalGLMonetary = 0;
  let finalCapital = 0;
  //Home Purchase
  let stockCode = req.body.stockCode;
  let purchasePrice = parseFloat(req.body.purchasePrice);
  let marketPrice = parseFloat(req.body.marketPrice);
  let totalSharesVar = parseFloat(req.body.totalShares);
  let totalPrice = parseFloat(purchasePrice * totalSharesVar).toFixed(2);
  let glPercentage = parseFloat((marketPrice - purchasePrice)/purchasePrice * 100).toFixed(2)
  let glMonetary = parseFloat((totalPrice/100)*glPercentage).toFixed(2)
  
  //From Login
  if (stockCode == undefined){
    loginUsername = req.body.loginUsername;
    //Account Login Post
    Account.findOne({username: loginUsername}, function(err, account){
      account.stocks.map((accountStock) => {
        finalPrice = finalPrice + accountStock.totalPrice
        finalGLPercentage = finalGLPercentage + accountStock.glPercentage;
        finalGLMonetary = finalGLMonetary + accountStock.glMonetary;  
      });
      
      finalCapital = account.capital - finalPrice;
     
      Account.updateOne({username: loginUsername}, {$set: {capital: finalCapital}}, function(err){
        if(err){
           console.log(err)
        }
      });  

      if(!err){
        if(account){
          res.render("home.ejs", 
          {stockEntryLoop: account.stocks,
          finalPrice: finalPrice,
          finalGLPercentage : finalGLPercentage,
          finalGLMonetary: finalGLMonetary,
          finalCapital: finalCapital,
          loginUsername: loginUsername
          });
        }
      }
    });
  }
  //Enter info Transaction
  else{
    // Filter if stock code already exists on DB.
    Account.findOne({username: loginUsername}, function(err, accountFoundStock){
    if(!err){
      if(accountFoundStock){
        const foundStock = accountFoundStock.stocks.find(stock => stock.stockCode === stockCode);
        //Filter if stock is not found.
        if (!foundStock){
          const stock = ({
            stockCode: stockCode,
            marketPrice: marketPrice,
            purchasePrice: purchasePrice,
            totalShares: totalSharesVar,
            totalPrice: totalPrice,
            glPercentage: glPercentage,
            glMonetary: glMonetary
          });
          accountFoundStock.stocks.push(stock);
          
          const history = ({
            datePosted: date,
            stockCode: stockCode,
            action: 'Buy',
            quantity: totalSharesVar,
            price: purchasePrice,
            total: totalPrice
          });
          accountFoundStock.history.push(history);
          accountFoundStock.save();
  
          accountFoundStock.stocks.map((accountStock) => {
            finalPrice = finalPrice + accountStock.totalPrice
            finalGLPercentage = finalGLPercentage + accountStock.glPercentage;
            finalGLMonetary = finalGLMonetary + accountStock.glMonetary;         
          });
          finalCapital = accountFoundStock.capital - finalPrice;
   
          res.render("home.ejs", 
          {stockEntryLoop: accountFoundStock.stocks,
          finalPrice: finalPrice,
          finalGLPercentage : finalGLPercentage,
          finalGLMonetary: finalGLMonetary,
          finalCapital: finalCapital,
          loginUsername: loginUsername
          });
        }
        //Filter if stock is found.
        else{
          //To do 2/12 - test run update.. and transaction .. balik yung hsitory table ..create sign up when everything is good.
          const foundStock = accountFoundStock.stocks.find(stock => stock.stockCode == stockCode);
          const currentMarketPrice = foundStock.marketPrice;
          const newMarketPrice = currentMarketPrice + marketPrice;

          const currentPurchasePrice = foundStock.purchasePrice;
          const newPurchasePrice = currentPurchasePrice + purchasePrice;

          const currentTotalShares = foundStock.totalShares;
          const newTotalShares = currentTotalShares + totalSharesVar;
     
          //Update History table
          const history = ({
            datePosted: date,
            stockCode: stockCode,
            action: 'Append',
            quantity: totalSharesVar,
            price: purchasePrice,
            total: totalPrice
          });
          accountFoundStock.history.push(history);
        
          accountFoundStock.stocks.map((accountStock) => {
            finalPrice = finalPrice + accountStock.totalPrice
            finalGLPercentage = finalGLPercentage + accountStock.glPercentage;
            finalGLMonetary = finalGLMonetary + accountStock.glMonetary;         
          });
          finalCapital = accountFoundStock.capital - finalPrice;
          
          Account.updateOne({username: loginUsername, "stocks.stockCode" : stockCode}, {'$set' : {'stocks.$.totalShares' : newTotalShares, 'stocks.$.purchasePrice' : newPurchasePrice, 'stocks.$.marketPrice' : newMarketPrice}}, function(err){
          });
          accountFoundStock.save();

          res.render("home.ejs", {
          stockEntryLoop: accountFoundStock.stocks,
          finalPrice: finalPrice,
          finalGLPercentage : finalGLPercentage,
          finalGLMonetary: finalGLMonetary,
          finalCapital: finalCapital,
          loginUsername: loginUsername
          });
          }
      }
      else{
        console.log(loginUsername)      
      }
    }
    //Error
    else{
      console.log(err)
    }
  });
  }
});

//Transaction
app.get("/transaction", function(req, res){
  res.render("transaction.ejs", {
    stockCode: "",
    totalShares: 300,
    sampleCapital: sampleCapital
  });
});


app.post("/transaction", function(req,res){
   const sellStockCode = req.body.sellStockCode;

   Account.findOne({username: loginUsername}, function(err, accountFoundStock){
    if (!err){
      const foundStock = accountFoundStock.stocks.find(stock => stock.stockCode == sellStockCode)
      // console.log(foundStock);
      //Account is found     
      res.render("transaction.ejs", {
        stockCode: foundStock.stockCode,
        sampleCapital: accountFoundStock.capital,
        totalShares: foundStock.totalShares
      });
    }
  });

  // //Transaction Post
  let transactionNumOfShares = parseInt(req.body.transactionNumOfShares);
  let transactionStockCode = req.body.transactionStockCode;
  let transactionChoice = req.body.transactionChoice;
  let transactionMarketPrice = parseFloat(req.body.transactionMarketPrice).toFixed(2);
  let transactionPrice = parseFloat(req.body.transactionPrice).toFixed(2);
  let transactionTotalPrice = transactionNumOfShares * transactionPrice;
  let transactionGlPercentage =  ((transactionMarketPrice - transactionPrice)/transactionPrice * 100).toFixed(2);
  let transactionGlMonetary = parseFloat((transactionTotalPrice/100)*transactionGlPercentage).toFixed(2)
  
  // if (transactionStockCode != undefined) {
  //   Stock.findOne({stockCode: transactionStockCode}, function(err, foundStock){
  //     if(!err){
  //       //Stock exists
  //       if(foundStock){
  //         Stock.updateOne({stockCode: transactionStockCode},{$set: {totalShares: transactionNumOfShares, marketPrice:transactionMarketPrice, purchasePrice:transactionPrice, totalPrice: transactionTotalPrice, glPercentage: transactionGlPercentage, glMonetary: transactionGlMonetary}}, function(err){
  //           if(err){
  //             console.log(err)
  //           }
  //           else{
  //             //Add new data to history; 
  //             const history = new History({
  //               datePosted: date,
  //               stockCode: transactionStockCode,
  //               action: transactionChoice,
  //               quantity: transactionNumOfShares,
  //               price: transactionPrice,
  //               total: transactionTotalPrice
  //             });
  //             history.save();
  //             res.redirect("/home")
  //           }
  //         });
  //       }
  //       //Stock doesn't exist
  //       else{
  //         if(transactionChoice.includes("SELL")){
  //           res.redirect("/transaction")
  //         }
  //         else if(transactionChoice.includes("BUY")){
  //           //Add new data to stocks;
  //           const stock = new Stock({
  //             stockCode: transactionStockCode,
  //             marketPrice: transactionMarketPrice,
  //             purchasePrice: transactionPrice,
  //             totalShares: transactionNumOfShares,
  //             totalPrice: transactionTotalPrice,
  //             glPercentage: transactionGlPercentage,
  //             glMonetary: transactionGlMonetary
  //           });
  //           stock.save();

  //           //Add new data to history; 
  //           const history = new History({
  //             datePosted: date,
  //             stockCode: transactionStockCode,
  //             action: transactionChoice,
  //             quantity: transactionNumOfShares,
  //             price: transactionPrice,
  //             total: transactionTotalPrice
  //           });
  //           history.save();
  //           res.redirect("/home");
  //         }
  //       }
  //     }
  //   });
  // }
});

//Log in



app.get("/login", function(req,res){
  res.render("login.ejs")
  
});

// test area
const testArrayObject =[{"abc": 123, "def": 456, "ghi": 789}, {"abc": 1234, "def": 5678, "ghi": 9012}]

app.get("/test", function(req,res) {
  // Account.find({}, function(err, accountItem){
  //   // res.render("test.ejs", 
  //   // {testArray: accountItem.stocks})
  //   accountItem.map((arrayItem) => {
  //     // console.log(arrayItem.stocks[0].stockCode)
  //   })
  // });
  

  const stocks = ({
    stockCode: "scc",
    purchasePrice: 1,
    marketPrice: 1,
    totalShares: 2,
    totalPrice: 2,
    glPercentage: 2,
    glMonetary: 2
  });

  const account = new Account({
    username: "armin",
    password: 654321,
    capital: 100000,
    stocks: stocks
  });
  account.save();
});

app.post("/test", function(req,res){
  // const testData =req.body.testMongo;

  // const stock = new Stock({
  //   test: testData
  // })
  // stock.save()
  // const loginUsername = req.body.loginUsername;
  // Account.findOne({username: loginUsername}, function(err, account){
  //   res.render("test.ejs", {
  //     testP: account.username
  //   });

  // });
  res.render("test.ejs", {
    loginUsername: loginUsername
  })
});
// end test area

//env.PORT is for heroku
app.listen(process.env.PORT || 3000, function() {
  console.log("Server started on port 3000");
});
