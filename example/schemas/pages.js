module.exports = function Pages (opts) {
  return {
    "name": "page",
    "collectionName": "pages",
    "url": "pages",
    "fields": [
      {
        "name": "title",
        "type": "text",
        "description": "Title"
      },
      {
        "name": "slug",
        "type": "text",
        "description": "Address (URL)"
      },
      {
        "name": "meta_keywords",
        "type": "text",
        "description": "Meta Keywords"
      },
      {
        "name": "meta_description",
        "type": "text",
        "description": "Meta Description"
      },
      {
        "name": "content",
        "type": "textarea",
        "description": "Content"
      }
    ],
    "hooks": {
      "beforeUpdate": function (record) {
        if (!record.meta_description) {
          record.meta_description = helpers.excerpt(record.content);
        }
      }
    }
  };
};