(function() {
  // Private array of chars to use
  var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

  Math.uuid = function (len, radix) {
    var chars = CHARS, uuid = [], i;
    radix = radix || chars.length;

    if (len) {
      // Compact form
      for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
    } else {
      // rfc4122, version 4 form
      var r;

      // rfc4122 requires these characters
      uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
      uuid[14] = '4';

      // Fill in random data.  At i==19 set the high bits of clock sequence as
      // per rfc4122, sec. 4.1.5
      for (i = 0; i < 36; i++) {
        if (!uuid[i]) {
          r = 0 | Math.random()*16;
          uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
        }
      }
    }

    return uuid.join('');
  };

  // A more performant, but slightly bulkier, RFC4122v4 solution.  We boost performance
  // by minimizing calls to random()
  Math.uuidFast = function() {
    var chars = CHARS, uuid = new Array(36), rnd=0, r;
    for (var i = 0; i < 36; i++) {
      if (i==8 || i==13 ||  i==18 || i==23) {
        uuid[i] = '-';
      } else if (i==14) {
        uuid[i] = '4';
      } else {
        if (rnd <= 0x02) rnd = 0x2000000 + (Math.random()*0x1000000)|0;
        r = rnd & 0xf;
        rnd = rnd >> 4;
        uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
      }
    }
    return uuid.join('');
  };

  // A more compact, but less performant, RFC4122v4 solution:
  Math.uuidCompact = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  };
})();

/*
* UUID-js: A js library to generate and parse UUIDs, TimeUUIDs and generate
* TimeUUID based on dates for range selections.
* @see http://www.ietf.org/rfc/rfc4122.txt
**/

function UUIDjs() {
};

UUIDjs.maxFromBits = function(bits) {
  return Math.pow(2, bits);
};

UUIDjs.limitUI04 = UUIDjs.maxFromBits(4);
UUIDjs.limitUI06 = UUIDjs.maxFromBits(6);
UUIDjs.limitUI08 = UUIDjs.maxFromBits(8);
UUIDjs.limitUI12 = UUIDjs.maxFromBits(12);
UUIDjs.limitUI14 = UUIDjs.maxFromBits(14);
UUIDjs.limitUI16 = UUIDjs.maxFromBits(16);
UUIDjs.limitUI32 = UUIDjs.maxFromBits(32);
UUIDjs.limitUI40 = UUIDjs.maxFromBits(40);
UUIDjs.limitUI48 = UUIDjs.maxFromBits(48);

UUIDjs.randomUI04 = function() {
  return Math.round(Math.random() * UUIDjs.limitUI04);
};
UUIDjs.randomUI06 = function() {
  return Math.round(Math.random() * UUIDjs.limitUI06);
};
UUIDjs.randomUI08 = function() {
  return Math.round(Math.random() * UUIDjs.limitUI08);
};
UUIDjs.randomUI12 = function() {
  return Math.round(Math.random() * UUIDjs.limitUI12);
};
UUIDjs.randomUI14 = function() {
  return Math.round(Math.random() * UUIDjs.limitUI14);
};
UUIDjs.randomUI16 = function() {
  return Math.round(Math.random() * UUIDjs.limitUI16);
};
UUIDjs.randomUI32 = function() {
  return Math.round(Math.random() * UUIDjs.limitUI32);
};
UUIDjs.randomUI40 = function() {
  return (0 | Math.random() * (1 << 30)) + (0 | Math.random() * (1 << 40 - 30)) * (1 << 30);
};
UUIDjs.randomUI48 = function() {
  return (0 | Math.random() * (1 << 30)) + (0 | Math.random() * (1 << 48 - 30)) * (1 << 30);
};

UUIDjs.paddedString = function(string, length, z) {
  string = String(string);
  z = (!z) ? '0' : z;
  var i = length - string.length;
  for (; i > 0; i >>>= 1, z += z) {
    if (i & 1) {
      string = z + string;
    }
  }
  return string;
};

UUIDjs.prototype.fromParts = function(timeLow, timeMid, timeHiAndVersion, clockSeqHiAndReserved, clockSeqLow, node) {
  this.version = (timeHiAndVersion >> 12) & 0xF;
  this.hex = UUIDjs.paddedString(timeLow.toString(16), 8)
             + '-'
             + UUIDjs.paddedString(timeMid.toString(16), 4)
             + '-'
             + UUIDjs.paddedString(timeHiAndVersion.toString(16), 4)
             + '-'
             + UUIDjs.paddedString(clockSeqHiAndReserved.toString(16), 2)
             + UUIDjs.paddedString(clockSeqLow.toString(16), 2)
             + '-'
             + UUIDjs.paddedString(node.toString(16), 12);
  return this;
};

