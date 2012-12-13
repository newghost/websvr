/*
* Utility
*/
var _ = {
  //extend object to target
  extend: function(tar, obj) {
    if (!obj) return;

    for (var key in obj) {
      tar[key] = obj[key];
    }

    return tar;
  }
};