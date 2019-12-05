#!/usr/bin/env node

import commander from 'commander';
import glob from 'glob';
import globParent from 'glob-parent';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const program = new commander.Command();

let srcGlob, outputPath, percentToReduce, maxSize;
let processingFile;
let outputFile;

program
.arguments('<src> <output> [percent] [maxSize]')
.action((src, output, percent = 20, _maxSize) => {
    srcGlob = src;
    outputPath = output;
    let percentNumber = Number(percent);
    percentToReduce = percentNumber >= 1 ? percentNumber : percentNumber * 100;
    if(percentToReduce < 0 || percentToReduce > 100){
        percentToReduce = 20;
    }

    percentToReduce = percentToReduce/100;

    maxSize = _maxSize != null ? Number(_maxSize) : null;
})

program.parse(process.argv);

function exitError(message, code = 1){
    console.error(message);
    process.exit(1);
}

if (srcGlob == null || outputPath == null) {
    exitError('Missing argument!');
}

try{
    //If we cant stat it, it might not exist, try globbing
    let srcStat = fs.lstatSync(srcGlob);
    if(srcStat.isDirectory()){
        //Normalise the glob
        srcGlob = path.resolve(srcGlob) + "\\**\\*.png";
        processingFile = false;
    }else if(srcStat.isFile()){
        processingFile = true;
    }

    //If we cant stat it, it might not exist, try globbing
    let outputStat = fs.lstatSync(outputPath);
    if(outputStat.isDirectory()){
        //Normalise the path
        outputPath = path.resolve(outputStat);
        outputFile = false;
    }else if(srcStat.isFile()){
        outputFile = true;
    }
    
}catch(e){
}

if(!processingFile && outputFile){
    exitError('Output must be a directory, not a file path, if specifying a directory as the src');
}

let srcGlobParent = globParent(srcGlob);

console.log(`Processing ${processingFile ? 'File' : 'Directory'}: ${srcGlobParent}`);

function createDirIfNotExist(to){
    const dirs = [];
    let dir = path.dirname(to);

    while (dir !== path.dirname(dir)) {
        dirs.unshift(dir);
        dir = path.dirname(dir);
    }

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        }
    });
};
  

glob(srcGlob, (er, files) => {
    if(er != null){
        throw er;
    }

    let count = 0;

    for(let filePath of files){
        let fileSubPathToOutput = filePath.replace(srcGlobParent, '');
        let fileOutputPath = path.resolve(outputFile ? outputPath : outputPath + fileSubPathToOutput);

        createDirIfNotExist(fileOutputPath);

        let sFile = sharp(filePath);

        sFile.metadata((err, meta) => {
            //Always resize the largest value
            let resizeWidth = true;
            let size = meta.width;
            if(meta.width < meta.height){
                resizeWidth = false;
                size = meta.height;
            }
            let newSize = Math.round(size * percentToReduce);

            if(maxSize != null && newSize > maxSize){
                newSize = maxSize;
            }

            if(newSize < 1){
                newSize = 1;
            }

            sFile.resize(resizeWidth ? newSize : null, resizeWidth ? null : newSize)
            .toFile(fileOutputPath, (err, info) => {
                if(err != null){
                    exitError(err);
                }

                console.log(`Resized from ${size} to ${newSize}`);
                console.log(`${filePath} -> ${fileOutputPath}`);
            });
        })

        count++;
    }

    console.log(`Processed ${count} files`);
});