UUIDjs.prototype.toString = function() {
  return this.hex;
};
UUIDjs.prototype.toURN = function() {
  return 'urn:uuid:' + this.hex;
};

UUIDjs.prototype.toBytes = function() {
  var parts = this.hex.split('-');
  var ints = [];
  var intPos = 0;
  for (var i = 0; i < parts.length; i++) {
    for (var j = 0; j < parts[i].length; j+=2) {
      ints[intPos++] = parseInt(parts[i].substr(j, 2), 16);
    }
  }
  return ints;
};

UUIDjs.prototype.equals = function(uuid) {
  if (!(uuid instanceof UUID)) {
    return false;
  }
  if (this.hex !== uuid.hex) {
    return false;
  }
  return true;
};

UUIDjs.getTimeFieldValues = function(time) {
  var ts = time - Date.UTC(1582, 9, 15);
  var hm = ((ts / 0x100000000) * 10000) & 0xFFFFFFF;
  return { low: ((ts & 0xFFFFFFF) * 10000) % 0x100000000,
            mid: hm & 0xFFFF, hi: hm >>> 16, timestamp: ts };
};

UUIDjs._create4 = function() {
  return new UUIDjs().fromParts(
    UUIDjs.randomUI32(),
    UUIDjs.randomUI16(),
    0x4000 | UUIDjs.randomUI12(),
    0x80 | UUIDjs.randomUI06(),
    UUIDjs.randomUI08(),
    UUIDjs.randomUI48()
  );
};

UUIDjs._create1 = function() {
  var now = new Date().getTime();
  var sequence = UUIDjs.randomUI14();
  var node = (UUIDjs.randomUI08() | 1) * 0x10000000000 + UUIDjs.randomUI40();
  var tick = UUIDjs.randomUI04();
  var timestamp = 0;
  var timestampRatio = 1/4;

  if (now != timestamp) {
    if (now < timestamp) {
      sequence++;
    }
    timestamp = now;
    tick = UUIDjs.randomUI04();
  } else if (Math.random() < timestampRatio && tick < 9984) {
    tick += 1 + UUIDjs.randomUI04();
  } else {
    sequence++;
  }

  var tf = UUIDjs.getTimeFieldValues(timestamp);
  var tl = tf.low + tick;
  var thav = (tf.hi & 0xFFF) | 0x1000;

  sequence &= 0x3FFF;
  var cshar = (sequence >>> 8) | 0x80;
  var csl = sequence & 0xFF;

  return new UUIDjs().fromParts(tl, tf.mid, thav, cshar, csl, node);
};

UUIDjs.create = function(version) {
  version = version || 4;
  return this['_create' + version]();
};

UUIDjs.fromTime = function(time, last) {
  last = (!last) ? false : last;
  var tf = UUIDjs.getTimeFieldValues(time);
  var tl = tf.low;
  var thav = (tf.hi & 0xFFF) | 0x1000; // set version '0001'
  if (last === false) {
    return new UUIDjs().fromParts(tl, tf.mid, thav, 0, 0, 0);
  } else {
    return new UUIDjs().fromParts(tl, tf.mid, thav, 0x80 | UUIDjs.limitUI06, UUIDjs.limitUI08 - 1, UUIDjs.limitUI48 - 1);
  }
};

UUIDjs.firstFromTime = function(time) {
  return UUIDjs.fromTime(time, false);
};
UUIDjs.lastFromTime = function(time) {
  return UUIDjs.fromTime(time, true);
};

