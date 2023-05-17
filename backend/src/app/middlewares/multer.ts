import { Request } from 'express';
import mime from 'mime-types';
import multer, { FileFilterCallback } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import ServerConfig from '../../config/ServerConfig';
import bookStaticFieldsValidator from '../lib/bookStaticFieldsValidator';
import { BookDocument } from '../models/Book';

function bookStaticFieldsValidation(req: Request, file: Express.Multer.File): Error | null {
  if (!file || !file.mimetype) {
    return new Error('Impossible de déterminer le mimetype du fichier lors de la validation du formulaire.');
  }

  const bookObj: BookDocument = JSON.parse(req.body.book);
  const bookStaticFieldsValidationError = bookStaticFieldsValidator(bookObj);
  if (bookStaticFieldsValidationError) {
    return bookStaticFieldsValidationError;
  }
  return null;
}

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, callback: (error: Error | null, destination: string) => void) => {
    const error: Error | null = bookStaticFieldsValidation(req, file);
    const { IMAGES_FOLDER } = ServerConfig;
    callback(error, IMAGES_FOLDER);
  },

  filename: (_: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
    const extension = mime.extension(file.mimetype);
    const timestamp = Date.now();
    const uniqueId = uuidv4();
    const randomNumber = Math.floor(Math.random() * 9999999) + 1;
    const filename = `${timestamp}-${uniqueId}-${randomNumber}.${extension}`;

    callback(null, filename);
  }
});

function fileFilter(_: Request, file: Express.Multer.File, callback: FileFilterCallback) {
  if (file.mimetype.startsWith('image/')) {
    callback(null, true);
  } else {
    callback(new Error('Le fichier doit être une image.'));
  }
}

export const bookFormMiddleware = multer({ storage, fileFilter }).single('image');
export default bookFormMiddleware;
