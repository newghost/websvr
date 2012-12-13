var test = function(msg, func, repeat) {
  var t1 = new Date();

  repeat = repeat || 1000000;

  for (var i = 0; i < repeat; i++) {
    func();
  }

  var t2 = new Date();

  console.log("time used:" , t2 - t1, ", ", msg);
};

var extend = function(tar, obj) {
  if (!obj) return;

  for (var key in obj) {
    tar[key] = obj[key];
  }

  return tar;
};

var _ = require("./lib/underscore");

//test method
test("Extend by _.extend:", function() {
  var tar = {
    a: 1, b: "2", c: "3",
    e: { i: "5", j: "6" },
    f: { x: {}, y: [] }
  };

  var obj = {
    b: 123,
    f: { x: [1]}
  };

  _.extend(tar, obj);
  //console.log(tar, obj);
});

test("Extend by simple func:", function() {
  var tar = {
    a: 1, b: "2", c: "3",
    e: { i: "5", j: "6" },
    f: { x: {}, y: [] }
  };

  var obj = {
    b: 123,
    f: { x: [1]}
  };

  extend(tar, obj);
  //console.log(tar, obj);
});