UUIDjs.fromURN = function(strId) {
  var r, p = /^(?:urn:uuid:|\{)?([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{2})([0-9a-f]{2})-([0-9a-f]{12})(?:\})?$/i;
  if ((r = p.exec(strId))) {
    return new UUIDjs().fromParts(parseInt(r[1], 16), parseInt(r[2], 16),
                            parseInt(r[3], 16), parseInt(r[4], 16),
                            parseInt(r[5], 16), parseInt(r[6], 16));
  }
  return null;
};

UUIDjs.fromBytes = function(ints) {
  if (ints.length < 5) {
    return null;
  }
  var str = '';
  var pos = 0;
  var parts = [4, 2, 2, 2, 6];
  for (var i = 0; i < parts.length; i++) {
    for (var j = 0; j < parts[i]; j++) {
      var octet = ints[pos++].toString(16);
      if (octet.length == 1) {
        octet = '0' + octet;
      }
      str += octet;
    }
    if (parts[i] !== 6) {
      str += '-';
    }
  }
  return UUIDjs.fromURN(str);
};

UUIDjs.fromBinary = function(binary) {
  var ints = [];
  for (var i = 0; i < binary.length; i++) {
    ints[i] = binary.charCodeAt(i);
    if (ints[i] > 255 || ints[i] < 0) {
      throw new Error('Unexpected byte in binary data.');
    }
  }
  return UUIDjs.fromBytes(ints);
};

// Aliases to support legacy code. Do not use these when writing new code as
// they may be removed in future versions!
UUIDjs.new = function() {
  return this.create(4);
};
UUIDjs.newTS = function() {
  return this.create(1);
};

module.exports = UUIDjs;

var test = function(msg, func) {
  var t1 = new Date();

  for (var i = 0; i < 1000000; i++) {
    func();
  }

  var t2 = new Date();

  console.log("time used:" , t2 - t1, ", ", msg);
};

//Conver to array will make it slower;
var CHARS     = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var CHARSArr  = CHARS.split('');

var SCHARS    = "0123456789ABCDEF";
var SCHARSArr = SCHARS.split('');

console.log("Testing long chars:");

test("Math.uuid(32)", function() {
  Math.uuid(32);
});

test("Math.uuidFast", function() {
  Math.uuidFast();
});

test("UUIDjs.create", function() {
  UUIDjs.create();
});

var createUUID = function() {
  var create = function() {
    return (Math.random() * 0x10000 | 0).toString(16);
  };

  var uuid = new Array(8);
  for (var i = 0; i < 8; i++) {
    uuid[i] = (Math.random() * 0x10000 | 0).toString(16);
  }
};

test("createUUID", function() {
  createUUID();
});

test("UUID fixed array", function() {
  //Using fixed size array will be more faster than "new Array()"
  var uuid = new Array(32);
  for (var i = 0; i < 32; i++) {
    uuid[i] = CHARS[0 | Math.random() * 36];
  }
  uuid = uuid.join();
});

test("UUID string plus", function() {
  var uuid = "";
  for (var i = 0; i < 32; i++) {
    uuid += CHARS[0 | Math.random() * 36];
  }
});

test("UUIDArr string plus", function() {
  var uuid = "";
  for (var i = 0; i < 32; i++) {
    uuid += CHARSArr[0 | Math.random() * 36];
  }
});

test("UUIDArr fixed array", function() {
  //Using fixed size array will be more faster than "new Array()"
  var uuid = new Array(32);
  for (var i = 0; i < 32; i++) {
    uuid[i] = CHARSArr[0 | Math.random() * 36];
  }
  uuid = uuid.join();
});

console.log("\r\n\r\nTesting short chars:");

test("UUID fixed array", function() {
  //Using fixed size array will be more faster than "new Array()"
  var uuid = new Array(32);
  for (var i = 0; i < 32; i++) {
    uuid[i] = SCHARS[0 | Math.random() * 16];
  }
  uuid = uuid.join();
});

test("UUID string plus", function() {
  var uuid = "";
  for (var i = 0; i < 32; i++) {
    uuid += SCHARS[0 | Math.random() * 16];
  }
});

test("UUIDArr string plus", function() {
  var uuid = "";
  for (var i = 0; i < 32; i++) {
    uuid += SCHARSArr[0 | Math.random() * 16];
  }
});

test("UUIDArr fixed array", function() {
  //Using fixed size array will be more faster than "new Array()"
  var uuid = new Array(32);
  for (var i = 0; i < 32; i++) {
    uuid[i] = SCHARSArr[0 | Math.random() * 16];
  }
  uuid = uuid.join();
});

//interval is 4 hours
test("UUIDArr fixed array final", function() {  
  var suuid = (+new Date()) / 14400000;

  var uuid = new Array(32);
  for (var i = 0; i < 32; i++) {
    uuid[i] = SCHARSArr[0 | Math.random() * 16];
  }

  suuid += "-" + uuid.join('');
});

test("Custom session id, with full Date", function() {
  var uuid 
    = (+new Date())                        //Time stamp, change interval is 0.583 hours, higher 11 bits will be kept
    + '-'
    + ((Math.random() * 0x40000000 | 0))   //Random 1: Used for distinguish the session
    + ((Math.random() * 0x40000000 | 0));  //Random 2: Used for distinguish the session

  uuid  += '0000000000'.substr(0, 25 - uuid.length);
});

test("Custom session id, with short Date", function() {
  var uuid 
    = ((+new Date()) / 60000 | 0)          //Time stamp, change interval is 0.583 hours, higher 11 bits will be kept
    + '-'
    + ((Math.random() * 0x40000000 | 0))   //Random 1: Used for distinguish the session
    + ((Math.random() * 0x40000000 | 0));  //Random 2: Used for distinguish the session

  uuid  += '0000000000'.substr(0, 25 - uuid.length);
});