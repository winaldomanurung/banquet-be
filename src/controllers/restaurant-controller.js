const database = require("../config").promise();
const databaseSync = require("../config");
const createError = require("../helpers/createError");
const createResponse = require("../helpers/createResponse");
const httpStatus = require("../helpers/httpStatusCode");

module.exports.getRestaurants = async (req, res) => {
  try {
    const GET_RESTAURANTS = `SELECT * FROM restaurants;`;
    const [RESTAURANTS] = await database.execute(GET_RESTAURANTS);

    res.status(200).send({
      data: RESTAURANTS,
      message: "OK",
    });
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
          SELECT * 
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

module.exports.addRestaurant = async (req, res) => {
  let { userId, name, type, description, price, coordinate } = req.body;
  console.log(req.body);
  try {
    // 2. Validasi req.body, apakah sesuai dengan schema Joi
    // const { error } = registerUserSchema.validate(req.body);
    // if (error) {
    //   throw new createError(
    //     httpStatus.Bad_Request,
    //     "Register failed",
    //     error.details[0].message
    //   );
    // }

    // 3. Validasi apakah name unique
    // const CHECK_RESTO = `SELECT * FROM restaurants WHERE name = ?`;
    // const [RESTO_DATA] = await database.execute(CHECK_RESTO, [name]);
    // if (RESTO_DATA.length) {
    //   throw new createError(
    //     httpStatus.Bad_Request,
    //     "Add restaurant failed",
    //     "Name already exists!"
    //   );
    // }

    userId = 1;

    // Validasi apakah ada userId
    const GET_USER_BY_ID = `SELECT * FROM users WHERE userId = ?;`;
    const [USER_BY_ID] = await database.execute(GET_USER_BY_ID, [userId]);
    console.log("USER_BY_ID: ", USER_BY_ID[0]);

    if (!USER_BY_ID.length) {
      throw new createError(
        httpStatus.Internal_Server_Error,
        "Invalid user credential",
        "User can't be found!"
      );
    }

    // 6. Store data resto ke dalam database
    // const INSERT_RESTO = `INSERT INTO restaurants (userId, name, type, description, price, coordinate) VALUES(${database.escape(
    //   userId
    // )}, ${database.escape(name)}, ${database.escape(type)}, ${database.escape(
    //   description
    // )} , ${database.escape(price)}, st_geomfromtext('POINT(${database.escape(
    //   coordinate.long
    // )} ${database.escape(coordinate.lat)})'));`;
    const INSERT_RESTO = `INSERT INTO restaurants (userId, name, type, description, price, coordinate) VALUES(${database.escape(
      userId
    )}, ${database.escape(name)}, ${database.escape(type)}, ${database.escape(
      description
    )} , ${database.escape(price)}, st_geomfromtext('POINT(21 20)'));`;
    const [RESTO] = await database.execute(INSERT_RESTO);
    // console.log(INFO);

    // 7. Generate Token
    // console.log("generate token");
    const GET_RESTO_BY_NAME = `SELECT * FROM restaurants WHERE name = ?;`;
    const [RESTO_BY_NAME] = await database.execute(GET_RESTO_BY_NAME, [name]);
    console.log("RESTO_BY_NAME: ", RESTO_BY_NAME[0]);

    const response = new createResponse(
      httpStatus.OK,
      "Add restaurant success",
      "Your restaurant now can be seen by other users.",
      RESTO_BY_NAME[0],
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
  // const restaurantId = req.params.restaurantId;
  // console.log(restaurantId);

  try {
    const GET_RESTAURANTS_BY_ID = `
          SELECT * 
          FROM restaurants 
          WHERE userId = 1; 
      `;
    const [RESTAURANTS] = await database.execute(
      GET_RESTAURANTS_BY_ID
      //   , [
      //   restaurantId,
      // ]
    );

    // validate
    if (!RESTAURANTS.length) {
      throw new createError(
        httpStatus.Bad_Request,
        "Restaurant is not found!",
        "You don't have any restaurant"
      );
    }

    // create respond
    const response = new createResponse(
      httpStatus.OK,
      "Get restaurants success",
      "Restaurants loaded successfully!",
      RESTAURANTS,
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
