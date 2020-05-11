const functions = require("firebase-functions")
const os = require("os")
const path = require("path")
const cors = require("cors")({ origin: true })
const Busboy = require("busboy")
const fs = require("fs")
const UUID = require("uuid-v4")

const { Storage } = require("@google-cloud/storage")
const projectId = "news-26417"
const keyFilename = "news-26417-firebase-adminsdk-2i8qf-fb9cd77194.json"
let gcs = new Storage({
  projectId,
  keyFilename,
})

exports.uploadFile = functions.https.onRequest((req, res) => {
  let uuid = UUID()

  cors(req, res, () => {
    if (req.method !== "POST") {
      return res.status(500).json({
        message: "Not allowed",
      })
    }
    const busboy = new Busboy({ headers: req.headers })
    let uploadData = null

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      const filepath = path.join(os.tmpdir(), filename)
      uploadData = { file: filepath, type: mimetype }
      file.pipe(fs.createWriteStream(filepath))
    })

    busboy.on("finish", () => {
      const bucket = gcs.bucket("news-26417.appspot.com/")

      bucket
        .upload(uploadData.file, {
          uploadType: "media",
          metadata: {
            metadata: {
              contentType: uploadData.type,
              firebaseStorageDownloadTokens: uuid,
            },
          },
        })
        .then((data) => {
          let file = data[0]
          res.status(200).json({
            fileUrl:
              "https://firebasestorage.googleapis.com/v0/b/" +
              bucket.name +
              "/o/" +
              encodeURIComponent(file.name) +
              "?alt=media&token=" +
              uuid,
          })
        })
        .catch((err) => {
          res.status(500).json({
            error: err,
          })
        })
    })
    busboy.end(req.rawBody)
  })
})
