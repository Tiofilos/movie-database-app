//Step1 importing mongoose package
const mongoose = require('mongoose');

//Step 2  Defining schemas
let movieSchema = mongoose.Schema({            //this defines the movie schema 
	Title: {type: String, required: true},
	Description: {type: String, required: true},
	Genre: {
		Name: String,
		Description: String
	},
	Director: {
		Name: String,
		Bio: String
	},
	Actors: [String],    //[] shows that the actors key would be an array of strings i.e more than one actor
	ImagePath: String,
	Featured: Boolean
});
let userSchema = mongoose.Schema({                //this defines the users schema
	Username: {type: String, required: true},
	Password: {type: String, required: true},
	Email: {type: String, required: true},
	Birthday: Date,
	FavoriteMovies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }] //here, the reference keys come into play..this contains an array of IDs
});

//Step 3  Creating models to use the defined schemas
let Movie = mongoose.model('Movie', movieSchema);
let User = mongoose.model('User', userSchema);

//Step 4 exporting modules so as to import them into index.js file
module.exports.Movie = Movie;
module.exports.User = User;

//Step 5 this is done in index.js file....so that they can be used in the file
// const mongoose = require('mongoose');
// const Models = require('./models.js');
// const Movies = Models.Movie;
// const Users = Models.User;