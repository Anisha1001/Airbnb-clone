const Listing = require("./models/listing.js");
const Review=require("./models/review.js");
module.exports.isLoggedIn=(req,res,next)=>{
    if(!req.isAuthenticated()){
        req.session.redirectUrl=req.originalUrl;
        req.flash("error","You must be logged in!");
        return res.redirect("/login");
      }
      next();
}
module.exports.saveRedirectUrl=(req,res,next)=>{
    if(req.session.redirectUrl){
        res.locals.redirectUrl=req.session.redirectUrl;
    }
    next();
}
module.exports.isOwner=async(req,res,next)=>{
    let{id}=req.params;
    let listing=await Listing.findById(id);
    if(!listing.owner._id.equals(res.locals.currUser._id)){
      req.flash("error","You are not the owner of this property ")
      return res.redirect(`/listings/${id}`);
    }
    next();
}
module.exports.isreviewAuthor=async(req,res,next)=>{
    let{id,reviewId}=req.params;
    let review=await Review.findById(reviewId);
    if(!review.author._id.equals(res.locals.currUser._id)){
      req.flash("error","You did not create this review ")
      return res.redirect(`/listings/${id}`);
    }
    next();
}
module.exports.validateListing = async (req, res, next) => {
  let result = listingValidation.validate(req.body);
  if (result.error) {
    throw new ExpressError(400, result.error);
  } else {
    next();
  }
};

module.exports.validateReview = async(req,res,next)=>{
    let result = reviewValidation.validate(req.body);
    if (result.error){
      throw new ExpressError(400,result.error);
    }
    else{
      next();
    }
  }

