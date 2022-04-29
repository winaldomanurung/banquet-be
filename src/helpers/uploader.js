const multer = require("multer");
const fs = require("fs");

module.exports = {
  uploader: (directory, fileNamePrefix) => {
    // Lokasi penyimpanan file
    let defaultDir = "./public";

    // diskStorage digunakan untuk menyimpan file dari FE ke directory BE
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const pathDir = defaultDir + directory;

        // Pengecekan apakah direktori existing
        if (fs.existsSync(pathDir)) {
          console.log("Directory ada");
          cb(null, pathDir);
        } else {
          // Jika ga ada maka buat direktori baru
          fs.mkdir(pathDir, { recursive: true }, (err) => cb(err, pathDir));
        }
      },
      filename: (req, file, cb) => {
        // Kita pisahkan dengan extensionnya
        let ext = file.originalname.split(".");
        // Membuat filename baru
        let filename = fileNamePrefix + Date.now() + "." + ext[ext.length - 1];
        cb(null, filename);
      },
    });

    // Buat function filter jenis file
    const fileFilter = (req, file, cb) => {
      // Extension yang bisa digunakan
      const ext = /\.(jpg|jpeg|png|gif|JPG|PNG|JPEG|GIF)/;
      // Jika file type tidak sesuai
      if (!file.originalname.match(ext)) {
        return cb(new Error("Your file type are denied"), false);
      }
      cb(null, true);
    };

    return multer({ storage, fileFilter });
  },
};
