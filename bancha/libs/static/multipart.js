function multipart (req, res, next) {
  var fields;
  fields = {};

  req.busboy.on('field', function(key, value, keyTruncated, valueTruncated) {
    if (key.indexOf('[]') !== -1) {
      key = key.replace('[]', '');
      if (!fields[key]) {
        fields[key] = [];
      }

      return fields[key].push(value);
    }

    return fields[key] = value;
  });

  req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    if (filename && (mimetype !== 'image/jpeg' && mimetype !== 'image/png')) {
      return res.status(401).send({
        error: 'Attached file must be an image'
      });
    }

    file.fileRead = [];

    file.on('data', function(chunk) {
      return this.fileRead.push(chunk);
    });

    file.on('error', function(err) {
      return res.status(400).send({
        error: 'Error receiving the file'
      });
    });

    return file.on('end', function() {
      var fileData;
      if (!(fieldname && filename)) {
        return;
      }
      fileData = {
        fileName: filename,
        contents: Buffer.concat(this.fileRead),
        encoding: encoding,
        contentType: mimetype
      };
      if (fields[fieldname]) {
        fields[fieldname] = [fields[fieldname]];
        fields[fieldname].push(fileData);
      } else {
        fields[fieldname] = fileData;
      }
      return delete this.fileRead;
    });
  });

  req.busboy.on('finish', function() {
    req.body = fields;
    next();
  });

  return req.pipe(req.busboy);
}

module.exports = multipart;