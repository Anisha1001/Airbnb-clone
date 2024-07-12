const Listing =  require('../models/listing')
const mbxGeocoding= require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken=process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });
module.exports.index = async (req, res) => {
    let allListings = await Listing.find().populate('owner');
    res.render('listings/index.ejs', { allListings });
  };
 
 
module.exports.renderNewForm =(req, res) => {
  res.render('listings/new.ejs');
} ;
 
module.exports.createListing = async (req, res) => {
  let response=await geocodingClient.forwardGeocode({
    query: req.body.listing.location,
    limit: 1,
  })
  .send()
  
  
  let url=req.file.path;
  let filename=req.file.filename;
  let newListing = new Listing(req.body.listing );
  newListing.owner=req.user._id;
  newListing.image={url,filename};
  newListing.geometry=response.body.features[0].geometry;
  let savedListing=await newListing.save();
  console.log(savedListing);
  req.flash("success", "New Listing Added");
  res.redirect('/listings');
};
 
 
module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  let listing = await Listing.findById(id)
    .populate('owner')
    .populate({
      path: 'reviews',
      populate: {
        path: 'author'
      }
    });
    
  if (!listing) {
    req.flash("error", "The page doesn't exist");
    res.redirect("/");
  }
  res.render('listings/show.ejs', { listing });
};
 
 
module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  let listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist");
    return res.redirect("/");
  }
  let originalImageUrl=listing.image.url;
  originalImageUrl=originalImageUrl.replace("/upload","/upload/h_300,w_250")
  res.render('listings/edit.ejs', { listing ,originalImageUrl});
};
 
 
module.exports.updateListing = async (req, res) => {
  let { id } = req.params;
  let listing=await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  if(typeof req.file!=="undefined"){
    let url=req.file.path;
    let filename=req.file.filename;
    listing.image={url,filename};
    await listing.save();
  }
  req.flash("success","Updated");
  res.redirect(`/listings/${id}`);
};
 
 
module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Deleted successfully");
  res.redirect('/listings');
}; 