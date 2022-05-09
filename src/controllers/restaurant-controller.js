const database = require("../config").promise();
const databaseSync = require("../config");
const createError = require("../helpers/createError");
const createResponse = require("../helpers/createResponse");
const httpStatus = require("../helpers/httpStatusCode");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });
const { uploader } = require("../helpers/uploader");
const fs = require("fs");

// module.exports.getStudents = async (req, res) => {
//   // capture all request query params
//   const limit = Number(req.query._limit) || 5
//   const page = Number(req.query._page) || 1
//   const offset = (page - 1) * limit
//   const sort = req.query._sort || 'id'
//   const order = req.query._order || 'ASC'

//   // define query
//   const GET_STUDENTS = `
//       SELECT st.id, st.studentId, st.name, st.email, pg.program, ct.city
//       FROM students AS st
//       JOIN program AS pg ON pg.id = st.programId
//       JOIN city AS ct ON ct.id = st.cityId
//       ORDER BY ${'st.' + sort} ${order}
//       LIMIT ${database.escape(offset)}, ${database.escape(limit)};
//   `
//   const GET_TOTAL = `SELECT COUNT(*) AS total FROM students;`

//   // execute query
//   try {
//       const [ STUDENTS ] = await database.execute(GET_STUDENTS)
//       const [ TOTAL ] = await database.execute(GET_TOTAL)

//       const respond = new createRespond(http_status.OK, 'get', true, TOTAL[0].total, limit, STUDENTS)
//       res.status(respond.status).send(respond)
//   } catch (error) {
//       const isTrusted = error instanceof createError
//       if (!isTrusted) {
//           error = new createError(http_status.INTERNAL_SERVICE_ERROR, error.sqlMessage)
//           console.log(error)
//       }
//       res.status(error.status).send(error)
//   }
// }

module.exports.getRestaurants = async (req, res) => {
  const page = req.query.page || 1;
  const limit = 6;
  const offset = (page - 1) * limit;
  try {
    const GET_RESTAURANTS = `
    SELECT 
      r.restaurantId, 
      r.userId,
      r.name, 
      r.location,
      r.description, 
      r.price, 
      date_format(r.createdAt, '%M %e, %Y') as createdDate,
      u.username, 
      u.imageUrl as userImageUrl, 
      ri.imageUrl as restaurantImageUrl, 
      COUNT(DISTINCT(re.likes)) as totalLikes, 
      COUNT(DISTINCT(re.dislikes)) as totalDislikes, 
      COUNT(DISTINCT(rev.reviewTitle)) as totalReviews 
    FROM restaurants r
    LEFT JOIN users u ON r.userId = u.userId
    LEFT JOIN restaurant_images ri ON r.restaurantId = ri.restaurantId
    LEFT JOIN reactions re ON r.restaurantId=re.restaurantId
    LEFT JOIN reviews rev ON r.restaurantId=rev.restaurantId
    GROUP BY r.restaurantId
    ORDER BY r.createdAt
    LIMIT ${database.escape(offset)}, ${database.escape(limit)};`;
    const [RESTAURANTS] = await database.execute(GET_RESTAURANTS);

    const COUNT_RESTAURANTS = `
    SELECT COUNT(DISTINCT(restaurantId)) as totalRestaurants FROM restaurants;`;
    const [RESTAURANTS_AMOUNT] = await database.execute(COUNT_RESTAURANTS);

    console.log(RESTAURANTS);
    console.log(RESTAURANTS_AMOUNT);

    // let result = Object.assign({}, o1, o2, o3);

    const response = new createResponse(
      httpStatus.OK,
      "Restaurant data fetched",
      "Restaurant data fetched successfully!",
      RESTAURANTS,
      RESTAURANTS_AMOUNT
    );

    res.status(response.status).send(response);
  } catch (err) {
    console.log("error : ", err);
    const isTrusted = err instanceof createError;
    if (!isTrusted) {
      err = new createError(
        httpStatus.Internal_Server_Error,
        "SQL Script Error",
        err.sqlMessage
      );
      console.log(err);
    }
    res.status(err.status).send(err);
  }
};

