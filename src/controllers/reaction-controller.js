const database = require("../config").promise();
const databaseSync = require("../config");
const createError = require("../helpers/createError");
const createResponse = require("../helpers/createResponse");
const httpStatus = require("../helpers/httpStatusCode");

const { addReviewSchema } = require("../helpers/validation-schema");

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

    console.log("lewat1");

    // 3. Add 'like' jika belum ada 'like' ataupun 'dislike'
    const INSERT_LIKE = `INSERT INTO reactions(restaurantId, userId, likes) SELECT * FROM (SELECT ${database.escape(
      restaurantId
    )}, ${database.escape(
      userId
    )}, true) AS tmp WHERE NOT EXISTS (SELECT * FROM reactions WHERE restaurantId=${database.escape(
      restaurantId
    )} AND userId=${database.escape(
      userId
    )} AND (likes=true OR dislikes=true));`;
    const [NEW_LIKE] = await database.execute(INSERT_LIKE);

    console.log("lewat");

    // 4. Jika tidak bisa insert new like, berarti awalnya sudah ada reaction
    if (NEW_LIKE.affectedRows == 0) {
      const GET_REACTION = `SELECT * FROM reactions WHERE restaurantId=${database.escape(
        restaurantId
      )} AND userId=${database.escape(
        userId
      )} AND (likes=true OR dislikes=true);`;

      const [REACTION] = await database.execute(GET_REACTION);

      // 4.1 Jika sudah di dislike, update dislike menjadi like
      if (REACTION[0].dislikes == true) {
        const TOGGLE_TO_LIKE = `UPDATE reactions SET likes=true, dislikes=false WHERE restaurantId=${database.escape(
          restaurantId
        )} AND userId=${database.escape(userId)} AND dislikes=true`;
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
      else if (REACTION[0].likes == true) {
        const REMOVE_LIKE = `DELETE FROM reactions WHERE restaurantId=${database.escape(
          restaurantId
        )} AND userId=${database.escape(userId)} AND likes=true`;

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
    )}, true) AS tmp WHERE NOT EXISTS (SELECT * FROM reactions WHERE restaurantId=${database.escape(
      restaurantId
    )} AND userId=${database.escape(
      userId
    )} AND (likes=true OR dislikes=true))`;
    const [NEW_DISLIKE] = await database.execute(INSERT_DISLIKE);

    // 4. Jika tidak bisa insert new dislike, berarti awalnya sudah ada reaction
    if (NEW_DISLIKE.affectedRows == 0) {
      const GET_REACTION = `SELECT * FROM reactions WHERE restaurantId=${database.escape(
        restaurantId
      )} AND userId=${database.escape(
        userId
      )} AND (likes=true OR dislikes=true);`;

      const [REACTION] = await database.execute(GET_REACTION);

      // 4.1 Jika sudah di like, update like menjadi dislike
      if (REACTION[0].likes) {
        const TOGGLE_TO_DISLIKE = `UPDATE reactions SET dislikes=1, likes=false WHERE restaurantId=${database.escape(
          restaurantId
        )} AND userId=${database.escape(userId)} AND likes=true`;
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
        )} AND userId=${database.escape(userId)} AND dislikes=true;`;

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

    // const COUNT_REACTIONS = `SELECT COUNT(likes) as total_likes, COUNT(dislikes) as total_dislikes FROM reactions WHERE restaurantId=${database.escape(
    //   restaurantId
    // )};`;

    const COUNT_REACTIONS = ` SELECT
    sum(case when likes = true then 1 else 0 end) as total_likes,
    sum(case when dislikes = true then 1 else 0 end) as total_dislikes
  FROM reactions
  WHERE restaurantId=${database.escape(restaurantId)};`;

    const [REACTIONS] = await database.execute(COUNT_REACTIONS);

    // 4. Hitung jumlah review
    const COUNT_REVIEWS = `SELECT COUNT(reviewTitle) as total_reviews FROM reviews WHERE restaurantId=${database.escape(
      restaurantId
    )};`;

    let total_likes = +REACTIONS[0].total_likes;
    let total_dislikes = +REACTIONS[0].total_dislikes;

    const [REVIEWS] = await database.execute(COUNT_REVIEWS);

    // let result = Object.assign({}, REACTIONS[0], REVIEWS[0]);
    let result = { total_likes, total_dislikes, ...REVIEWS[0] };

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

    const { error } = addReviewSchema.validate({
      restaurantId,
      userId,
      reviewTitle,
      reviewDescription,
    });
    if (error) {
      console.log(error.details[0].message);
      throw new createError(
        httpStatus.Bad_Request,
        "Add review failed",
        error.details[0].message
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

module.exports.getReviewsPaginated = async (req, res) => {
  const restaurantId = req.params.restaurantId;
  const page = req.query.page || 1;
  const userId = req.query.userId;
  const limit = 5;
  const offset = (page - 1) * limit;
  const nextOffset = page * limit;
  try {
    const GET_REVIEWS = `SELECT * FROM (
      SELECT 
          u.userId as userId, 
          u.username as username,
          u.fullname as fullname,
          u.imageUrl as imageUrl,
          r.restaurantId as restaurantId,
          r.reviewTitle as reviewTitle,
          r.reviewDescription as reviewDescription,
          date_format(r.createdAt, '%M %e, %Y') as createdDate,
          r.createdAt as createdAt
      FROM
          users u
      INNER JOIN reviews r ON u.userId = r.userId
      WHERE restaurantId=${database.escape(restaurantId)}
      ) AS tmp
      LEFT JOIN reactions re ON tmp.userId = re.userId AND tmp.restaurantId = re.restaurantId
      ORDER BY r.createdAt DESC
      LIMIT ${database.escape(offset)}, ${database.escape(limit)};`;

    const [REVIEWS] = await database.execute(GET_REVIEWS);

    const NEXT_REVIEWS = `SELECT * FROM (
      SELECT 
          u.userId as userId, 
          u.username as username,
          u.fullname as fullname,
          u.imageUrl as imageUrl,
          r.restaurantId as restaurantId,
          r.reviewTitle as reviewTitle,
          r.reviewDescription as reviewDescription,
          date_format(r.createdAt, '%M %e, %Y') as createdDate,
          r.createdAt as createdAt
      FROM
          users u
      INNER JOIN reviews r ON u.userId = r.userId
      WHERE restaurantId=${database.escape(restaurantId)}
      ) AS tmp
      LEFT JOIN reactions re ON tmp.userId = re.userId AND tmp.restaurantId = re.restaurantId
      ORDER BY r.createdAt DESC
      LIMIT ${database.escape(nextOffset)}, ${database.escape(limit)};`;

    const [NEXT] = await database.execute(NEXT_REVIEWS);

    const response = new createResponse(
      httpStatus.OK,
      "Restaurant data fetched",
      "Restaurant data fetched successfully!",
      REVIEWS,
      NEXT
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

module.exports.seedingReviews = async (req, res) => {
  let restaurantId = req.body.restaurantId;
  var reviewTitles = [
    "Restoran ini adalah lelucon",
    "Saya tidak akan pernah datang lagi",
    "Pelayanannya sangat hebat",
    "Makanan top, harga masuk akal",
    "Tidak buruk, namun juga tidak memuaskan",
  ];

  let reviewDescriptions = [
    "Seseorang tidak dapat berpikir dengan baik, mencintai dengan baik, tidur nyenyak, jika seseorang tidak makan dengan baik.",
    "Salah satu hal terindah dalam hidup adalah cara kita harus secara teratur menghentikan apa pun yang sedang kita lakukan dan mencurahkan perhatian kita untuk makan.",
    "Makanan adalah segalanya bagi kita. Itu merupakan perpanjangan dari perasaan nasionalis, perasaan etnis, sejarah pribadi Anda, provinsi Anda, wilayah Anda, suku Anda, nenek Anda. Itu tidak dapat dipisahkan dari yang sejak awal.",
    "Saya bukan juru masak yang hebat, saya bukan seniman hebat, tapi saya suka seni, dan saya suka makanan, jadi saya adalah penjelajah yang sempurna.",
    "Sangat menyenangkan berkumpul dan makan enak setidaknya sekali sehari. Itulah kehidupan manusia - menikmati sesuatu.",
    "Makanan, pada akhirnya, dalam tradisi kita sendiri, adalah sesuatu yang suci. Ini bukan tentang nutrisi dan kalori. Ini tentang berbagi. Ini tentang kejujuran. Ini tentang identitas.",
  ];

  var userId = [
    "64248E31-FD26-794E-14AC-B2C9BA2AEDCC",
    "3B526B9E-6962-1136-5E55-242BB854EE55",
    "C81D7B48-B68B-045C-5162-226049A1C145",
    "29E2A575-F53E-2E22-7FDE-C3625B302B4A",
    "D2333756-A64F-9A8B-A22F-251329472E13",
    "E4C990C6-8F16-6C7A-4CE3-B483BAF02C52",
    "47A79205-2912-EE3E-603B-1A6159E485E9",
    "B48D665E-6491-5EF6-CD57-2E8299259655",
    "2774D054-F36A-72CB-1B4E-15F9CE62792E",
    "E5E410C9-65C4-C79D-9E36-DA6ADBEE8446",
    "ECEA878F-B879-5D24-4DD6-C654BE755CBE",
    "ECEF77D1-7BB1-31B7-7B6B-7F2D24A6B6DE",
    "ADE47EC8-F513-F94B-8E86-95DEB378CCE9",
    "E45BB927-7CF8-ACEB-DD2B-BFA3EEAC1CE1",
  ];

  try {
    let query = "";

    for (let i = 0; i < userId.length; i++) {
      query = `('${restaurantId}', '${userId[i]}','${
        reviewTitles[Math.floor(Math.random() * 5)]
      }', '${reviewDescriptions[Math.floor(Math.random() * 6)]}'), `;

      console.log(query);

      const INSERT_REVIEWS =
        `INSERT INTO reviews (restaurantId, userId, reviewTitle, reviewDescription) VALUES ` +
        query.slice(0, -2) +
        ";";

      console.log(INSERT_REVIEWS);
      const [REVIEWS] = await database.execute(INSERT_REVIEWS);
    }

    const response = new createResponse(
      httpStatus.OK,
      "Add restaurant success",
      "Your restaurant now can be seen by other users.",
      // newRestaurant,
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
