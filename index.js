const express = require("express");
(morgan = require("morgan")),
  (bodyParser = require("body-parser")),
  (uuid = require("uuid"));

const mongoose = require("mongoose");
const Models = require("./models.js");

const cors = require("cors");

const { check, validationResult } = require("express-validator");

const Movies = Models.Movie;
const Users = Models.User;
const Genres = Models.Genre;
const Directors = Models.Director;

const app = express();
app.use(cors());

const myLogger = (req, res, next) => {
  console.log("Request URL: " + req.url);
  next();
};
// Logging middleware
app.use(morgan("common"));

// For the sending of static files
app.use("/documentation", express.static("public"));

// Using body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Importing auth.js and passport
let auth = require("./auth")(app);
const passport = require("passport");
require("./passport");
const uri = process.env.MYAPI || "mongodb://localhost:27017/myMovieApp";
 mongoose.connect(uri, {
   useNewUrlParser: true,
  useUnifiedTopology: true,
}); //this connects mongoose to mongodb to access external database

// mongoose.connect("mongodb://localhost:27017/myMovieApp", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })

// GET requests
app.get('/', (req, res) => {
  res.send('Welcome to my MoviesApp');
});
//get all movies
app.get('/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.find()
  .then((movies) => {
    res.status(201).json(movies);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  });
});

//get movie by title
app.get('/movies/:Title', passport.authenticate('jwt', { session: false }),  (req, res) => {
  Movies.findOne({ Title: req.params.Title })
    .then((movie) => {
      res.json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});
// return data about a genre by name/title
// app.get('/genres/:Name', passport.authenticate('jwt', { session: false }),  (req, res) => {
//   Genres.findOne({Name: req.params.Name })
//     .then((genre) => {
//       res.json(genre);
//     })
//     .catch((err) => {
//       console.error(err);
//       res.status(500).send('Error: ' + err);
//     });
//   });

  //return a single genre by name to user
app.get('/genre/:name', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { name } = req.params;
  Movies.find({ 'Genre.Name' : name}).then((movies) => {
    res.json(movies);
  }).catch((err) => {
    console.error(err);
      res.status(500).send("Error: " + err);
  })
});
// // return data about a director by name
// app.get('/directors/:Name', passport.authenticate('jwt', { session: false }),  (req, res) => {
//   Directors.findOne({ Name: req.params.Name })
//     .then((director) => {
//       res.json(director);
//     })
//     .catch((err) => {
//       console.error(err);
//       res.status(500).send('Error: ' + err);
//     });
// });

//Return a single director by name to user
app.get('/directors/:director', passport.authenticate('jwt', { session: false }), (req,res) => {
  Movies.findOne( { "Director.Name" : { $regex: req.params.director, $options: "i" } })
  .then((movie) => {
      res.json(movie.Director);
  }).catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
  });
});

// // remove a movie from user favorites by ID
app.delete('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }),   (req, res) => {
  Users.findOneAndUpdate(
    { Username: req.params.Username },
    { $pull: { FavoriteMovies: req.params.MovieID } },
    { new: true }, // This line makes sure that the updated document is returned
    (err, updatedUser) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error: ' + err);
      } else {
        res.json(updatedUser);
      }
    }
  );
});
 
// Get all users ---Read in Mongoose
app.get('/users', passport.authenticate('jwt', { session: false }), (req, res) => {
	Users.find()
		.then((users) => {
			res.status(201).json(users);
		})
		.catch((err) => {
			console.error(err);
			res.status(500).send('Error: ' + err);
		});
});

// Get a user by username
app.get('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {     //note that there is no : in the real url to access this on the webpage
  Users.findOne({ Username: req.params.Username })
    .then((user) => {
      res.json(user);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  });
});
//Add a user ---Create in Mongoose
/* We’ll expect JSON in this format
{
	ID: Integer,
	Username: String,
	Password: String,
	Email: String,
	Birthday: Date
}*/
app.post('/users', [  //validation logic here
	check('Username', 'Username is required').isLength({min: 5}), 
	check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(), 				
	check('Password', 'Password is required').not().isEmpty(), check('Email', 'Email does not appear to be valid').isEmail()
 ], (req, res) => {
  let errors = validationResult(req); //checking validation objects for errors here
  if (!errors.isEmpty()) { 
	return res.status(422).json({ errors: errors.array() }); 
} 
let hashedPassword = Users.hashPassword(req.body.Password); //hashing password before storing it in mongoDB
Users.findOne({ Username: req.body.Username })  //checks for existing user 
	.then((user) => {
		if (user) {
			return res.status(400).send(req.body.Username + 'already exists');
		} else {
			Users.create({
					Username: req.body.Username,
					Password: req.body.Password,
					Email: req.body.Email,
					Birthday: req.body.Birthday
				})
				.then((user) =>{
          res.status(201).json(user) })
			  .catch((error) => {
				  console.error(error);
				  res.status(500).send('Error: ' + error);
			})
		}
	})
	.catch((error) => {
		console.error(error);
		res.status(500).send('Error: ' + error);
	});
});

// Update a user's info, by username ----update in CRUD
/* We’ll expect JSON in this format
{
Username: String,
(required)
Password: String,
(required)
Email: String,
(required)
Birthday: Date
}*/
app.put('/users/:Username', passport.authenticate('jwt', { session: false }), 
[  //validation logic here
	check('Username', 'Username is required').isLength({min: 5}), 
	check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(), 				
	check('Password', 'Password is required').not().isEmpty(), check('Email', 'Email does not appear to be valid').isEmail()
 ],  (req, res) => {
  let errors = validationResult(req); //checking validation objects for errors here
    if (!errors.isEmpty()) { 
	  return res.status(422).json({ errors: errors.array() }); 
  }
  Users.findOneAndUpdate({ Username: req.params.Username }, { $set:
    {
      Username: req.body.Username,
      Password: req.body.Password,
      Email: req.body.Email,
      Birthday: req.body.Birthday
    }
  },
  { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if(err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});

// Add a movie to a user's list of favorites
app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }),  (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
      $push: { FavoriteMovies: req.params.MovieID }
    },
    { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});

// Delete a user by username
app.delete('/users/:Username', passport.authenticate('jwt', { session: false }),  (req, res) => {
  Users.findOneAndRemove({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + ' was not found');
      } else {
        res.status(200).send(req.params.Username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// allow users to deregister
app.delete('/users/:ID/deactivate', passport.authenticate('jwt', { session: false }),  (req, res) => {
  res.send('Successful DELETE request removing user');
});

//Error handling
app.use((err, req, res, next) => {
  console.log(err.stack);
  res.status(500).send("Something went wrong!");
});

// app.listen(8081, () => {
//  console.log("Your server is live and listening on port 8081.");
//  });

const port = process.env.PORT || 8082;
app.listen(port, '0.0.0.0',() => { 
console.log('Listening on Port ' + port);
});