module.exports.getRestaurantById = async (req, res) => {
  const restaurantId = req.params.restaurantId;
  console.log(restaurantId);

  try {
    const GET_RESTAURANT_BY_ID = `
    SELECT 
    restaurantId, 
    name, 
    type, 
    description, 
    price, 
    coordinate, 
    userId, 
    date_format(createdAt, '%M %e, %Y') as createdDate
    FROM restaurants 
    WHERE restaurantId = ?; 
      `;
    const [RESTAURANT] = await database.execute(GET_RESTAURANT_BY_ID, [
      restaurantId,
    ]);

    // validate
    if (!RESTAURANT.length) {
      const err = new Error("Error");
      err.statusCode = 500;
      err.message = "Restaurant is not found";
      throw err;
    }

    // create response
    const response = new createResponse(
      httpStatus.OK,
      "Restaurant data fetched",
      "Restaurant data fetched successfully!",
      RESTAURANT[0],
      ""
    );

    res.status(response.status).send(response);
  } catch (err) {
    console.log("error : ", err);
    const isTrusted = err instanceof createError;
    if (!isTrusted) {
      err = new createError(
        httpStatus.Internal_Server_Error,
        "SQL Script Error",
        err.sqlMessage
      );
      console.log(err);
    }
    res.status(err.status).send(err);
  }
};

module.exports.addRestaurant = (req, res) => {
  console.log("masuk");
  let newRestaurant;
  let path = "/restaurant-images";

  // if (!req.files) {
  //   throw new createError(
  //     httpStatus.Internal_Server_Error,
  //     "Upload failed",
  //     "You have to provide atleast one image!"
  //   );
  // }

  const upload = uploader(path, "IMG").fields([{ name: "file" }]);

  upload(req, res, async (error) => {
    try {
      if (error) {
        throw new createError(
          httpStatus.Internal_Server_Error,
          "Internal Server Error",
          "Add restaurant failed."
        );
      }

      console.log("lewat");

      let data = JSON.parse(req.body.data);
      let { userId, name, location, type, price, description } = data;

      const GET_USER_BY_ID = `SELECT * FROM users WHERE userId = ?;`;
      const [USER_BY_ID] = await database.execute(GET_USER_BY_ID, [userId]);

      if (!USER_BY_ID.length) {
        throw new createError(
          httpStatus.Internal_Server_Error,
          "Invalid user credential",
          "User can't be found!"
        );
      }

      const geoData = await geocoder
        .forwardGeocode({
          query: location,
          limit: 1,
        })
        .send();

      let lat = geoData.body.features[0].geometry.coordinates[1];
      let long = geoData.body.features[0].geometry.coordinates[0];
      console.log(lat);
      console.log(long);

      const INSERT_RESTO = `INSERT INTO restaurants (userId, name, location, type, description, price, coordinate) VALUES(${database.escape(
        userId
      )}, ${database.escape(name)}, ${database.escape(
        location
      )}, ${database.escape(type)}, ${database.escape(
        description
      )} , ${database.escape(price)}, st_geomfromtext('POINT(${database.escape(
        lat
      )} ${database.escape(long)})'));`;
      const [RESTO] = await database.execute(INSERT_RESTO);
      let restaurantId = RESTO.insertId;
      newRestaurant = RESTO;

      // Image table

      const { file } = req.files;
      console.log(file);

      let imageQuery = "";

      for (var i = 0; i < file.length; i++) {
        imageQuery += `(${database.escape(restaurantId)}, ${database.escape(
          path + "/" + file[i].filename
        )}),`;
      }

      console.log(imageQuery);

      let INSERT_IMAGES = `INSERT INTO restaurant_images(restaurantId, imageUrl) VALUES ${imageQuery.slice(
        0,
        -1
      )};`;
      console.log(INSERT_IMAGES);
      databaseSync.query(INSERT_IMAGES, (err, results) => {
        if (err) {
          throw new createError(
            httpStatus.Internal_Server_Error,
            "Upload failed",
            "Upload image failed!"
          );
        }
      });
      const response = new createResponse(
        httpStatus.OK,
        "Add restaurant success",
        "Your restaurant now can be seen by other users.",
        newRestaurant,
        ""
      );

      res.status(response.status).send(response);
    } catch (err) {
      console.log("error : ", err);
      const isTrusted = err instanceof createError;
      if (!isTrusted) {
        err = new createError(
          httpStatus.Internal_Server_Error,
          "SQL Script Error",
          err.sqlMessage
        );
        console.log(err);
      }
      res.status(err.status).send(err);
    }
  });
};

