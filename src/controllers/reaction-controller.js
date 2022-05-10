const database = require("../config").promise();
const databaseSync = require("../config");
const createError = require("../helpers/createError");
const createResponse = require("../helpers/createResponse");
const httpStatus = require("../helpers/httpStatusCode");

module.exports.like = async (req, res) => {
  let { restaurantId, userId } = req.body;

  try {
    // 1. Validasi apakah ada restaurantId
    const GET_RESTAURANT_BY_ID = `
    SELECT * 
    FROM restaurants 
    WHERE restaurantId = ?;`;
    const [RESTAURANT] = await database.execute(GET_RESTAURANT_BY_ID, [
      restaurantId,
    ]);

    if (!RESTAURANT.length) {
      throw new createError(
        httpStatus.Bad_Request,
        "Get restaurant failed",
        "Restaurant is not found!"
      );
    }

    // 2. Validasi apakah ada userId
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

    // 3. Add 'like' jika belum ada 'like' ataupun 'dislike'
    const INSERT_LIKE = `INSERT INTO reactions(restaurantId, userId, likes) SELECT * FROM (SELECT ${database.escape(
      restaurantId
    )}, ${database.escape(
      userId
    )}, 1) AS tmp WHERE NOT EXISTS (SELECT * FROM reactions WHERE restaurantId=${database.escape(
      restaurantId
    )} AND userId=${database.escape(userId)} AND (likes=1 OR dislikes=1))`;
    const [NEW_LIKE] = await database.execute(INSERT_LIKE);

    // 4. Jika tidak bisa insert new like, berarti awalnya sudah ada reaction
    if (NEW_LIKE.affectedRows == 0) {
      const GET_REACTION = `SELECT * FROM reactions WHERE restaurantId=${database.escape(
        restaurantId
      )} AND userId=${database.escape(userId)} AND (likes=1 OR dislikes=1);`;

      const [REACTION] = await database.execute(GET_REACTION);

      // 4.1 Jika sudah di dislike, update dislike menjadi like
      if (REACTION[0].dislikes == 1) {
        const TOGGLE_TO_LIKE = `UPDATE reactions SET likes=1, dislikes=null WHERE restaurantId=${database.escape(
          restaurantId
        )} AND userId=${database.escape(userId)} AND dislikes=1`;
        const [UPDATE_LIKE] = await database.execute(TOGGLE_TO_LIKE);

        const response = new createResponse(
          httpStatus.OK,
          "Update 'like' success",
          "You update your review from 'dislike' to 'like' in this restaurant.",
          UPDATE_LIKE,
          ""
        );
        return res.status(response.status).send(response);
      }
      // 4.2 Atau case kedua, user memang mau hapus review likenya
      else if (REACTION[0].likes == 1) {
        const REMOVE_LIKE = `DELETE FROM reactions WHERE restaurantId=${database.escape(
          restaurantId
        )} AND userId=${database.escape(userId)} AND likes=1`;

        const [UPDATE_LIKE] = await database.execute(REMOVE_LIKE);

        const response = new createResponse(
          httpStatus.OK,
          "Remove 'like' success",
          "You remove a 'like' review in this restaurant.",
          UPDATE_LIKE,
          ""
        );

        return res.status(response.status).send(response);
      }
    }

    const response = new createResponse(
      httpStatus.OK,
      "Add 'like' success",
      "You add a 'like' review in this restaurant.",
      NEW_LIKE.affectedRows,
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

module.exports.dislike = async (req, res) => {
  let { restaurantId, userId } = req.body;

  try {
    // 1. Validasi apakah ada restaurantId
    const GET_RESTAURANT_BY_ID = `
    SELECT * 
    FROM restaurants 
    WHERE restaurantId = ?;`;
    const [RESTAURANT] = await database.execute(GET_RESTAURANT_BY_ID, [
      restaurantId,
    ]);

    if (!RESTAURANT.length) {
      throw new createError(
        httpStatus.Bad_Request,
        "Get restaurant failed",
        "Restaurant is not found!"
      );
    }

    // 2. Validasi apakah ada userId
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

    // 3. Insert 'dislike' jika belum ada 'like' ataupun 'dislike'
    const INSERT_DISLIKE = `INSERT INTO reactions(restaurantId, userId, dislikes) SELECT * FROM (SELECT ${database.escape(
      restaurantId
    )}, ${database.escape(
      userId
    )}, 1) AS tmp WHERE NOT EXISTS (SELECT * FROM reactions WHERE restaurantId=${database.escape(
      restaurantId
    )} AND userId=${database.escape(userId)} AND (likes=1 OR dislikes=1))`;
    const [NEW_DISLIKE] = await database.execute(INSERT_DISLIKE);

    // 4. Jika tidak bisa insert new dislike, berarti awalnya sudah ada reaction
    if (NEW_DISLIKE.affectedRows == 0) {
      const GET_REACTION = `SELECT * FROM reactions WHERE restaurantId=${database.escape(
        restaurantId
      )} AND userId=${database.escape(userId)} AND (likes=1 OR dislikes=1);`;

      const [REACTION] = await database.execute(GET_REACTION);

      // 4.1 Jika sudah di like, update like menjadi dislike
      if (REACTION[0].likes) {
        const TOGGLE_TO_DISLIKE = `UPDATE reactions SET dislikes=1, likes=null WHERE restaurantId=${database.escape(
          restaurantId
        )} AND userId=${database.escape(userId)} AND likes=1`;
        const [UPDATE_DISLIKE] = await database.execute(TOGGLE_TO_DISLIKE);

        const response = new createResponse(
          httpStatus.OK,
          "Update 'dislike' success",
          "You update your review from 'like' to 'dislike' in this restaurant.",
          UPDATE_DISLIKE,
          ""
        );
        return res.status(response.status).send(response);
      }
      // 4.2 Atau case kedua, user memang mau hapus review dislikenya
      else if (REACTION[0].dislikes) {
        const REMOVE_DISLIKE = `DELETE FROM reactions WHERE restaurantId=${database.escape(
          restaurantId
        )} AND userId=${database.escape(userId)} AND dislikes=1`;

        const [UPDATE_DISLIKE] = await database.execute(REMOVE_DISLIKE);

        const response = new createResponse(
          httpStatus.OK,
          "Remove 'dislike' success",
          "You remove a 'dislike' review in this restaurant.",
          UPDATE_DISLIKE,
          ""
        );

        return res.status(response.status).send(response);
      }
    }

    const response = new createResponse(
      httpStatus.OK,
      "Add 'dislike' success",
      "You add a 'dislike' review in this restaurant.",
      NEW_DISLIKE,
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

module.exports.counter = async (req, res) => {
  let restaurantId = req.params.restaurantId;

  try {
    // 1. Validasi apakah ada restaurantId
    const GET_RESTAURANT_BY_ID = `
    SELECT * 
    FROM restaurants 
    WHERE restaurantId = ?;`;
    const [RESTAURANT] = await database.execute(GET_RESTAURANT_BY_ID, [
      restaurantId,
    ]);

    if (!RESTAURANT.length) {
      throw new createError(
        httpStatus.Bad_Request,
        "Get restaurant failed",
        "Restaurant is not found!"
      );
    }

    // 3. Hitung jumlah 'like' dan 'dislike'

    const COUNT_REACTIONS = `SELECT COUNT(likes) as total_likes, COUNT(dislikes) as total_dislikes FROM reactions WHERE restaurantId=${database.escape(
      restaurantId
    )};`;

    const [REACTIONS] = await database.execute(COUNT_REACTIONS);

    // 4. Hitung jumlah review
    const COUNT_REVIEWS = `SELECT COUNT(reviewTitle) as total_reviews FROM reviews WHERE restaurantId=${database.escape(
      restaurantId
    )};`;

    const [REVIEWS] = await database.execute(COUNT_REVIEWS);

    let result = Object.assign({}, REACTIONS[0], REVIEWS[0]);

    const response = new createResponse(
      httpStatus.OK,
      "Get amount of reaction success",
      "Get amount of reaction success",
      result,
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

module.exports.addReview = async (req, res) => {
  let { restaurantId, userId, reviewTitle, reviewDescription } = req.body;

  try {
    // 1. Validasi apakah ada restaurantId
    const GET_RESTAURANT_BY_ID = `
    SELECT * 
    FROM restaurants 
    WHERE restaurantId = ?;`;
    const [RESTAURANT] = await database.execute(GET_RESTAURANT_BY_ID, [
      restaurantId,
    ]);

    if (!RESTAURANT.length) {
      throw new createError(
        httpStatus.Bad_Request,
        "Get restaurant failed",
        "Restaurant is not found!"
      );
    }

    // 2. Validasi apakah ada userId
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

    const INSERT_NEW_REVIEW = `INSERT INTO reviews (restaurantId, userId, reviewTitle, reviewDescription) SELECT * FROM (SELECT ${database.escape(
      restaurantId
    )}, ${database.escape(userId)} ,${database.escape(
      reviewTitle
    )},${database.escape(
      reviewDescription
    )}) AS tmp WHERE NOT EXISTS (SELECT * FROM reviews WHERE restaurantId=${database.escape(
      restaurantId
    )} AND userId=${database.escape(userId)} AND reviewTitle IS NOT NULL);`;
    const [NEW_REVIEW] = await database.execute(INSERT_NEW_REVIEW);

    console.log("NEWREVIEW", NEW_REVIEW);

    // Jika tidak bisa add review, berarti sebelumnya sudah ada, di update saja
    if (NEW_REVIEW.affectedRows == 0) {
      const UPDATE_REVIEW = `UPDATE reviews SET reviewTitle=${database.escape(
        reviewTitle
      )}, reviewDescription=${database.escape(
        reviewDescription
      )} WHERE restaurantId=${database.escape(
        restaurantId
      )} AND userId=${database.escape(userId)};`;

      const [UPDATED_REVIEW] = await database.execute(UPDATE_REVIEW);

      const response = new createResponse(
        httpStatus.OK,
        "Post review success",
        "Your review has been edited",
        UPDATED_REVIEW,
        ""
      );
      res.status(response.status).send(response);
    }
    // Jika bisa add review berarti tinggal kirim response:
    else {
      const response = new createResponse(
        httpStatus.OK,
        "Post review success",
        "Your review has been submitted",
        NEW_REVIEW,
        ""
      );
      res.status(response.status).send(response);
    }
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

module.exports.getReviews = async (req, res) => {
  const restaurantId = req.params.restaurantId;
  try {
    const GET_REVIEWS = `SELECT * FROM (
      SELECT 
          u.userId as userId, 
          u.username as username,
          u.fullname as fullname,
          u.imageUrl as imageUrl,
          r.restaurantId as restaurantId,
          r.reviewTitle as reviewTitle,
          r.reviewDescription as reviewDescription
      FROM
          users u
      INNER JOIN reviews r ON u.userId = r.userId
      WHERE restaurantId=${database.escape(restaurantId)}
      ) AS tmp
      LEFT JOIN reactions re ON tmp.userId = re.userId;`;

    const [REVIEWS] = await database.execute(GET_REVIEWS);

    const response = new createResponse(
      httpStatus.OK,
      "Restaurant data fetched",
      "Restaurant data fetched successfully!",
      REVIEWS,
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

module.exports.getReactionById = async (req, res) => {
  const restaurantId = req.params.restaurantId;
  const userId = req.params.userId;
  console.log(restaurantId, userId);
  try {
    const GET_REACTIONS = `SELECT * FROM reactions
      WHERE restaurantId=${restaurantId}
      AND userId = ${database.escape(userId)};`;

    console.log(GET_REACTIONS);
    const [REACTIONS] = await database.execute(GET_REACTIONS);

    const response = new createResponse(
      httpStatus.OK,
      "Restaurant data fetched",
      "Restaurant data fetched successfully!",
      REACTIONS[0],
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
