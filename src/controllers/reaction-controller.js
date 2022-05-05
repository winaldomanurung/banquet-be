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
        "Edit restaurant failed",
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
    const INSERT_LIKE = `INSERT INTO reactions(restaurantId, likes) SELECT * FROM (SELECT ${database.escape(
      restaurantId
    )}, ${database.escape(
      userId
    )}) AS tmp WHERE NOT EXISTS (SELECT * FROM reactions WHERE restaurantId=${database.escape(
      restaurantId
    )} AND (likes=${database.escape(userId)} OR dislikes=${database.escape(
      userId
    )}))`;
    const [NEW_LIKE] = await database.execute(INSERT_LIKE);

    // 4. Jika tidak bisa insert new like, berarti awalnya sudah ada reaction
    if (NEW_LIKE.affectedRows == 0) {
      const GET_REACTION = `SELECT * FROM reactions WHERE restaurantId=${database.escape(
        restaurantId
      )} AND (likes=${database.escape(userId)} OR dislikes=${database.escape(
        userId
      )});`;

      const [REACTION] = await database.execute(GET_REACTION);

      // 4.1 Jika sudah di dislike, update dislike menjadi like
      if (REACTION[0].dislikes) {
        const TOGGLE_TO_LIKE = `UPDATE reactions SET likes=${database.escape(
          userId
        )}, dislikes=null WHERE restaurantId=${database.escape(
          restaurantId
        )} AND dislikes=${database.escape(userId)}`;
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
      else if (REACTION[0].likes) {
        const REMOVE_LIKE = `DELETE FROM reactions WHERE restaurantId=${database.escape(
          restaurantId
        )} AND likes=${database.escape(userId)}`;

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
        "Edit restaurant failed",
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
    const INSERT_DISLIKE = `INSERT INTO reactions(restaurantId, dislikes) SELECT * FROM (SELECT ${database.escape(
      restaurantId
    )}, ${database.escape(
      userId
    )}) AS tmp WHERE NOT EXISTS (SELECT * FROM reactions WHERE restaurantId=${database.escape(
      restaurantId
    )} AND (likes=${database.escape(userId)} OR dislikes=${database.escape(
      userId
    )}))`;
    const [NEW_DISLIKE] = await database.execute(INSERT_DISLIKE);

    // 4. Jika tidak bisa insert new dislike, berarti awalnya sudah ada reaction
    if (NEW_DISLIKE.affectedRows == 0) {
      const GET_REACTION = `SELECT * FROM reactions WHERE restaurantId=${database.escape(
        restaurantId
      )} AND (likes=${database.escape(userId)} OR dislikes=${database.escape(
        userId
      )});`;

      const [REACTION] = await database.execute(GET_REACTION);

      // 4.1 Jika sudah di like, update like menjadi dislike
      if (REACTION[0].likes) {
        const TOGGLE_TO_DISLIKE = `UPDATE reactions SET dislikes=${database.escape(
          userId
        )}, likes=null WHERE restaurantId=${database.escape(
          restaurantId
        )} AND likes=${database.escape(userId)}`;
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
        )} AND dislikes=${database.escape(userId)}`;

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
  let { restaurantId } = req.body;

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
        "Edit restaurant failed",
        "Restaurant is not found!"
      );
    }

    // 3. Hitung jumlah 'like' dan 'dislike'
    const COUNT_REACTION = `SELECT COUNT(DISTINCT(likes)) as total_likes, COUNT(DISTINCT(dislikes)) as total_dislikes FROM reactions WHERE restaurantId=${database.escape(
      restaurantId
    )};`;

    const [REACTION_AMOUNT] = await database.execute(COUNT_REACTION);

    const response = new createResponse(
      httpStatus.OK,
      "Get amount of reaction success",
      "Get amount of reaction success",
      REACTION_AMOUNT[0],
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
module.exports.countDislike = async (req, res) => {};