module.exports.editRestaurant = async (req, res) => {
  let err;
  const restaurantId = req.params.restaurantId;
  const body = req.body;
  console.log(restaurantId, body);
  try {
    // 1. Check data apakah data user ada di dalam database
    const FIND_RESTAURANT = `SELECT * FROM restaurants WHERE restaurantId = ${database.escape(
      restaurantId
    )};`;

    console.log(FIND_RESTAURANT);
    const [RESTAURANT] = await database.execute(FIND_RESTAURANT);
    if (!RESTAURANT.length) {
      // err = new Error("Error sini");
      // err.statusCode = 500;
      // err.message = "Gada user bos";
      // throw err;
      throw new createError(
        httpStatus.Bad_Request,
        "Edit restaurant failed",
        "Restaurant is not found!"
      );
    }

    // 2. Check apakah body memiliki inputan
    const isEmpty = !Object.keys(body).length;
    if (isEmpty) {
      // err = new Error("Error sana");
      // err.statusCode = 500;
      // err.message = "Gada body bos";
      // throw err;
      throw new createError(
        httpStatus.Bad_Request,
        "Edit restaurant failed",
        "Your form is incomplete!"
      );
    }

    // 3. Gunakan Joi untuk validasi data dari body
    // const { error } = patchUserSchema.validate(body);
    // if (error) {
    //   console.log(error.details[0].message);
    //   throw new createError(
    //     httpStatus.Bad_Request,
    //     "Edit failed",
    //     error.details[0].message
    //   );
    // }

    // 4. Validasi apakah username unique
    // const CHECK_USER = `SELECT id FROM users WHERE username = ? AND userId != ?`;
    // const [USER_DATA] = await database.execute(CHECK_USER, [
    //   req.body.username,
    //   userId,
    // ]);
    // if (USER_DATA.length) {
    //   throw new createError(
    //     httpStatus.Bad_Request,
    //     "Edit failed",
    //     "Username already exists!"
    //   );
    // }

    //  5. Buat query untuk edit
    let query = [];
    for (let key in body) {
      query.push(`${key}='${body[key]}' `);
    }

    console.log(query);
    const EDIT_RESTAURANT = `UPDATE restaurants SET ${query} WHERE restaurantId = ${database.escape(
      restaurantId
    )};`;
    console.log(EDIT_RESTAURANT);
    const [EDITED_RESTAURANT] = await database.execute(EDIT_RESTAURANT);
    console.log(EDITED_RESTAURANT[0]);

    const FIND_UPDATED_RESTAURANT = `SELECT * FROM restaurants WHERE restaurantId = ${database.escape(
      restaurantId
    )};`;
    console.log(FIND_UPDATED_RESTAURANT);
    const [UPDATED_RESTAURANT] = await database.execute(
      FIND_UPDATED_RESTAURANT
    );

    const response = new createResponse(
      httpStatus.OK,
      "Edit restaurant success",
      "Restaurant changes saved successfully!",
      UPDATED_RESTAURANT[0],
      ""
    );

    res.status(response.status).send(response);
  } catch (err) {
    console.log("error : ", err);
    const isTrusted = err instanceof createError;
    if (!isTrusted) {
      err = new createError(
        httpStatus.Internal_Server_Error,
        "SQL Script Error",
        err.sqlMessage
      );
      console.log(err);
    }
    res.status(err.status).send(err);
  }
};

module.exports.deleteRestaurant = async (req, res) => {
  const restaurantId = req.params.restaurantId;
  try {
    // check restaurant data by its restaurantId
    const CHECK_RESTAURANT = `SELECT * FROM restaurants WHERE restaurantId = ?;`;
    const [RESTAURANT] = await database.execute(CHECK_RESTAURANT, [
      restaurantId,
    ]);
    if (!RESTAURANT.length) {
      throw new createError(
        httpStatus.Bad_Request,
        "Edit restaurant failed",
        "Restaurant is not found!"
      );
    }

    // define query delete
    const DELETE_RESTAURANT = `DELETE FROM restaurants WHERE restaurantId = ?;`;
    const [DELETED_RESTAURANT] = await database.execute(DELETE_RESTAURANT, [
      restaurantId,
    ]);

    // send respond to client-side
    const response = new createResponse(
      httpStatus.OK,
      "Delete restaurant success",
      "Restaurant deleted successfully!",
      "",
      ""
    );

    res.status(response.status).send(response);
  } catch (err) {
    console.log("error : ", err);
    const isTrusted = err instanceof createError;
    if (!isTrusted) {
      err = new createError(
        httpStatus.Internal_Server_Error,
        "SQL Script Error",
        err.sqlMessage
      );
      console.log(err);
    }
    res.status(err.status).send(err);
  }
};

