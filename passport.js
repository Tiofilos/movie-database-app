const passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    Models = require('./models.js'),
    passportJWT = require('passport-jwt');

    let Users = Models.User, 
    JWTStrategy = passportJWT.Strategy, 
    ExtractJWT = passportJWT.ExtractJwt;
    
    passport.use(new LocalStrategy({ //These codes define basic HTTP authentication for login requests using username and password
        usernameField: 'Username', 
        passwordField: 'Password'
    }, (username, password, callback) => { 
        console.log(username + ' ' + password); 
        Users.findOne({ Username: username }, (error, user) => { 
            if (error) { 
            console.log(error); 
            return callback(error); 
        }
        if (!user) { 
            console.log('incorrect username'); 
            return callback(null, false, {message: 'Incorrect username'});
        }
        if (!user.validatePassword(password)) { //this allows validation of users password by hashing PW at login and comparing to PW stored in MongoDB 
           console.log('incorrect password'); 
           return callback(null, false, {message: 'Incorrect password.'}); 
        }
         console.log('finished'); 
        return callback(null, user); 
        });
    }));

    passport.use(new JWTStrategy({   //These codes sets up the JWT authentication
        jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(), 
        secretOrKey: 'your_jwt_secret'
    }, (jwtPayload, callback) => { 
        return Users.findById(jwtPayload._id) 
            .then((user) => { 
                return callback(null, user); 
            }) 
            .catch((error) => { 
                return callback(error) 
            });
    }));
    