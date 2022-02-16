//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//Password encryption
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

var today = new Date();
var date = today.toLocaleString('default', { month: 'long' }) + ' ' + today.getDate() + ' '+ today.getFullYear() + ', ' + today.getHours() + ":" + today.getMinutes();
let loginUsername =""
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

  Account.findOne({username: loginUsername}, function (err, accountFoundStock){
    accountFoundStock.stocks.map((accountStock) => {
      finalPrice = finalPrice + accountStock.totalPrice
      finalGLPercentage = finalGLPercentage + accountStock.glPercentage;
      finalGLMonetary = finalGLMonetary + accountStock.glMonetary;         
    });
    finalCapital = accountFoundStock.capital - finalPrice;

    res.render("home.ejs", 
          {stockEntryLoop: accountFoundStock.stocks,
          historyEntryLoop: accountFoundStock.history,
          finalPrice: finalPrice,
          finalGLPercentage : finalGLPercentage,
          finalGLMonetary: finalGLMonetary,
          finalCapital: finalCapital,
          loginUsername: loginUsername
          });
  });
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

  //User Login
  loginUsername = req.body.loginUsername;
  let loginPassword = req.body.loginPassword
  
  //User create
  const createUserPw = req.body.loginCreatePassword
  const createUserUsername = req.body.loginCreateUsername

  Account.findOne({username: loginUsername}, function(err, account){
    if(!err){
      //Username exists
      if(account != undefined){
        //log in successful
        bcrypt.compare(loginPassword, account.password, function(err, result) {
          if(result){
            //From Login
            if (stockCode == undefined){
              //Account Login Post
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
  
               res.render("home.ejs", 
               {stockEntryLoop: account.stocks,
               historyEntryLoop: account.history,
               finalPrice: finalPrice,
               finalGLPercentage : finalGLPercentage,
               finalGLMonetary: finalGLMonetary,
               finalCapital: finalCapital,
               loginUsername: loginUsername
               });
  
            } //stock code undefined
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
                     historyEntryLoop: accountFoundStock.history,
                     finalPrice: finalPrice,
                     finalGLPercentage : finalGLPercentage,
                     finalGLMonetary: finalGLMonetary,
                     finalCapital: finalCapital,
                     loginUsername: loginUsername
                     });
                   }
                   //Filter if stock is found.
                   else{
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
                     
                     Account.updateOne({username: loginUsername, "stocks.stockCode" : stockCode}, {'$set' : {'stocks.$.totalShares' : newTotalShares, 'stocks.$.purchasePrice' : newPurchasePrice, 'stocks.$.marketPrice' :   newMarketPrice, 'stocks.$.totalPrice' : finalPrice, 'stocks.$.glPercentage' : finalGLPercentage, 'stocks.$.glMonetary' : finalGLMonetary}}, function(err){
                     });
                     accountFoundStock.save();
                     res.redirect('/home');
                   }
                 }              
               }
              });
            }
          }//password correct
          else{
            console.log("Incorrect password.");
          res.redirect("/login")
          }
        });
      }//loginusername undefined
      //new account
      else if (account == undefined && createUserPw && createUserUsername){
        Account.findOne({username: createUserUsername}, function(err, accountFoundStock){
          if (!err){
            if(accountFoundStock == undefined){
              //Password encryption
              bcrypt.hash(createUserPw, saltRounds, function(err, encryptedPw) {
                // Store hash in your password DB.
                const account = new Account({
                  username: createUserUsername,
                  password: encryptedPw,
                  capital: 100000
                });
                account.save();
                loginUsername = createUserUsername;
                res.redirect("/home");
              });
            }
            else{
              console.log("Account already exists.")
              res.redirect("/login");
            }
          }
        });
      }
      else{
        console.log("User not found!");
        res.redirect("/login")
      }
    }//err find one
    else{
      console.log(err)
    }
  });  
});

app.get("/transaction", function(req, res){
  res.render("transaction.ejs", {
    stockCode: '',
    totalShares: 0
  });
});

