const express = require("express");
morgan = require("morgan");
const app = express();

//Morgan middleware to log all requests
app.use(morgan("common"));

//Movie lists to be accessed
let topTenMovies = [
  {
    id: 1,
    id: "1",
    title: "Power",
    year: "2014",
  },
  {
    id: 2,
    id: "2",
    title: "Godfather of Harlem",
    year: "2019",
  },
  {
    id: 3,
    id: "3",
    title: "24",
    year: "2001",
  },
  {
    id: 4,
    id: "4",
    title: "Spartacus",
    year: "2010",
  },
  {
    id: 5,
    id: "5",
    title: "Prison Break",
    year: "2005",
  },
  {
    id: 6,
    id: "6",
    title: "Underworld",
    year: "2004",
  },
  {
    id: 7,
    id: "7",
    title: "Training Day",
    year: "2001",
  },
  {
    id: 8,
    id: "8",
    title: "Inception",
    year: "2010",
  },
  {
    id: 9,
    id: "9",
    title: "John Wick",
    year: "2015",
  },
  {
    id: 10,
    id: "10",
    title: "Equalizer",
    year: "2014",
  },
];

//Sending static files from the public folder
app.use(express.static("public"));

//accessing my movie list using the express GET route
app.get("/movies", (req, res) => {
  res.json(topTenMovies);
});

//Get route located at endpoint "/"
app.get("/", (req, res) => {
  res.send("Welcome to my top ten movie list!");
});

//Error handling middle ware function that log all application-level errors to terminal
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something is wrong!");
});

app.listen(8080, () =>{
    console.log('app is listening on port 8080.');
});