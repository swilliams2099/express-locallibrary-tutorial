const Genre = require("../models/genre");
const Book = require("../models/book");
const asyncHandler = require("express-async-handler");
const { body, validationResult } = require("express-validator"); // middleware 
// Equivalent:
// const validator = require("express-validator");
// const body = validator.body;
// const validationResult = validator.validationResult;

// Display list of all Genre.
exports.genre_list = asyncHandler(async (req, res, next) => {
  const allGenres = await Genre.find().sort({ name: 1 }).exec();
  res.render("genre_list", { title: "Genre List", genre_list: allGenres });
});

// Display detail page for a specific Genre.
exports.genre_detail = asyncHandler(async (req, res, next) => {
  const [genre, booksInGenre] = await Promise.all([
    Genre.findById(req.params.id).populate("name").exec(), //check params
    Book.find({ genre: req.params.id }, "title summary author url").populate("author").exec(),
  ]);

  if (genre === null) {
    // No results
    const err = new Error("Genre not found");
    err.status = 404;
    return next(err);
  }

  res.render('genre_detail', {
    title: "Genre Detail",
    genre: genre,
    genre_books: booksInGenre,
  })
});

// Display Genre create form on GET. (Not async bc no exceptions)
exports.genre_create_get = (req, res, next) => {
  res.render("genre_form", { title: "Create Genre" })
};

// Handle Genre create on POST.
// NOTE: Array of middleware functions
exports.genre_create_post = [
  // Validate and sanitize name field.
  body("name", "Genre name must contain at least 3 characters")
    .trim()
    .isLength({ min: 3 })
    .escape(),

  // Process request after validation and sanitation.
  asyncHandler(async (req, res, next) => {
    // Extract validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data.
    const genre = new Genre({ name: req.body.name });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render("genre_form", {
        title: "Create Genre",
        genre: genre,
        errors: errors.array(),
      });
      return;
    } else {
      // Data from form is valid.
      // Check if Genre with same name already exists.
      const genreExists = await Genre.findOne({ name: req.body.name })
        .collation({ locale: "en", strength: 2 })
        .exec();
      if (genreExists) {
        // Genre exists, redirect to its detail page.
        res.redirect(genreExists.url);
      } else {
        await genre.save();
        // New genre saved. Redirect to genre detail page.
        res.redirect(genre.url);
      }
    }
  }),
];

// Display Genre delete form on GET.
exports.genre_delete_get = asyncHandler(async (req, res, next) => {
  // Get details of genre and all books in genre (in parallel)
  const [genre, allBooksInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }, "title summary").exec(),
  ]);

  if (genre === null) {
    res.redirect("/catalog/genres")
  }

  res.render("genre_delete", {
    title: "Delete Genre",
    genre: genre,
    genre_books: allBooksInGenre,
  });
});

// Handle Genre delete on POST.
exports.genre_delete_post = asyncHandler(async (req, res, next) => {
  // Get details of genre and all books in genre (in parallel)
  const [genre, allBooksInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }, "title summary").exec(),
  ]);

  if (allBooksInGenre.length > 0) {
    // Genre has books. Render in same way as for GET route.
    res.render("genre_delete", {
      title: "Delete Genre",
      genre: genre,
      genre_books: allBooksInGenre,
    });
    return;
  } else {
    // Genre has no books. Delete object and redirect to the list of authors.
    await Genre.findByIdAndDelete(req.body.genreid); //genreid?
    res.redirect("/catalog/genres");
  }
});

// Display Genre update form on GET.
exports.genre_update_get = asyncHandler(async (req, res, next) => {
  // Get genre details
  const genre = await Genre.findById(req.params.id).exec();
  if (genre === null) {
    //Handle error
    const err = new Error("Genre not found");
    err.status = 404;
    return next(err);
  }
  // Render genre update form
  res.render("genre_form", {
    title: "Update Genre",
    genre: genre,
  });
});

// TODO: 
// Handle Genre update on POST.
exports.genre_update_post = [

  // Validate and sanitize form fields (via create genre form)
  body("name", "Genre name must contain at least 3 characters")
    .trim()
    .isLength({ min: 3 })
    .escape(),
  // Process request after validation and sanitation.
  asyncHandler(async (req, res, next) => {
    // Extract validation errors from a request.
    const errors = validationResult(req);

    // Create a new genre object with new data (via create genre form)
    const genre = new Genre({
      name: req.body.name,
      _id: req.params.id
    });
    // If errors, return to update form
    if (!errors.isEmpty()) {
      res.render("genre_form", {
        title: "Update Genre",
        author: author,
        errors: errors.array(),
      });
      return;
    } else {
    // Else update record with valid data
    const updatedGenre = await Genre.findByIdAndUpdate(req.params.id, genre, {});
    res.redirect(updatedGenre.url);
    }
  })
];