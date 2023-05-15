import { Request } from 'express';
import mime from 'mime-types';
import multer, { FileFilterCallback } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { validator as YearValidator } from '../lib/YearValidator';
import { BookDocument } from '../models/Book';

function multiformValidation(req: Request, file: Express.Multer.File) {
  const bookObj: BookDocument = JSON.parse(req.body.book);
  const isValid = YearValidator(bookObj.year) && file.mimetype;

  return isValid;
}

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, callback: (error: Error | null, destination: string) => void) => {
    let error = null;
    if (!multiformValidation(req, file)) {
      error = new Error('Le contenu du formulaire est incorrect.');
    }
    callback(error, 'images');
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

export const formValidatorAndFileUploadMiddleware = multer({ storage, fileFilter }).single('image');
export default formValidatorAndFileUploadMiddleware;
