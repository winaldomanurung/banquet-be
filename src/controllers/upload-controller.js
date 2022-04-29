const database = require("../config").promise();
const databaseSync = require("../config");
const { uploader } = require("../helpers/uploader");
const fs = require("fs");

module.exports = {
  uploadFile: (req, res) => {
    try {
      let path = "/images";
      const upload = uploader(path, "IMG").fields([{ name: "file" }]);

      // Function untuk upload
      upload(req, res, (error) => {
        if (error) {
          console.log(error);
          res.status(500).send(error);
        }
        // Ini yang membawa file dari FE
        const { file } = req.files;

        // Membuat file path
        const filepath = file ? path + "/" + file[0].filename : null;

        // Untuk parse data body
        let data = JSON.parse(req.body.data);
        data.image = filepath;

        let INSERT_IMAGE = `INSERT INTO albums (image) values (${databaseSync.escape(
          filepath
        )})`;
        databaseSync.query(INSERT_IMAGE, (err, results) => {
          if (err) {
            console.log(err);
            fs.unlinkSync("./public" + filepath);
            res.status(500).send(err);
          }
          res.status(200).send({ message: "Upload file success!" });
        });
      });
    } catch (error) {
      console.log(error);
      res.status(500).send(error);
    }
  },
  getAlbum: async (req, res) => {
    try {
      const GET_ALBUM = `SELECT * FROM albums;`;
      const [ALBUM] = await database.execute(GET_ALBUM);

      res.status(200).send({
        data: ALBUM,
        message: "OK",
      });
    } catch (error) {
      res.status(404).send("Tidak ada isi");
    }
  },
};