app.post("/transaction", function(req,res){
   const sellStockCode = req.body.sellStockCode;
   Account.findOne({username: loginUsername}, function(err, accountFoundStock){
    if (!err){
      
      const foundStock = accountFoundStock.stocks.find(stock => stock.stockCode == sellStockCode)
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
  
  if (transactionStockCode != undefined) {
    Account.findOne({username: loginUsername}, function(err, accountFoundStock){
      if(!err){
        //Stock exists
        if(accountFoundStock){

          Account.updateOne({username: loginUsername, "stocks.stockCode": transactionStockCode},{$set: {'stocks.$.totalShares': transactionNumOfShares, 'stocks.$.marketPrice':  transactionMarketPrice, 'stocks.$.purchasePrice' : transactionPrice, 'stocks.$.totalPrice' : transactionTotalPrice, 'stocks.$.glPercentage': transactionGlPercentage, 'stocks.$.glMonetary': transactionGlMonetary}}, function(err){
            if(err){
              console.log(err)
            }
            else{
              //Add new data to history; 
              const history = new History({
                datePosted: date,
                stockCode: transactionStockCode,
                action: transactionChoice,
                quantity: transactionNumOfShares,
                price: transactionPrice,
                total: transactionTotalPrice
              });
              history.save();
              res.redirect("/home")
            }
          });
        }
        //Stock doesn't exist
        else{
          if(transactionChoice.includes("SELL")){
            res.redirect("/transaction")
          }
          else if(transactionChoice.includes("BUY")){
            //Add new data to stocks;
            const stock = ({
              stockCode: transactionStockCode,
              marketPrice: transactionMarketPrice,
              purchasePrice: transactionPrice,
              totalShares: transactionNumOfShares,
              totalPrice: transactionTotalPrice,
              glPercentage: transactionGlPercentage,
              glMonetary: transactionGlMonetary
            });
            accountFoundStock.stocks.push(stock);

            //Add new data to history; 
            const history =({
              datePosted: date,
              stockCode: transactionStockCode,
              action: transactionChoice,
              quantity: transactionNumOfShares,
              price: transactionPrice,
              total: transactionTotalPrice
            });
            accountFoundStock.stocks.push(history);
            res.redirect("/home");
          }
        }
      }
    });
  }
});

//Log in
app.get("/login", function(req,res){
  res.render("login.ejs")
});

// test area
const testArrayObject =[{"abc": 123, "def": 456, "ghi": 789}, {"abc": 1234, "def": 5678, "ghi": 9012}]

app.get("/test", function(req,res) {
  res.render("test.ejs")
  // Account.find({}, function(err, accountItem){
  //   // res.render("test.ejs", 
  //   // {testArray: accountItem.stocks})
  //   accountItem.map((arrayItem) => {
  //     // console.log(arrayItem.stocks[0].stockCode)
  //   })
  // });
  
  // const stocks = ({
  //   stockCode: "scc",
  //   purchasePrice: 1,
  //   marketPrice: 1,
  //   totalShares: 2,
  //   totalPrice: 2,
  //   glPercentage: 2,
  //   glMonetary: 2
  // });

  // const account = new Account({
  //   username: "armin",
  //   password: 654321,
  //   capital: 100000,
  //   stocks: stocks
  // });
  // account.save();
});

const testSchema = new mongoose.Schema({
  username: String,
  password: String
});

const Test = new mongoose.model("Test", testSchema);

app.post("/test", function(req,res){
  const pw = req.body.loginPassword
  const loginUsername = req.body.loginUsername
  // Test.findOne({username: loginUsername}, function(err, accountFoundStock){
  //   if (!err){
  //     if(accountFoundStock == undefined){
  //         bcrypt.hash(pw, saltRounds, function(err, hash) {
  //         // Store hash in your password DB.
  //         const test = new Test({
  //           username: loginUsername,
  //           password: hash
  //           });
  //           test.save();
  //         });
  //       console.log("Account saved.")
  //       res.redirect("/login");
  //     }
  //     else{
  //       console.log("Account already exists.")
  //       res.redirect("/login");
  //     }
  //   }

  // });
  Test.findOne({username: loginUsername}, function (err, accountFound){
    if(!err){
      if(accountFound != undefined){
        bcrypt.compare(pw, accountFound.password, function(err, result) {
          if (result){
            console.log("Password matched!");
          }
          else{
            console.log("Incorrect")
          }
      });
      }
    }
  });
});
// end test area

//env.PORT is for heroku
app.listen(process.env.PORT || 3000, function() {
  console.log("Server started on port 3000");
});
