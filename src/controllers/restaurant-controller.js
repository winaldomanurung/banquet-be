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
    location,
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
  console.log(body);
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
        "Delete restaurant failed",
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
        "Restaurant is not registered"
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

module.exports.seedingRestaurants = async (req, res) => {
  let batch = req.body.batch;
  var restaurantName = [
    "Rumah Makan Eco",
    "Elegy Resto ",
    "Foodie Resto ",
    "Madinah Resto",
    "Rumah Makan Toyyibah",
    "Bismillah Resto",
    "Kedai Nenek",
    "Dapur Nenek",
    "Tempo Doeloe Resto",
    "Angkringan Si Mbah",
    "Haengbok ",
    "Kim Resto ",
    "Dalkom Resto",
    "Kedai Nippon",
    "Umai Resto",
    "Sara Cafe ",
    "Waroeng Noesantara",
    "Rumah Masakan Nenek",
    "Rumah Makan Mbah Jono",
    "Depot Jowo",
    "Sego Pecel Pak Dirgo",
    "Depot Cak Brewok",
    "Warung Ratu Ayu",
    "Warung Enak Tenan",
    "Rumah Makan Aseli Indonesia",
    "Warung Pojok Sudiro Husodo",
    "Warung Penuh Barokah",
    "Rumah Makan Ahmad",
    "Rumah Makan Aisyah",
    "Dapur Coklat",
  ];

  var restaurantLocation = [
    "Jakarta Timur",
    "Surabaya",
    "Bekasi",
    "Bandung",
    "Medan",
    "Jakarta Barat",
    "Jakarta Selatan",
    "Depok",
    "Tangerang",
    "Jakarta Utara",
    "Palembang",
    "Semarang",
    "Makassar",
    "Tangerang Selatan",
    "Batam",
    "Bandar Lampung",
    "Jakarta Pusat",
    "Bogor",
    "Pekanbaru",
    "Padang",
    "Malang",
    "Samarinda",
    "Denpasar",
    "Tasikmalaya",
    "Serang",
    "Balikpapan",
    "Pontianak",
    "Banjarmasin",
    "Jambi",
    "Cimahi",
  ];

  let type = [
    "Fine Dining",
    "Family Restaurant",
    "Traditional Food",
    "Fast Food",
    "Cafe",
    "Buffet",
    "Food Trucks/Stands",
  ];

  let description = [
    "Indonesian cuisine often demonstrates complex flavour, acquired from certain ingredients and bumbu spices mixture. Indonesian dishes have rich flavours; most often described as savory, hot and spicy, and also combination of basic tastes such as sweet, salty, sour and bitter.",
    "Love, like a chicken salad or restaurant hash, must be taken with blind faith or it loses its flavor.",
    "A good restaurant is like a vacation; it transports you, and it becomes a lot more than just about the food.",
    "Going to a restaurant is one of my keenest pleasures. Meeting someplace with old and new friends, ordering wine, eating food, surrounded by strangers, I think is the core of what it means to live a civilised life.",
    "Im very low-key. I dont really blend in, so its difficult to go out in public. I like to do things that are kind of quiet, whether its a dinner at my house or a restaurant, or a movie night at home.",
    "One of my biggest pet peeves is when a guys wearing flip-flop sandals, which I dont understand. Mens feet are disgusting to begin with, but now theyre on display when I try to go out for a nice steak at a restaurant, and I have to sit there and look at some guys hoof? I dont get it. I dont understand it. Sebastian Maniscalco",
    "Thats been the secret to Gas Monkey: Move fast. I opened the first restaurant within a year and a half. Most people wait five years. I always move quickly, and in todays market, no matter what youre in, you can recover from a mistake faster than you can recover from not doing.",
    "Roblox is less a game than a 3-D social platform where you and your friends can pretend to be in different places. You can pretend to be in a fashion show or that youre trying to survive in a tornado or that you want to go work in a pizza restaurant, or that youre a bird and survive by catching insects.",
    "The first thing I do whenever I go to Thailand is seek out the closest restaurant or stall selling mango-and-sticky rice: its a little hillock of glutinous rice drenched in lashings of coconut milk and served with fresh mango.",
    "I have way more freedom in Los Angeles and in the U.S. But its funny because when I have a meeting with producers or people from the industry, we go to a restaurant to meet someone, and nobody knows me. But all of the sudden, the entire kitchen comes out, and they start taking pictures with me, or at valet parking.",
    "I opened Leiths in Notting Hill in 1969 and it eventually worked its way into being awarded a Michelin star. At the time, there were a few women running small bistros - but I was the first woman to have a serious, expensive restaurant.",
    "You go to a Japanese restaurant and have a wonderful dish, and the thing to do is take a picture with your phone, put it on Facebook, and see how many likes you get. If you dont share your experiences, they dont become part of the data processing system, and they have no meaning.",
    "I was at a restaurant in Glasgow, and I was walking down the stairs. A woman passed me and said, Oh my God, what are you doing here? I didnt know who she was, and I was like, Sorry? She goes, Oh no, sorry, I follow you on Twitter. I just didnt expect to see you here.",
    "I do get recognised, but if Im in a restaurant, Ill get one person noticing me, not the whole place. It is uncomfortable when people try and sneak a picture; sometimes, I dont feel like being seen. But I dont stop myself doing stuff. I go to Barrys Bootcamp and yoga just like anyone else.",
    "No one knows restaurants like a New Yorker - theyre incredibly discerning and restaurant savvy.",
    "I was working at Talesai, which is a Thai restaurant on Sunset. I actually worked there through selling my first script.",
  ];

  var userId = [
    "E48DEF4A-9965-744C-B644-5CD316CF2165",
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
    if (batch == 1) {
      for (let i = 0; i < userId.length; i++) {
        const geoData = await geocoder
          .forwardGeocode({
            query: restaurantLocation[i],
            limit: 1,
          })
          .send();
        let lat = geoData.body.features[0].geometry.coordinates[1];
        let long = geoData.body.features[0].geometry.coordinates[0];
        console.log(lat);
        console.log(long);

        query = `('${userId[i]}', '${restaurantName[i]}', '${
          restaurantLocation[i]
        }','${type[Math.floor(Math.random() * 7)]}', '${
          description[Math.floor(Math.random() * 16)]
        }', ${
          Math.floor(Math.random() * 101) * 1000
        },st_geomfromtext('POINT(${database.escape(lat)} ${database.escape(
          long
        )})')), `;

        console.log(query);

        const INSERT_RESTO =
          `INSERT INTO restaurants (userId, name, location, type, description, price, coordinate) VALUES ` +
          query.slice(0, -2) +
          ";";

        console.log(INSERT_RESTO);
        const [RESTO] = await database.execute(INSERT_RESTO);

        let restaurantId = RESTO.insertId;
        newRestaurant = RESTO;

        let INSERT_IMAGES = `INSERT INTO restaurant_images(restaurantId, imageUrl) VALUES (${restaurantId}, '/images/fake-restaurants/restaurant${
          i + 1
        }.png');`;
        console.log(INSERT_IMAGES);
        const [IMAGES] = await database.execute(INSERT_IMAGES);
      }
    } else if (batch == 2) {
      for (let i = 0; i < userId.length; i++) {
        const geoData = await geocoder
          .forwardGeocode({
            query: restaurantLocation[i + 15],
            limit: 1,
          })
          .send();
        let lat = geoData.body.features[0].geometry.coordinates[1];
        let long = geoData.body.features[0].geometry.coordinates[0];
        console.log(lat);
        console.log(long);

        query = `('${userId[i]}', '${restaurantName[i + 15]}', '${
          restaurantLocation[i + 15]
        }','${type[Math.floor(Math.random() * 7)]}', '$${
          description[Math.floor(Math.random() * 16)]
        }', ${
          Math.floor(Math.random() * 101) * 1000
        },st_geomfromtext('POINT(${database.escape(lat)} ${database.escape(
          long
        )})')), `;

        console.log(query);

        const INSERT_RESTO =
          `INSERT INTO restaurants (userId, name, location, type, description, price, coordinate) VALUES ` +
          query.slice(0, -2) +
          ";";

        console.log(INSERT_RESTO);
        const [RESTO] = await database.execute(INSERT_RESTO);

        let restaurantId = RESTO.insertId;
        newRestaurant = RESTO;

        let INSERT_IMAGES = `INSERT INTO restaurant_images(restaurantId, imageUrl) VALUES (${restaurantId}, '/images/fake-restaurants/restaurant${
          i + 1 + 15
        }.png');`;
        console.log(INSERT_IMAGES);
        const [IMAGES] = await database.execute(INSERT_IMAGES);
      }
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
