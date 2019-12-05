#!/usr/bin/env node
"use strict";

var _commander = _interopRequireDefault(require("commander"));

var _glob = _interopRequireDefault(require("glob"));

var _globParent = _interopRequireDefault(require("glob-parent"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _sharp = _interopRequireDefault(require("sharp"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var program = new _commander["default"].Command();
var srcGlob, outputPath, percentToReduce, maxSize;
var processingFile;
var outputFile;
program.arguments('<src> <output> [percent] [maxSize]').action(function (src, output) {
  var percent = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 20;

  var _maxSize = arguments.length > 3 ? arguments[3] : undefined;

  srcGlob = src;
  outputPath = output;
  var percentNumber = Number(percent);
  percentToReduce = percentNumber >= 1 ? percentNumber : percentNumber * 100;

  if (percentToReduce < 0 || percentToReduce > 100) {
    percentToReduce = 20;
  }

  percentToReduce = percentToReduce / 100;
  maxSize = _maxSize != null ? Number(_maxSize) : null;
});
program.parse(process.argv);

function exitError(message) {
  var code = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  console.error(message);
  process.exit(1);
}

if (srcGlob == null || outputPath == null) {
  exitError('Missing argument!');
}

try {
  //If we cant stat it, it might not exist, try globbing
  var srcStat = _fs["default"].lstatSync(srcGlob);

  if (srcStat.isDirectory()) {
    //Normalise the glob
    srcGlob = _path["default"].resolve(srcGlob) + "\\**\\*.{png,jpg,jpeg,gif,webp}";
    processingFile = false;
  } else if (srcStat.isFile()) {
    processingFile = true;
  } //If we cant stat it, it might not exist, try globbing


  var outputStat = _fs["default"].lstatSync(outputPath);

  if (outputStat.isDirectory()) {
    //Normalise the path
    outputPath = _path["default"].resolve(outputStat);
    outputFile = false;
  } else if (srcStat.isFile()) {
    outputFile = true;
  }
} catch (e) {}

if (!processingFile && outputFile) {
  exitError('Output must be a directory, not a file path, if specifying a directory as the src');
}

var srcGlobParent = (0, _globParent["default"])(srcGlob);
console.log("Processing ".concat(processingFile ? 'File' : 'Directory', ": ").concat(srcGlobParent));

function createDirIfNotExist(to) {
  var dirs = [];

  var dir = _path["default"].dirname(to);

  while (dir !== _path["default"].dirname(dir)) {
    dirs.unshift(dir);
    dir = _path["default"].dirname(dir);
  }

  dirs.forEach(function (dir) {
    if (!_fs["default"].existsSync(dir)) {
      _fs["default"].mkdirSync(dir);
    }
  });
}

;
(0, _glob["default"])(srcGlob, function (er, files) {
  if (er != null) {
    throw er;
  }

  var count = 0;
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    var _loop = function _loop() {
      var filePath = _step.value;
      var fileSubPathToOutput = filePath.replace(srcGlobParent, '');

      var fileOutputPath = _path["default"].resolve(outputFile ? outputPath : outputPath + fileSubPathToOutput);

      createDirIfNotExist(fileOutputPath);
      var sFile = (0, _sharp["default"])(filePath);
      sFile.metadata(function (err, meta) {
        //Always resize the largest value
        var resizeWidth = true;
        var size = meta.width;

        if (meta.width < meta.height) {
          resizeWidth = false;
          size = meta.height;
        }

        var newSize = Math.round(size * percentToReduce);

        if (maxSize != null && newSize > maxSize) {
          newSize = maxSize;
        }

        if (newSize < 1) {
          newSize = 1;
        }

        sFile.resize(resizeWidth ? newSize : null, resizeWidth ? null : newSize).toFile(fileOutputPath, function (err, info) {
          if (err != null) {
            exitError(err);
          }

          console.log("Resized from ".concat(size, " to ").concat(newSize));
          console.log("".concat(filePath, " -> ").concat(fileOutputPath));
        });
      });
      count++;
    };

    for (var _iterator = files[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      _loop();
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator["return"] != null) {
        _iterator["return"]();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  console.log("Processed ".concat(count, " files"));
});