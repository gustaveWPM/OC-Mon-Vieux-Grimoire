import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const QUALITY_RATIO: number = 80;
const MAX_WIDTH_PX: number = 500;

export async function compressMiddleware(req: Request, _: Response, next: NextFunction) {
  const file = req.file!;
  let { filename } = file;

  const lastDotIndex = filename.lastIndexOf('.');
  filename = filename.slice(0, lastDotIndex) + '-sharp.webp';

  await sharp(file.path).resize(MAX_WIDTH_PX).webp({ quality: QUALITY_RATIO }).toFile(path.resolve(file.destination, filename));
  fs.unlinkSync(file.path);
  req.file!.filename = filename;
  next();
}

export default compressMiddleware;
