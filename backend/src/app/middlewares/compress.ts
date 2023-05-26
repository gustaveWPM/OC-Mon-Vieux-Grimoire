import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { printError } from '../lib/debugger';

const QUALITY_RATIO: number = 90;
const MAX_WIDTH_PX: number = 750;
const MAX_HEIGHT_PX: number = 900;

export async function compressMiddleware(req: Request, _: Response, next: NextFunction) {
  if (!req.file || !req.file.filename) {
    next();
    return;
  }
  const file = req.file;
  let { filename } = file;

  const lastDotIndex = filename.lastIndexOf('.');
  filename = filename.slice(0, lastDotIndex) + '-sharp.webp';

  await sharp(file.path)
    .resize(MAX_WIDTH_PX, MAX_HEIGHT_PX, { fit: 'cover' })
    .webp({ quality: QUALITY_RATIO })
    .toFile(path.resolve(file.destination, filename));
  try {
    fs.unlinkSync(file.path);
  } catch (error) {
    printError(error);
  }
  req.file.filename = filename;
  next();
}

export default compressMiddleware;
