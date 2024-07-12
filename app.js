if(process.env.NODE_ENV !="production"){
  require("dotenv").config()
}


const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const{isLoggedIn,isOwner,isreviewAuthor}=require("./middleware.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const {listingSchema, reviewSchema} = require("./schema.js");
const Review = require("./models/review.js");
const session=require("express-session")
const MongoStore = require('connect-mongo');

const flash=require("connect-flash");
const passport=require("passport");
const localStrategy=require("passport-local");
const User=require("./models/user.js");
const { is } = require("express/lib/request.js");
//const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const dbUrl=process.env.ATLASDB_URL;
const{saveRedirectUrl}=require("./middleware.js");
const listingController=require("./controller/listing.js");
const reviewController=require("./controller/review.js");
const multer  = require('multer')
const {storage}=require("./cloudConfig.js");
const upload = multer({ storage});
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));
const store=MongoStore.create({
  mongoUrl:dbUrl,
  crypto:{
    secret:process.env.SECRET,
  },
  touchAfter:24*3600,
});
store.on("error",()=>{
  console.log("ERROR IN MONO SESSION STORE",err)
})
const sessionOptions={
  store,
  secret:process.env.SECRET,
  resave:false,
  saveUninitialized:true,
  cookie:{
       expires:Date.now()+7*24*60*60,
       maxAge:Date.now()+7*24*60*60,
       httpOnly:true,
  }
};
app.use(session(sessionOptions));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req,res,next)=>{
  res.locals.success=req.flash("success");
  res.locals.error=req.flash("error");
  res.locals.currUser=req.user;
  next();
})

//signup
app.get("/signup",(req,res)=>{
  res.render("users/signup.ejs");
});
app.post("/signup",wrapAsync(async(req,res)=>{
  try{
    let{username,email,password}=req.body;
    const newUser=new User({email,username})
    const registeredUser=await User.register(newUser,password);
    console.log(registeredUser);
    req.login(registeredUser,(err)=>{
         if(err){
          return next(err);
         }
         req.flash("success","User registered successfully!");
         res.redirect("/listings");
    })
   
  }catch(e){
    req.flash("error",e.message);
    res.redirect("/signup");
  }
}
));
//login
app.get("/login",(req,res)=>{
  res.render("users/login.ejs");
});
app.post("/login",saveRedirectUrl,passport.authenticate("local",{failureRedirect:'/login',failureFlash:true}),async(req,res)=>{
  req.flash("success"," Welcome! You are logged in!");
  let redirectUrl=res.locals.redirectUrl||"/listings";
  res.redirect(redirectUrl);

});
app.get("/logout",(req,res)=>{
  req.logout((err)=>{
    if(err){
      return next(err);
    }else{
      req.flash("error","You are logged out!");
      res.redirect("/listings");
    }
  })
});
main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

  async function main() {
    await mongoose.connect(dbUrl);
  }
  






const validateListing = (req, res, next) =>{
  let {error} = listingSchema.validate(req.body);
    if(error){
      let errMsg = error.details.map((el) => el.message).join(",");
      throw new ExpressError(400, errMsg);
    }
    else{
      next();
    }
}

const validateReview = (req, res, next) =>{
  let {error} = reviewSchema.validate(req.body);
    if(error){
      let errMsg = error.details.map((el) => el.message).join(",");
      throw new ExpressError(400, errMsg);
    }
    else{
      next();
    }
}

//New Route
app.get("/listings/new",isLoggedIn,listingController.renderNewForm);

//Create Route and error handling done on it with wrapAsync

app.post("/listings",isLoggedIn,upload.single("listing[image]"),wrapAsync(listingController.createListing)
);
//Edit Route
app.get("/listings/:id/edit",isLoggedIn,isOwner, wrapAsync(listingController.renderEditForm));

//Update Route
app.put("/listings/:id",isLoggedIn,isOwner,upload.single("listing[image]"), wrapAsync(listingController.updateListing));

//Delete Route
app.delete("/listings/:id",isLoggedIn,isOwner, wrapAsync(listingController.destroyListing));

//Reviews
// Post Route
app.post("/listings/:id/reviews", isLoggedIn,validateReview, wrapAsync(reviewController.reviewCreate));
//Delete review route
app.delete("/listings/:id/reviews/:reviewId",isLoggedIn,isreviewAuthor,wrapAsync(reviewController.reviewDelete));
//Show Route
app.get("/listings/:id", wrapAsync(listingController.showListing));

//Index Route
app.get("/listings", wrapAsync(listingController.index))


// app.get("/testListing", async (req, res)=>{
//     let sampleListing = new Listing({
//         title: "My New Villa",
//         description: "By the beach",
//         price: 1200,
//         location: "Calangute, Goa",
//         country: "India",
//     });

//     await sampleListing.save();
//     console.log("sample was saved");
//     res.send("Successful Testing");
// })

app.all("*", (req, res, next)=> {
  next(new ExpressError(404, "Page Not Found!"));
});

//middleware for error handling
app.use((err, req, res, next) => {
  let {statusCode=500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", {message});
  // res.status(statusCode).send(message);
})
/

app.listen(3000, () => {
  console.log("server is listening to port 8080");
});
