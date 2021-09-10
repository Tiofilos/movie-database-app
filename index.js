const express = require("express"),
  bodyParser = require("body-parser"),
  morgan = require("morgan"),
  uuid = require("uuid");
  const app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  const mongoose = require("mongoose"); //needed to access the model connecting to external database
const Models = require("./models.js");
const Movies = Models.Movie;
const Users = Models.User;
const Genres = Models.Genre
const Directors = Models.Director

const requestTime = (req, res, next) => {
  req.requestTime = Date.now();
  next();
};

const myLogger = (req, res, next) => {
  console.log("Request URL: " + req.url);
  next();
};

const {check, validationResult} = require('express-validator')// this calls the expressValidator 
app.use(requestTime);
app.use(myLogger);
app.use(morgan("common"));
app.use(express.static("public"));
const cors = require('cors'); //needed for controlling which domain can access my server
app.use(cors());

let auth = require('./auth')(app);     //needed to access auth and passport files...where authentication and authorizations are defined
const passport = require('passport'); 
require('./passport');

mongoose.connect(process.env.MYAPI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}); //this connects mongoose to mongodb to access external database

// GET requests
app.get('/', (req, res) => {
  res.send('Welcome to myMoviesApp');
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
			Users
				.create({
					Username: req.body.Username,
					Password: req.body.Password,
					Email: req.body.Email,
					Birthday: req.body.Birthday
				})
				.then((user) =>{res.status(201).json(user) })
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
//   console.log("Your server is live and listening on port 8081.");
// });
const port = process.env.PORT || 8082;
app.listen(port, '0.0.0.0',() => { 
	console.log('Listening on Port ' + port);
});




// const express = require("express"),
//   bodyParser = require ("body-parser"),
//   morgan = require("morgan"),
//   uuid = require("uuid");
// const mongoose = require("mongoose"); //needed to access the model connecting to external database
// const Models = require("./models.js");  
  
  
  
// const cors = require('cors'); //needed for controlling which domain can access my server
// const {check, validationResult} = require('express-validator')// this calls the expressValidator 
// const requestTime = (req, res, next) => {
//   req.requestTime = Date.now();
//   next();
// };
// const Movies = Models.Movie;
// const Users = Models.User;
// const Genres = Models.Genre
// const Directors = Models.Director

// // mongoose.connect("mongodb://localhost:27017/myMovieApp", {
// //   useNewUrlParser: true,
// //   useUnifiedTopology: true,
// // }); //this connects mongoose to mongodb to access local external database


//   const app = express();
//   app.use(cors());
//   const myLogger = (req, res, next) => {
//   console.log("Request URL: " + req.url);
//   next();
// };

// //middleware login
// app.use(morgan("common"));
// app.use("/documentation",express.static("public"));//to send static files
// app.use(requestTime);
// app.use(myLogger);
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({extended:true}));

// let auth = require('./auth')(app);     //needed to access auth and passport files...where authentication and authorizations are defined
// const passport = require('passport'); 
// require('./passport');

// //'mongodb+srv://theo1409:tiofami@myclustertheophilus.q40bc.mongodb.net/myMoviesApp?retryWrites=true&w=majority'//This was done to make the URI secure and avoid it being exposed.
// mongoose.connect(process.env.MYAPI, 
//   {useNewUrlParser: true, 
//     useUnifiedTopology:true
//   } //this connects mongoose to mongodb to access remote external database

// // GET requests
// app.get('/', (req, res) => {
//   res.send('Welcome to my MoviesApp');
// });
// //get all movies
// app.get('/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
//   Movies.find()
//   .then((movies) => {
//     res.status(201).json(movies);
//   })
//   .catch((err) => {
//     console.error(err);
//     res.status(500).send('Error: ' + err);
//   });
// });

// //get movie by title
// app.get('/movies/:Title', passport.authenticate('jwt', { session: false }),  (req, res) => {
//   Movies.findOne({ Title: req.params.Title })
//     .then((movie) => {
//       res.json(movie);
//     })
//     .catch((err) => {
//       console.error(err);
//       res.status(500).send('Error: ' + err);
//     });
// });
// // return data about a genre by name/title
// // app.get('/genres/:Name', passport.authenticate('jwt', { session: false }),  (req, res) => {
// //   Genres.findOne({Name: req.params.Name })
// //     .then((genre) => {
// //       res.json(genre);
// //     })
// //     .catch((err) => {
// //       console.error(err);
// //       res.status(500).send('Error: ' + err);
// //     });
// //   });

//   //return a single genre by name to user
// app.get('/genre/:name', passport.authenticate('jwt', { session: false }), (req, res) => {
//   const { name } = req.params;
//   Movies.find({ 'Genre.Name' : name}).then((movies) => {
//     res.json(movies);
//   }).catch((err) => {
//     console.error(err);
//       res.status(500).send("Error: " + err);
//   })
// });
// // // return data about a director by name
// // app.get('/directors/:Name', passport.authenticate('jwt', { session: false }),  (req, res) => {
// //   Directors.findOne({ Name: req.params.Name })
// //     .then((director) => {
// //       res.json(director);
// //     })
// //     .catch((err) => {
// //       console.error(err);
// //       res.status(500).send('Error: ' + err);
// //     });
// // });

// //Return a single director by name to user
// app.get('/directors/:director', passport.authenticate('jwt', { session: false }), (req,res) => {
//   Movies.findOne( { "Director.Name" : { $regex: req.params.director, $options: "i" } })
//   .then((movie) => {
//       res.json(movie.Director);
//   }).catch((err) => {
//       console.error(err);
//       res.status(500).send('Error: ' + err);
//   });
// });

// // // remove a movie from user favorites by ID
// app.delete('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }),   (req, res) => {
//   Users.findOneAndUpdate(
//     { Username: req.params.Username },
//     { $pull: { FavoriteMovies: req.params.MovieID } },
//     { new: true }, // This line makes sure that the updated document is returned
//     (err, updatedUser) => {
//       if (err) {
//         console.error(err);
//         res.status(500).send('Error: ' + err);
//       } else {
//         res.json(updatedUser);
//       }
//     }
//   );
// });
 
 


// // Get all users ---Read in Mongoose
// app.get('/users', passport.authenticate('jwt', { session: false }), (req, res) => {
// 	Users.find()
// 		.then((users) => {
// 			res.status(201).json(users);
// 		})
// 		.catch((err) => {
// 			console.error(err);
// 			res.status(500).send('Error: ' + err);
// 		});
// });

// // Get a user by username
// app.get('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {     //note that there is no : in the real url to access this on the webpage
//   Users.findOne({ Username: req.params.Username })
//     .then((user) => {
//       res.json(user);
//   })
//   .catch((err) => {
//     console.error(err);
//     res.status(500).send('Error: ' + err);
//   });
// });
// //Add a user ---Create in Mongoose
// /* We’ll expect JSON in this format
// {
// 	ID: Integer,
// 	Username: String,
// 	Password: String,
// 	Email: String,
// 	Birthday: Date
// }*/
// app.post('/users', [  //validation logic here
// 	check('Username', 'Username is required').isLength({min: 5}), 
// 	check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(), 				
// 	check('Password', 'Password is required').not().isEmpty(), check('Email', 'Email does not appear to be valid').isEmail()
//  ], (req, res) => {
//   let errors = validationResult(req); //checking validation objects for errors here
//   if (!errors.isEmpty()) { 
// 	return res.status(422).json({ errors: errors.array() }); 
// } 
// let hashedPassword = Users.hashPassword(req.body.Password); //hashing password before storing it in mongoDB
// Users.findOne({ Username: req.body.Username })  //checks for existing user 
// 	.then((user) => {
// 		if (user) {
// 			return res.status(400).send(req.body.Username + 'already exists');
// 		} else {
// 			Users
// 				.create({
// 					Username: req.body.Username,
// 					Password: req.body.Password,
// 					Email: req.body.Email,
// 					Birthday: req.body.Birthday
// 				})
// 				.then((user) =>{res.status(201).json(user) })
// 			  .catch((error) => {
// 				console.error(error);
// 				res.status(500).send('Error: ' + error);
// 			})
// 		}
// 	})
// 	.catch((error) => {
// 		console.error(error);
// 		res.status(500).send('Error: ' + error);
// 	});
// });

// // Update a user's info, by username ----update in CRUD
// /* We’ll expect JSON in this format
// {
// Username: String,
// (required)
// Password: String,
// (required)
// Email: String,
// (required)
// Birthday: Date
// }*/
// app.put('/users/:Username', passport.authenticate('jwt', { session: false }), 
// [  //validation logic here
// 	check('Username', 'Username is required').isLength({min: 5}), 
// 	check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(), 				
// 	check('Password', 'Password is required').not().isEmpty(), check('Email', 'Email does not appear to be valid').isEmail()
//  ],  (req, res) => {
//   let errors = validationResult(req); //checking validation objects for errors here
//     if (!errors.isEmpty()) { 
// 	  return res.status(422).json({ errors: errors.array() }); 
//   }
//   Users.findOneAndUpdate({ Username: req.params.Username }, { $set:
//     {
//       Username: req.body.Username,
//       Password: req.body.Password,
//       Email: req.body.Email,
//       Birthday: req.body.Birthday
//     }
//   },
//   { new: true }, // This line makes sure that the updated document is returned
//   (err, updatedUser) => {
//     if(err) {
//       console.error(err);
//       res.status(500).send('Error: ' + err);
//     } else {
//       res.json(updatedUser);
//     }
//   });
// });

// // Add a movie to a user's list of favorites
// app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }),  (req, res) => {
//   Users.findOneAndUpdate({ Username: req.params.Username }, {
//       $push: { FavoriteMovies: req.params.MovieID }
//     },
//     { new: true }, // This line makes sure that the updated document is returned
//   (err, updatedUser) => {
//     if (err) {
//       console.error(err);
//       res.status(500).send('Error: ' + err);
//     } else {
//       res.json(updatedUser);
//     }
//   });
// });

// // Delete a user by username
// app.delete('/users/:Username', passport.authenticate('jwt', { session: false }),  (req, res) => {
//   Users.findOneAndRemove({ Username: req.params.Username })
//     .then((user) => {
//       if (!user) {
//         res.status(400).send(req.params.Username + ' was not found');
//       } else {
//         res.status(200).send(req.params.Username + ' was deleted.');
//       }
//     })
//     .catch((err) => {
//       console.error(err);
//       res.status(500).send('Error: ' + err);
//     });
// });

// // allow users to deregister
// app.delete('/users/:ID/deactivate', passport.authenticate('jwt', { session: false }),  (req, res) => {
//   res.send('Successful DELETE request removing user');
// });

// //Error handling
// app.use((err, req, res, next) => {
//   console.log(err.stack);
//   res.status(500).send("Something went wrong!");
// });

// // app.listen(8081, () => {
// //   console.log("Your server is live and listening on port 8081.");
// // });
// const port = process.env.PORT || 8080;
// app.listen(port, '0.0.0.0',() => { 
// 	console.log('Listening on Port ' + port);
// });















//Movie lists to be accessed
// let movies = [
//   {
//     title: "The Shawshank Redemption",
//     rank: "1",
//     genre: {
//       name: "Drama",
//       description:
//         "A category of narrative fiction (or semi-fiction) intended to be more serious than humorous in tone",
//     },
//     director: {
//       name: "Frank A. Darabont",
//       bio: " A Hungarian-American film director, screenwriter and producer",
//       born: "28.02.1959",
//       died: "-",
//     },
//     description: "This is a movie",
//     imgUrl:
//       "https://images-na.ssl-images-amazon.com/images/I/519NBNHX5BL._SY445_.jpg",
//   },

//   {
//     title: "The Godfather",
//     rank: "2",
//     genre: {
//       gname: "Crime",
//       description:
//         "A film genre inspired by and analogous to the crime fiction literary genre. Films of this genre generally involve various aspects of crime and its detection",
//     },
//     director: {
//       name: "Francis Ford Coppola",
//       bio: " An American film director, producer and screenwriter",
//       born: "07.04.1939",
//       died: "-",
//     },
//     description: "This is another movie",
//     imgUrl:
//       "https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_UY1200_CR107,0,630,1200_AL_.jpg",
//   },

//   {
//     title: "The Godfather: Part II",
//     rank: "3",
//     genre: {
//       gname: "Crime",
//       description:
//         "A film genre inspired by and analogous to the crime fiction literary genre. Films of this genre generally involve various aspects of crime and its detection",
//     },
//     director: {
//       name: "Francis Ford Coppola",
//       bio: " An American film director, producer and screenwriter",
//       born: "07.04.1939",
//       died: "-",
//     },
//     description: "This is the third movie",
//     imgUrl:
//       "https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_UY1200_CR107,0,630,1200_AL_.jpg",
//   },

//   {
//     title: "Pulp Fiction",
//     rank: "4",
//     genre: {
//       gname: "Comedy",
//       description:
//         "Comedy may be divided into multiple genres based on the source of humor, the method of delivery, and the context in which it is delivered",
//     },
//     director: {
//       name: "Quentin Tarantino",
//       bio: " An American film director, screenwriter, producer, author, and actor",
//       born: "27.03.1963",
//       died: "-",
//     },
//     description: "This is the fourth movie",
//     imgUrl:
//       "https://3kek03dv5mw2mgjkf3tvnm31-wpengine.netdna-ssl.com/wp-content/uploads/2021/05/Pulp_Fiction.jpeg",
//   },

//   {
//     title: "The Good, the Bad and the Ugly",
//     rank: "5",
//     genre: {
//       gname: "Western",
//       description:
//         "Western films as those set in the American West that embody the spirit, the struggle, and the demise of the new frontier",
//     },
//     director: {
//       name: "Sergio Leone",
//       bio: " An Italian film director, producer and screenwriter, credited as the creator of the Spaghetti Western genre",
//       born: "03.01.1929",
//       died: "30.04.1989",
//     },
//     description: "This is the last movie",
//     imgUrl: "https://i.ytimg.com/vi/gcFH2Y7bdmk/movieposter_en.jpg",
//   },
// ];

// let users = [
//   {
//     id: 1,
//     username: "Peter",
//     password: "password1",
//     email: "peter@gmail.com",
//     birthday: "2000-01-13",
//   },

//   {
//     id: 2,
//     username: "Theo",
//     password: "password2",
//     email: "theo@gmail.com",
//     birthday: "2001-04-23",
//   },

//   {
//     id: 3,
//     username: "Fredrick",
//     password: "password3",
//     email: "fredrick@gmail.com",
//     birthday: "1998-11-03",
//   },

//   {
//     id: 4,
//     username: "Kenedy",
//     password: "password4",
//     email: "kenedy@gmail.com",
//     birthday: "1985-07-27",
//   },
// ];

// app.get("/", (req, res) => {
//   const responseText = "Welcome to my app!";
//   responseText += "<small><br> Requested at: " + req.requestTime + "</small>";
//   res.send(responseText);
// });

// //movie requests
// app.get("/movies", (req, res) => {
//   res.json(movies);
// });

// app.post("/movies", (req, res) => {
//   const newMovie = req.body;

//   if (!newMovie.title) {
//     const message = "Missing title in request body!";
//     res.status(400).send(message);
//   } else {
//     newMovie.id = uuid.v4();
//     movies.push(newMovie);
//     res.status(201).send(newMovie);
//   }
// });

// app.get("/movies/:title", (req, res) => {
//   res.json(
//     movies.find((movie) => {
//       return movie.title === req.params.title;
//     })
//   );
// });

// app.get("/movies/directors/:name", (req, res) => {
//   res.json(
//     movies.find((movie) => {
//       return movie.director.name === req.params.name;
//     })
//   );
// });

// app.get("/movies/genre/:name", (req, res) => {
//   res.json(
//     movies.find((movie) => {
//       return movie.genre.gname === req.params.name;
//     })
//   );
// });

// //user requests
// app.get("/users", (req, res) => {
//   res.json(users);
// });

// app.post("/users", (req, res) => {
//   const newUser = req.body;

//   if (!newUser.username) {
//     const message = "Missing username in request body!";
//     res.status(400).send(message);
//   } else {
//     newUser.id = uuid.v4();
//     users.push(newUser);
//     res.status(201).send(newUser);
//   }
// });

// app.put("/users/:username", (req, res) => {
//   const user = users.find((user) => {
//     return user.username === req.params.username;
//   });

//   if (!user) {
//     res
//       .status(404)
//       .send("User with the name " + req.params.username + " was not found.");
//   } else {
//     user.username = req.body.username;
//     res
//       .status(201)
//       .send(
//         "User " +
//           req.params.username +
//           " changed her/his name to: " +
//           user.username
//       );
//   }
// });

// app.delete("/users/:username", (req, res) => {
//   const userToDelete = users.find((userToDelete) => {
//     return userToDelete.username === req.params.username;
//   });

//   if (userToDelete) {
//     users = users.filter((obj) => {
//       return obj.username !== req.params.username;
//     });
//     res
//       .status(201)
//       .send("User " + req.params.username + " was successfully deleted!");
//   } else {
//     res
//       .status(404)
//       .send("User with the name " + req.params.username + " was not found.");
//   }
// });

// //documentation
// app.get("/documentation", (req, res) => {
//   res.sendFile(path.join(__dirname, "public/documentation.html"));
// });

// app.get("/secreturl", (req, res) => {
//   const responseText = "This is a secret url with super top-secret content.";
//   responseText += "<small><br> Requested at: " + req.requestTime + "</small>";
//   res.send(responseText);
// });