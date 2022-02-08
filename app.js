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

let sampleCapital = 100000;
var today = new Date();
var date = today.toLocaleString('default', { month: 'long' }) + ' ' + today.getDate() + ' '+ today.getFullYear() + ', ' + today.getHours() + ":" + today.getMinutes();
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

//To-do 2/9, set up account DB
const History = new mongoose.model("History", historySchema);
//Home
app.get("/home", function(req, res) {
  let finalPrice = 0;
  let finalGLPercentage = 0;
  let finalGLMonetary = 0;
  
  Stock.find({}, function(err, stockItem) {
    History.find({}, function(err, historyItem){

      //To get the total price, gain/loss
      stockItem.map((stockValue) => {
        finalPrice = finalPrice + stockValue.totalPrice;
        finalGLPercentage = finalGLPercentage + stockValue.glPercentage;
        finalGLMonetary = finalGLMonetary + stockValue.glMonetary;
      });
      let finalCapital = sampleCapital - finalPrice;
      if(!err){
        res.render("home.ejs", {
          historyEntryLoop: historyItem,
          stockEntryLoop: stockItem,
          sampleCapital: sampleCapital,
          finalPrice: finalPrice,
          finalGLPercentage: finalGLPercentage,
          finalGLMonetary: finalGLMonetary,
          finalCapital: finalCapital
        });
      }
      else{
        console.log(err)
      }
    });
  });
});

app.post("/home", function(req, res) {
  let stockCode = req.body.stockCode;
  let purchasePrice = parseFloat(req.body.purchasePrice).toFixed(2);
  let marketPrice = parseFloat(req.body.marketPrice).toFixed(2);
  let totalSharesVar = parseFloat(req.body.totalShares);
  let totalPrice = parseFloat(purchasePrice * totalSharesVar).toFixed(2);
  let glPercentage = ((marketPrice - purchasePrice)/purchasePrice * 100).toFixed(2)
  let glMonetary = parseFloat((totalPrice/100)*glPercentage).toFixed(2)

    // Filter if stock code already exists on DB.
  Stock.findOne({stockCode: stockCode}, function(err, foundStock){
    if(!err){
      //Stock not found - add new stock
      if(!foundStock){
        const stock = new Stock({
          stockCode: stockCode,
          marketPrice: marketPrice,
          purchasePrice: purchasePrice,
          totalShares: totalSharesVar,
          totalPrice: totalPrice,
          glPercentage: glPercentage,
          glMonetary: glMonetary
        });
        stock.save();

        //To-do: action will be based by user's input;
        const history = new History({
          datePosted: date,
          stockCode: stockCode,
          action: 'Buy',
          quantity: totalSharesVar,
          price: purchasePrice,
          total: totalPrice
        });
        history.save();
        res.redirect("/home");
      }
      //Stock already exists
      else{
        const currentTotalShares = foundStock.totalShares;
        const newTotalShares = currentTotalShares + totalShares;

        //To Do: change logic sa kung anong values yung ma u-update when appending existing shares
        Stock.updateOne({stockCode: stockCode},{$set: {totalShares: newTotalShares}}, function(err){
          if(err){
            console.log(err)
          }
        });

        //Update History table
        const history = new History({
          datePosted: date,
          stockCode: stockCode,
          action: 'Append',
          quantity: totalSharesVar,
          price: purchasePrice,
          total: totalPrice
        });
        history.save();
        res.redirect("/home");
      }
    }
    else{
      console.log(err)
    }
  });

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
  console.log(req.body);
  Stock.findOne({stockCode: sellStockCode}, function(err, foundStock){
    if (!err){
      //stock is found
      if(foundStock){
        res.render("transaction.ejs", {
          stockCode: foundStock.stockCode,
          sampleCapital: sampleCapital,
          totalShares: foundStock.totalShares
        });
      }
    }
  });

  //Transaction Post
  let transactionNumOfShares = parseInt(req.body.transactionNumOfShares);
  let transactionStockCode = req.body.transactionStockCode;
  let transactionChoice = req.body.transactionChoice;
  let transactionMarketPrice = parseFloat(req.body.transactionMarketPrice).toFixed(2);
  let transactionPrice = parseFloat(req.body.transactionPrice).toFixed(2);

  //Add computation for total price, gl percentage, gl monetary
  let transactionTotalPrice = transactionNumOfShares * transactionPrice;
  let transactionGlPercentage =  ((transactionMarketPrice - transactionPrice)/transactionPrice * 100).toFixed(2);
  let transactionGlMonetary = parseFloat((transactionTotalPrice/100)*transactionGlPercentage).toFixed(2)
  if (transactionStockCode != undefined) {
    Stock.findOne({stockCode: transactionStockCode}, function(err, foundStock){
      if(!err){
        //Stock exists
        if(foundStock){
          Stock.updateOne({stockCode: transactionStockCode},{$set: {totalShares: transactionNumOfShares, marketPrice:transactionMarketPrice, purchasePrice:transactionPrice, totalPrice: transactionTotalPrice, glPercentage: transactionGlPercentage, glMonetary: transactionGlMonetary}}, function(err){
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
            const stock = new Stock({
              stockCode: transactionStockCode,
              marketPrice: transactionMarketPrice,
              purchasePrice: transactionPrice,
              totalShares: transactionNumOfShares,
              totalPrice: transactionTotalPrice,
              glPercentage: transactionGlPercentage,
              glMonetary: transactionGlMonetary
            });
            stock.save();

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
            res.redirect("/home");
          }
        }
      }
    });
  }
});




// test area
// app.get("/test", function(req,res) {
//   res.render("test.ejs")
// });
//
// app.post("/test", function(req,res){
//   const testData =req.body.testMongo;
//
//   const stock = new Stock({
//     test: testData
//   })
//   stock.save()
// })
// end test area

//env.PORT is for heroku
app.listen(process.env.PORT || 3000, function() {
  console.log("Server started on port 3000");
});
