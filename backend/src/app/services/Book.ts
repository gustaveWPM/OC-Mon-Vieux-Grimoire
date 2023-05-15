import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import ServerConfig from '../../config/ServerConfig';
import AuthReq from '../interfaces/AuthReq';
import bookStaticFieldsValidator from '../lib/BookStaticFieldsValidator';
import getSlashEnvelope from '../lib/GetSlashEnvelope';
import Book, { BookDocument, IRating } from '../models/Book';

const { IMAGES_FOLDER } = ServerConfig;
const IMAGES_FOLDER_NEEDLE: string = getSlashEnvelope(IMAGES_FOLDER);

namespace Helpers {
  export const getFilenameFromImageUrl = (imageUrl: string): string => imageUrl.split(IMAGES_FOLDER_NEEDLE)[1];
  export function castBookYear(bookObj: BookDocument) {
    if (typeof bookObj.year === 'string') {
      bookObj.year = parseInt(bookObj.year);
    }
  }

  export const unlinkSyncFromImageUrl = (imageUrl: string) => fs.unlinkSync(`${IMAGES_FOLDER}/${Helpers.getFilenameFromImageUrl(imageUrl)}`);

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

  if (!req.file) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Vous avez essayé d'ajouter un livre sans joindre de fichier" });
  }

  Helpers.castBookYear(bookObj);
  const book = new Book({
    ...bookObj,
    userId: (req as AuthReq).auth.userId,
    imageUrl: `${req.protocol}://${req.get('host')}${IMAGES_FOLDER_NEEDLE}${req.file.filename}`
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
        imageUrl: `${req.protocol}://${req.get('host')}${IMAGES_FOLDER_NEEDLE}${newFile.filename}`
      }
    : { ...req.body };

  const bookStaticFieldsValidationError = bookStaticFieldsValidator(bookObj);
  if (bookStaticFieldsValidationError) {
    return res.status(StatusCodes.BAD_REQUEST).json({ bookStaticFieldsValidationError });
  }

  delete bookObj.userId;
  try {
    const oldBook = await Book.findOne({ _id: req.params.id });
    if (!oldBook || oldBook.userId !== (req as AuthReq).auth.userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
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
    const targetedBook: BookDocument | null = await Book.findOne({ _id: req.params.id });
    if (!targetedBook) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Erreur inconnue' });
    }
    if (targetedBook.userId !== (req as AuthReq).auth.userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Erreur inconnue' });
    }
    Helpers.unlinkSyncFromImageUrl(targetedBook.imageUrl);
    await Book.deleteOne({ _id: req.params.id });
    res.status(StatusCodes.OK).json({ message: 'Objet supprimé' });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error });
  }
}

export async function getBestBooks(_: Request, res: Response): Promise<void> {
  try {
    const topBooks: BookDocument[] = await Book.find({ averageRating: { $exists: true } })
      .sort({ averageRating: -1 })
      .limit(3);

    const booksArray = topBooks.map((topBook: BookDocument) => topBook.toObject());
    res.status(StatusCodes.OK).json(booksArray);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error });
  }
}

export async function setBookRate(req: Request, res: Response) {
  const targetedBook: BookDocument | null = await Book.findOne({ _id: req.params.id });
  const currentUserId = (req as AuthReq).auth.userId;
  const newRating = { userId: currentUserId, grade: req.body.rating };

  if (!targetedBook) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Erreur inconnue' });
  }

  const ratingsContainCurrentUserId = targetedBook.ratings.some(({ userId }) => userId === currentUserId);
  if (ratingsContainCurrentUserId) {
    return res.status(StatusCodes.NOT_MODIFIED).json(targetedBook);
  }

  targetedBook.ratings.push(newRating as IRating);
  Helpers.computeAndInjectAverageRating(targetedBook);

  try {
    await Book.updateOne({ _id: targetedBook._id }, { ...targetedBook.toObject() });
    await getBookById(req, res);
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error });
  }
}
