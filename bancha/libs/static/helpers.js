var helpers = {
  stripHtml: function (str) {
    return (str || '').replace(/<(?:.|\n)*?>/gm, '');
  },
  parametrize: function (str) {
    return (str || Date.now()).trim().replace(/[ \_]/g, '-').replace(/([^A-z0-9\-\.])/g, '').toLowerCase();
  },
  capitalize: function (str) {
    if (typeof str !== 'string') {
      return '';
    }

    return str.charAt(0).toUpperCase() + str.slice(1);
  },
  excerpt: function (str, length) {
    str = str || '';
    length = length || 160;

    str = helpers.stripHtml(str);

    if (str.length > length) {
      str = str.substr(0, length) + '&hellip;';
    }

    return str;
  }
};

module.exports = helpers;