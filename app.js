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

const stockCode="test"
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
  stockCode = req.body.stockCode;
  const purchasePrice = parseFloat(req.body.purchasePrice).toFixed(2);
  const marketPrice = parseFloat(req.body.marketPrice).toFixed(2);
  const totalShares = parseFloat(req.body.totalShares);
  const totalPrice = parseFloat(purchasePrice * totalShares).toFixed(2);
  const glPercentage = ((marketPrice - purchasePrice)/purchasePrice * 100).toFixed(2)
  const glMonetary = parseFloat((totalPrice/100)*glPercentage).toFixed(2)


  // Filter if stock code already exists on DB.
  Stock.findOne({stockCode: stockCode}, function(err, foundStock){
    if(!err){
      //Stock not found - add new stock
      if(!foundStock){
        const stock = new Stock({
          stockCode: stockCode,
          marketPrice: marketPrice,
          purchasePrice: purchasePrice,
          totalShares: totalShares,
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
          quantity: totalShares,
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
          quantity: totalShares,
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

//Sell
app.get("/transaction", function(req, res){
  res.render("transaction.ejs", {
    stockCode: "",
    totalShares: 300,
    sampleCapital: sampleCapital
  });
});

app.post("/transaction", function(req,res){
  const sellStockCode = req.body.sellStockCode;
  Stock.findOne({stockCode: sellStockCode}, function(err, foundStock){
    if (!err){
      //stock is found
      if(foundStock){
        res.render("transaction.ejs", {
          stockCode: foundStock.stockCode,
          sampleCapital: "50000",
          totalShares: foundStock.totalShares
        });
      }
    }
  });
  // console.log(sellStockCode)
  // res.redirect("/sell");
  //loop through Stock DB
  // console.log(test);
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
