import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import { IExtendedReq } from '../interfaces/IExtendedReq';
import { validator as YearValidator, message as YearValidatorMsg } from '../lib/YearValidator';
import Book, { BookDocument } from '../models/Book';

const IMAGES_FOLDER_NAME: string = 'images';
const IMAGES_FOLDER_NEEDLE: string = `/${IMAGES_FOLDER_NAME}/`;

namespace Helpers {
  export const getFilenameFromImageUrl = (imageUrl: string): string => imageUrl.split(IMAGES_FOLDER_NEEDLE)[1];
  export function castBookYear(bookObj: BookDocument) {
    if (typeof bookObj.year === 'string') {
      bookObj.year = parseInt(bookObj.year);
    }
  }

  export const unlinkSyncFromImageUrl = (imageUrl: string) => fs.unlinkSync(`${IMAGES_FOLDER_NAME}/${Helpers.getFilenameFromImageUrl(imageUrl)}`);

  export function computeAndInjectAverageRating(book: BookDocument) {
    const ratings = book.ratings;
    const q = ratings.length;
    if (q === 1) {
      book.averageRating = ratings[0].grade;
    }
    const sum = ratings.reduce((currentSum, currentUplet) => {
      return currentSum + currentUplet.grade;
    }, 0);
    const computedAverageRating = sum / q;
    book.averageRating = computedAverageRating;
  }
}

export async function getBooks(_: Request, res: Response): Promise<void> {
  try {
    const books: BookDocument[] = await Book.find();
    const booksArray = books.map((book: BookDocument) => book.toObject());
    res.status(StatusCodes.OK).json(booksArray);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error });
  }
}

export async function getBookById(req: Request, res: Response): Promise<void> {
  try {
    const book: BookDocument | null = await Book.findOne({ _id: req.params.id });
    if (book) {
      res.status(StatusCodes.OK).json(book);
    } else {
      res.status(StatusCodes.NOT_FOUND).json({ error: 'Not found' });
    }
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error });
  }
}

export async function createBook(req: Request, res: Response, next: NextFunction) {
  const bookObj: BookDocument = JSON.parse(req.body.book);
  delete bookObj._id;

  Helpers.castBookYear(bookObj);
  const book = new Book({
    ...bookObj,
    userId: (req as IExtendedReq).auth.userId,
    imageUrl: `${req.protocol}://${req.get('host')}${IMAGES_FOLDER_NEEDLE}${req.file!.filename}`
  });
  Helpers.computeAndInjectAverageRating(book);

  try {
    await book.save();
    res.status(StatusCodes.CREATED).json({ message: 'Livre enregistré' });
    next();
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error });
  }
}

export async function updateBook(req: Request, res: Response, next: NextFunction) {
  const newFile = req.file;
  const bookObj = newFile
    ? {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${newFile.filename}`
      }
    : { ...req.body };

  delete bookObj.userId;
  try {
    const oldBook = await Book.findOne({ _id: req.params.id });
    if (!oldBook || oldBook.userId !== (req as IExtendedReq).auth.userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }

    if (!YearValidator(bookObj.year)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: YearValidatorMsg });
    }

    Helpers.castBookYear(bookObj);
    await Book.updateOne({ _id: req.params.id }, { ...bookObj, _id: req.params.id });
    if (newFile) {
      Helpers.unlinkSyncFromImageUrl(oldBook.imageUrl);
    }
    res.status(StatusCodes.OK).json({ message: 'Livre modifié !' });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error });
  }
}

export async function deleteBookById(req: Request, res: Response) {
  try {
    const book: BookDocument | null = await Book.findOne({ _id: req.params.id });
    if (!book) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Erreur inconnue' });
    }
    if (book.userId !== (req as IExtendedReq).auth.userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Erreur inconnue' });
    }
    Helpers.unlinkSyncFromImageUrl(book.imageUrl);
    await Book.deleteOne({ _id: req.params.id });
    res.status(StatusCodes.OK).json({ message: 'Objet supprimé' });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error });
  }
}

export async function getBestRatings() {}