module.exports.getMyRestaurants = async (req, res) => {
  const userId = req.params.userId;
  // console.log(restaurantId);
  const page = req.query.page || 1;
  const limit = 6;
  const offset = (page - 1) * limit;

  try {
    const FIND_USER = `SELECT id FROM users WHERE userId = ${database.escape(
      userId
    )};`;

    const [USER] = await database.execute(FIND_USER);
    if (!USER.length) {
      throw new createError(
        httpStatus.Bad_Request,
        "Edit failed",
        "User ID is not registered!"
      );
    }

    const GET_MY_RESTAURANTS = `
      SELECT 
        r.restaurantId, 
        r.userId,
        r.name, 
        r.location,
        r.description, 
        r.price, 
        date_format(r.createdAt, '%M %e, %Y') as createdDate,
        u.username, 
        u.imageUrl as userImageUrl, 
        ri.imageUrl as restaurantImageUrl, 
        COUNT(DISTINCT(re.likes)) as totalLikes, 
        COUNT(DISTINCT(re.dislikes)) as totalDislikes, 
        COUNT(DISTINCT(rev.reviewTitle)) as totalReviews 
      FROM restaurants r
      LEFT JOIN users u ON r.userId = u.userId
      LEFT JOIN restaurant_images ri ON r.restaurantId = ri.restaurantId
      LEFT JOIN reactions re ON r.restaurantId=re.restaurantId
      LEFT JOIN reviews rev ON r.restaurantId=rev.restaurantId
      WHERE r.userId = ${database.escape(userId)}
      GROUP BY r.restaurantId
      ORDER BY r.createdAt
      LIMIT ${database.escape(offset)}, ${database.escape(limit)};`;
    const [MY_RESTAURANTS] = await database.execute(GET_MY_RESTAURANTS);

    const COUNT_MY_RESTAURANTS = `
      SELECT COUNT(DISTINCT(restaurantId)) as totalRestaurants FROM restaurants WHERE userId = ${database.escape(
        userId
      )};`;
    const [MY_RESTAURANTS_AMOUNT] = await database.execute(
      COUNT_MY_RESTAURANTS
    );

    // validate
    // if (!MY_RESTAURANTS.length) {
    //   throw new createError(
    //     httpStatus.Bad_Request,
    //     "Restaurant is not found!",
    //     "You don't have any restaurant"
    //   );
    // }

    // create respond
    const response = new createResponse(
      httpStatus.OK,
      "Get restaurants success",
      "Restaurants loaded successfully!",
      MY_RESTAURANTS,
      MY_RESTAURANTS_AMOUNT
    );

    res.status(response.status).send(response);
  } catch (err) {
    console.log("error : ", err);
    const isTrusted = err instanceof createError;
    if (!isTrusted) {
      err = new createError(
        httpStatus.Internal_Server_Error,
        "SQL Script Error",
        err.sqlMessage
      );
      console.log(err);
    }
    res.status(err.status).send(err);
  }
};

module.exports.getRestaurantImages = async (req, res) => {
  const restaurantId = req.params.restaurantId;
  // const userId = req.params.userId;

  console.log(restaurantId);

  try {
    const GET_RESTAURANTS_BY_ID = `
          SELECT * 
          FROM restaurants 
          WHERE restaurantId = ?; 
      `;
    const [RESTAURANTS] = await database.execute(GET_RESTAURANTS_BY_ID, [
      restaurantId,
    ]);

    // validate
    if (!RESTAURANTS.length) {
      throw new createError(
        httpStatus.Bad_Request,
        "Restaurant is not found!",
        "You don't have any restaurant"
      );
    }

    const GET_RESTAURANT_IMAGES = `
    SELECT * FROM restaurant_images WHERE restaurantId=?; 
`;
    const [RESTAURANT_IMAGES] = await database.execute(GET_RESTAURANT_IMAGES, [
      restaurantId,
    ]);

    // validate
    if (!RESTAURANT_IMAGES.length) {
      throw new createError(
        httpStatus.Bad_Request,
        "Image is not found!",
        "You don't have any restaurant image"
      );
    }

    // create respond
    const response = new createResponse(
      httpStatus.OK,
      "Get images success",
      "Restaurant images loaded successfully!",
      RESTAURANT_IMAGES,
      ""
    );

    res.status(response.status).send(response);
  } catch (err) {
    console.log("error : ", err);
    const isTrusted = err instanceof createError;
    if (!isTrusted) {
      err = new createError(
        httpStatus.Internal_Server_Error,
        "SQL Script Error",
        err.sqlMessage
      );
      console.log(err);
    }
    res.status(err.status).send(err);
  }
};
